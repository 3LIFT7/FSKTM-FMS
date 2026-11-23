const bcrypt = require('bcryptjs');
const { query, exec } = require('../config/db');

let migrationsCompleted = false;

/**
 * Centralized, idempotent database migration runner for existing & fresh installations.
 * Ensures all tables, columns, foreign keys, check constraints, and partial unique indexes
 * are consistent without destroying or overwriting existing user data.
 */
async function runMigrations() {
  if (migrationsCompleted) return;

  // 1. Add all evolved columns idempotently
  await exec(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT TRUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

    ALTER TABLE locations ADD COLUMN IF NOT EXISTS image_url TEXT;

    ALTER TABLE devices ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE devices ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
    ALTER TABLE devices ADD COLUMN IF NOT EXISTS accessories TEXT;

    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES users(user_id) ON DELETE SET NULL;
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS recurrence_group_id VARCHAR(100);
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS series_status VARCHAR(50) DEFAULT 'active';
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS course_id VARCHAR(50);
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS course_name VARCHAR(255);
    ALTER TABLE location_bookings ALTER COLUMN course_id DROP NOT NULL;
    ALTER TABLE location_bookings ALTER COLUMN course_name DROP NOT NULL;
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS lecturer_name VARCHAR(255);
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(50);
    ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS attendance_notes TEXT;

    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS lecturer_approver_id INT REFERENCES users(user_id) ON DELETE SET NULL;
    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS lecturer_approved_by INT REFERENCES users(user_id) ON DELETE SET NULL;
    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS pickup_location TEXT;
    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS selected_accessories TEXT;
    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS return_rating INT;
    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS return_condition VARCHAR(100);
    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS return_notes TEXT;
    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS device_rating INT;
    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS device_review TEXT;
    ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS rated_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE device_bookings DROP CONSTRAINT IF EXISTS device_bookings_status_check;
    ALTER TABLE device_bookings ADD CONSTRAINT device_bookings_status_check
      CHECK (status IN ('pending', 'pending_lecturer', 'pending_technician', 'approved', 'checked_out', 'returned', 'rejected'));

    ALTER TABLE issue_reports ALTER COLUMN reported_by DROP NOT NULL;
    ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255);
    ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
    ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
    ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS issue_reason TEXT;
    ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
    ALTER TABLE issue_reports DROP CONSTRAINT IF EXISTS issue_reports_status_check;
    ALTER TABLE issue_reports ADD CONSTRAINT issue_reports_status_check
      CHECK (status IN ('open', 'in_progress', 'resolved', 'cannot_be_resolved', 'requires_further_action', 'closed'));

    ALTER TABLE lab_usage_logs ADD COLUMN IF NOT EXISTS booking_id INT REFERENCES location_bookings(booking_id) ON DELETE CASCADE;
    ALTER TABLE lab_usage_logs ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE lab_usage_logs ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(50) DEFAULT 'on_time';
  `);

  // 2. Ensure room_feedback rating constraints exist on existing databases
  try {
    await exec(`
      UPDATE room_feedback SET cleanliness_rating = LEAST(5, GREATEST(1, COALESCE(cleanliness_rating, 5)));
      UPDATE room_feedback SET equipment_rating = LEAST(5, GREATEST(1, COALESCE(equipment_rating, 5)));
      UPDATE room_feedback SET ac_rating = LEAST(5, GREATEST(1, COALESCE(ac_rating, 5)));
      ALTER TABLE room_feedback DROP CONSTRAINT IF EXISTS chk_room_feedback_subratings;
      ALTER TABLE room_feedback ADD CONSTRAINT chk_room_feedback_subratings
        CHECK (
          cleanliness_rating BETWEEN 1 AND 5 AND
          equipment_rating BETWEEN 1 AND 5 AND
          ac_rating BETWEEN 1 AND 5
        );
    `);
  } catch (err) {
    console.warn('room_feedback constraint migration notice:', err.message);
  }

  // 3. Ensure location_bookings end_time > start_time constraint
  try {
    await exec(`
      UPDATE location_bookings
      SET end_time = start_time + INTERVAL '1 hour'
      WHERE end_time <= start_time;
      ALTER TABLE location_bookings DROP CONSTRAINT IF EXISTS chk_booking_time_order;
      ALTER TABLE location_bookings ADD CONSTRAINT chk_booking_time_order CHECK (end_time > start_time);
    `);
  } catch (err) {
    console.warn('location_bookings time constraint notice:', err.message);
  }

  // 4. Safely deduplicate any duplicate location codes before adding UNIQUE constraint on locations(code)
  try {
    const dupCodes = await query(`
      SELECT UPPER(code) AS ucode, MIN(location_id) AS keep_id
      FROM locations
      GROUP BY UPPER(code)
      HAVING COUNT(*) > 1
    `);
    for (const row of dupCodes.rows) {
      const others = await query(
        `SELECT location_id, code FROM locations WHERE UPPER(code) = $1 AND location_id != $2`,
        [row.ucode, row.keep_id]
      );
      for (const dup of others.rows) {
        await query(`UPDATE location_bookings SET location_id = $1 WHERE location_id = $2`, [row.keep_id, dup.location_id]);
        await query(`UPDATE devices SET location_id = $1 WHERE location_id = $2`, [row.keep_id, dup.location_id]);
        await query(`UPDATE issue_reports SET location_id = $1 WHERE location_id = $2`, [row.keep_id, dup.location_id]);
        await query(`UPDATE maintenance_logs SET location_id = $1 WHERE location_id = $2`, [row.keep_id, dup.location_id]);
        await query(`UPDATE room_feedback SET location_id = $1 WHERE location_id = $2`, [row.keep_id, dup.location_id]);
        await query(`UPDATE lab_usage_logs SET location_id = $1 WHERE location_id = $2`, [row.keep_id, dup.location_id]);
        await query(`DELETE FROM locations WHERE location_id = $1`, [dup.location_id]);
      }
    }
    await exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_unique_code ON locations (UPPER(code));`);
  } catch (err) {
    console.warn('locations unique code index notice:', err.message);
  }

  // 5. Prevent duplicate active device loans (approved or checked_out) per device while preserving full history
  try {
    const dupActiveLoans = await query(`
      SELECT device_id, MAX(loan_id) AS keep_loan_id
      FROM device_bookings
      WHERE status IN ('approved', 'checked_out')
      GROUP BY device_id
      HAVING COUNT(*) > 1
    `);
    for (const row of dupActiveLoans.rows) {
      await query(
        `UPDATE device_bookings
         SET status = 'returned', actual_return_time = COALESCE(actual_return_time, CURRENT_TIMESTAMP)
         WHERE device_id = $1
           AND status IN ('approved', 'checked_out')
           AND loan_id != $2`,
        [row.device_id, row.keep_loan_id]
      );
    }
    await exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_device_bookings_one_active_loan
      ON device_bookings (device_id)
      WHERE status IN ('approved', 'checked_out');
    `);
  } catch (err) {
    console.warn('device_bookings active loan unique index notice:', err.message);
  }

  // 6. Prevent duplicate attendance logs per booking_id
  try {
    await exec(`
      DELETE FROM lab_usage_logs a
      USING lab_usage_logs b
      WHERE a.booking_id IS NOT NULL
        AND a.booking_id = b.booking_id
        AND a.log_id < b.log_id;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_usage_logs_unique_booking
      ON lab_usage_logs (booking_id)
      WHERE booking_id IS NOT NULL;
    `);
  } catch (err) {
    console.warn('lab_usage_logs unique booking index notice:', err.message);
  }

  // 7. Create performance indexes
  await exec(`
    CREATE INDEX IF NOT EXISTS idx_location_bookings_loc_time ON location_bookings (location_id, start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_location_bookings_user ON location_bookings (user_id);
    CREATE INDEX IF NOT EXISTS idx_location_bookings_recurrence ON location_bookings (recurrence_group_id);
    CREATE INDEX IF NOT EXISTS idx_device_bookings_device_status ON device_bookings (device_id, status);
    CREATE INDEX IF NOT EXISTS idx_device_bookings_user ON device_bookings (user_id);
    CREATE INDEX IF NOT EXISTS idx_issue_reports_location ON issue_reports (location_id);
    CREATE INDEX IF NOT EXISTS idx_issue_reports_reported_by ON issue_reports (reported_by);
    CREATE INDEX IF NOT EXISTS idx_lab_usage_logs_location ON lab_usage_logs(location_id);
    CREATE INDEX IF NOT EXISTS idx_lab_usage_logs_user ON lab_usage_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_lab_usage_logs_start ON lab_usage_logs(start_time);
  `);

  // 8. One-time initial data backfill (never overwrites user changes on subsequent restarts)
  const migCheck = await query(
    `SELECT setting_value FROM system_settings WHERE setting_key = 'migration_v2_initial_backfill'`
  );
  if (migCheck.rows.length === 0) {
    await exec(`
      UPDATE devices SET barcode = 'BC-' || UPPER(serial_number) WHERE barcode IS NULL;
      UPDATE devices SET accessories = '["Touch Controllers (L & R)","USB-C Charging Cable","Carrying Case"]' WHERE serial_number IN ('VR-MQ2-001', 'VR-MQ2-002') AND accessories IS NULL;
      UPDATE devices SET accessories = '["Base Stations 2.0 (Pair)","Wireless Adapter","Controllers (L & R)","Link Box & Cables"]' WHERE serial_number = 'VR-VIVE-001' AND accessories IS NULL;
      UPDATE devices SET accessories = '["24-70mm GM Lens","Extra NP-FZ100 Battery","64GB SDXC Card","Camera Hard Case","Charger & Strap"]' WHERE serial_number = 'CAM-SNY-A7IV' AND accessories IS NULL;
      UPDATE devices SET accessories = '["BG30 Battery Grip","Quick-Release Plate","Extended Grip / Tripod","Carrying Case"]' WHERE serial_number = 'GMB-DJI-RS3P' AND accessories IS NULL;
      UPDATE devices SET accessories = '["140W USB-C Power Adapter","MagSafe 3 Cable","USB-C Multiport Hub","Protective Laptop Sleeve","Wireless Mouse"]' WHERE serial_number = 'LAP-APL-MBP16' AND accessories IS NULL;
      UPDATE devices SET accessories = '["130W USB-C Power Adapter","USB-C to HDMI/USB Adapter","Laptop Carrying Bag","Wireless Mouse"]' WHERE serial_number = 'LAP-DEL-XPS15' AND accessories IS NULL;
      UPDATE devices SET accessories = '["Remote Control","HDMI Cable","Power Cord"]' WHERE serial_number = 'PRJ-EPS-2250' AND accessories IS NULL;
      UPDATE lab_usage_logs
      SET checked_in_at = COALESCE(checked_in_at, start_time, created_at),
          attendance_status = COALESCE(attendance_status, 'on_time')
      WHERE checked_in_at IS NULL OR attendance_status IS NULL;
      UPDATE location_bookings
      SET lecturer_name = (SELECT name FROM users WHERE users.user_id = location_bookings.user_id)
      WHERE lecturer_name IS NULL
        AND user_id IN (SELECT user_id FROM users WHERE role = 'lecturer');
    `);

    await query(
      `INSERT INTO system_settings (setting_key, setting_value, description)
       VALUES ('migration_v2_initial_backfill', 'true', 'Internal marker for one-time initial device and booking backfill')
       ON CONFLICT (setting_key) DO NOTHING`
    );
  }

  // 9. Ensure Demo Login Accounts have valid bcrypt hashes and password_set = TRUE
  // so 1-click Demo Access works with strict bcrypt verification (no password bypasses needed)
  const demoAccounts = [
    { email: 'AI230182@student.uthm.edu.my', pass: 'Student123!', name: 'Muhammad Faris bin Zainal', role: 'student', matric: 'AI230182', dept: 'Department of Software Engineering', spec: 'BIW' },
    { email: 'student@fsktm.um.edu.my', pass: 'Student123!', name: 'Aiman Hakim bin Norazman', role: 'student', matric: 'WIF210045', dept: 'Software Engineering', spec: 'BIW' },
    { email: 'norasri@uthm.edu.my', pass: 'Lecturer123!', name: 'Dr. Norasri bin Ismail', role: 'lecturer', matric: 'UTHM-7821', dept: 'Department of Software Engineering', spec: null },
    { email: 'lecturer@fsktm.um.edu.my', pass: 'Lecturer123!', name: 'Dr. Nurul Huda binti Ahmad', role: 'lecturer', matric: 'L-9042', dept: 'Artificial Intelligence', spec: null },
    { email: 'technician@fsktm.um.edu.my', pass: 'Tech123!', name: 'En. Khairul Azmi bin Razak', role: 'technician', matric: 'T-3011', dept: 'IT & Facility Services', spec: null },
    { email: 'manager@fsktm.um.edu.my', pass: 'Manager123!', name: 'Prof. Madya Ts. Dr. Shamsul Bahari', role: 'manager', matric: 'M-1002', dept: 'Dean Office / Lab Management', spec: null },
  ];

  const userCountRes = await query('SELECT COUNT(*)::int AS count FROM users');
  if (userCountRes.rows[0].count > 0) {
    for (const demo of demoAccounts) {
      const uRes = await query('SELECT user_id, password_hash, password_set FROM users WHERE LOWER(email) = LOWER($1)', [demo.email]);
      if (uRes.rows.length > 0) {
        const u = uRes.rows[0];
        const matchesDemoPass = await bcrypt.compare(demo.pass, u.password_hash || '');
        if (!matchesDemoPass || !u.password_set) {
          const hash = await bcrypt.hash(demo.pass, 10);
          await query('UPDATE users SET password_hash = $1, password_set = TRUE WHERE user_id = $2', [hash, u.user_id]);
        }
      }
    }
    // Also ensure any existing local account has password_set = TRUE if password_hash is present
    await exec(`UPDATE users SET password_set = TRUE WHERE auth_provider = 'local' AND password_set IS DISTINCT FROM TRUE;`);
  }

  migrationsCompleted = true;
}

function resetMigrationFlag() {
  migrationsCompleted = false;
}

module.exports = {
  runMigrations,
  resetMigrationFlag,
};
