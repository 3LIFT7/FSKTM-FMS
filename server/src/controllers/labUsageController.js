const { query, exec } = require('../config/db');
const { createUserNotification } = require('./notificationsController');

let qrAttendanceColumnsEnsured = false;

async function ensureQrAttendanceSchema() {
  if (qrAttendanceColumnsEnsured) return;
  try {
    await exec(`
      ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(50);
      ALTER TABLE location_bookings ADD COLUMN IF NOT EXISTS attendance_notes TEXT;
      ALTER TABLE lab_usage_logs ADD COLUMN IF NOT EXISTS booking_id INT;
      ALTER TABLE lab_usage_logs ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE lab_usage_logs ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(50) DEFAULT 'on_time';
    `);

    // Backfill existing lab_usage_logs that don't have checked_in_at or attendance_status
    await exec(`
      UPDATE lab_usage_logs
      SET checked_in_at = COALESCE(checked_in_at, start_time, created_at),
          attendance_status = COALESCE(attendance_status, 'on_time')
      WHERE checked_in_at IS NULL OR attendance_status IS NULL;
    `);

    qrAttendanceColumnsEnsured = true;
  } catch (err) {
    console.warn('ensureQrAttendanceSchema notice:', err.message);
  }
}

function computeBookingAttendanceState(row, now = new Date()) {
  if (row.checked_in_at || (row.attendance_status && ['on_time', 'late'].includes(row.attendance_status))) {
    const start = new Date(row.start_time);
    const checkedIn = row.checked_in_at ? new Date(row.checked_in_at) : start;
    const diffMins = Math.round((checkedIn.getTime() - start.getTime()) / 60000);
    const status = row.attendance_status || (diffMins <= 15 ? 'on_time' : 'late');
    return {
      attendance_status: status,
      late_minutes: status === 'late' ? Math.max(1, diffMins) : 0,
    };
  }

  const end = new Date(row.end_time);
  if (now.getTime() > end.getTime()) {
    return {
      attendance_status: 'missed',
      late_minutes: 0,
    };
  }

  return {
    attendance_status: 'pending_checkin',
    late_minutes: 0,
  };
}

// GET /api/lab-usage
// Returns unified faculty reservation attendance records (On-Time, Late, Pending QR Scan, Missed/Absent)
async function getLabUsageLogs(req, res) {
  try {
    await ensureQrAttendanceSchema();

    const { location_id, user_id, startDate, endDate, floor, attendance_status } = req.query;

    // 1. Query all lecturer room/lab reservations (location_bookings) along with any linked lab_usage_logs
    let bookingsSql = `
      SELECT
        b.booking_id,
        lg.log_id,
        b.location_id,
        b.user_id,
        b.start_time,
        b.end_time,
        b.course_id,
        b.course_name,
        COALESCE(b.attendance_notes, lg.purpose, b.purpose) AS purpose,
        COALESCE(b.checked_in_at, lg.checked_in_at) AS checked_in_at,
        COALESCE(b.attendance_status, lg.attendance_status) AS raw_attendance_status,
        COALESCE(lg.created_at, b.created_at) AS created_at,
        l.name AS location_name,
        l.code AS location_code,
        l.floor AS location_floor,
        l.category AS location_category,
        l.capacity AS location_capacity,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        u.matric_or_staff_id,
        u.department AS user_department
      FROM location_bookings b
      JOIN locations l ON b.location_id = l.location_id
      JOIN users u ON b.user_id = u.user_id
      LEFT JOIN lab_usage_logs lg ON lg.booking_id = b.booking_id
      WHERE u.role = 'lecturer'
        AND b.status IN ('approved', 'pending')
    `;
    const params = [];

    if (location_id) {
      params.push(location_id);
      bookingsSql += ` AND b.location_id = $${params.length}`;
    }

    if (user_id) {
      params.push(user_id);
      bookingsSql += ` AND b.user_id = $${params.length}`;
    }

    if (floor) {
      params.push(floor);
      bookingsSql += ` AND l.floor = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      bookingsSql += ` AND b.end_time >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      bookingsSql += ` AND b.start_time <= $${params.length}`;
    }

    // 2. Also include standalone legacy lab_usage_logs that aren't tied to a booking_id
    let standaloneSql = `
      SELECT
        lg.booking_id,
        lg.log_id,
        lg.location_id,
        lg.user_id,
        lg.start_time,
        lg.end_time,
        lg.course_id,
        lg.course_name,
        lg.purpose,
        lg.checked_in_at,
        lg.attendance_status AS raw_attendance_status,
        lg.created_at,
        l.name AS location_name,
        l.code AS location_code,
        l.floor AS location_floor,
        l.category AS location_category,
        l.capacity AS location_capacity,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        u.matric_or_staff_id,
        u.department AS user_department
      FROM lab_usage_logs lg
      JOIN locations l ON lg.location_id = l.location_id
      JOIN users u ON lg.user_id = u.user_id
      WHERE lg.booking_id IS NULL
    `;
    const standaloneParams = [];

    if (location_id) {
      standaloneParams.push(location_id);
      standaloneSql += ` AND lg.location_id = $${standaloneParams.length}`;
    }
    if (user_id) {
      standaloneParams.push(user_id);
      standaloneSql += ` AND lg.user_id = $${standaloneParams.length}`;
    }
    if (floor) {
      standaloneParams.push(floor);
      standaloneSql += ` AND l.floor = $${standaloneParams.length}`;
    }

    const [bookingsRes, standaloneRes] = await Promise.all([
      query(bookingsSql, params),
      query(standaloneSql, standaloneParams),
    ]);

    const now = new Date();
    const combined = [...bookingsRes.rows, ...standaloneRes.rows].map((row) => {
      const computed = computeBookingAttendanceState(
        {
          ...row,
          attendance_status: row.raw_attendance_status,
        },
        now
      );

      return {
        ...row,
        record_key: row.booking_id ? `booking-${row.booking_id}` : `log-${row.log_id}`,
        log_id: row.log_id || `B-${row.booking_id}`,
        attendance_status: computed.attendance_status,
        late_minutes: computed.late_minutes,
      };
    });

    // Sort: Today's & most recent sessions first, or active check-ins first
    combined.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const filtered = attendance_status && attendance_status !== 'All'
      ? combined.filter((item) => item.attendance_status === attendance_status)
      : combined;

    return res.json({
      success: true,
      count: filtered.length,
      logs: filtered,
    });
  } catch (err) {
    console.error('getLabUsageLogs error:', err);
    return res.status(500).json({ error: 'Failed to retrieve lab usage logs.' });
  }
}

// POST /api/lab-usage/qr-checkin
// Lecturer scans the QR code in the reserved lab/room to confirm attendance
async function checkInViaQr(req, res) {
  try {
    await ensureQrAttendanceSchema();

    const { booking_id, location_id, code, notes } = req.body;
    const userId = req.user.user_id;

    if (!booking_id) {
      return res.status(400).json({ error: 'Reservation ID (booking_id) is required to confirm QR attendance.' });
    }

    const bookingRes = await query(
      `SELECT b.*, l.name AS location_name, l.code AS location_code, l.floor AS location_floor
       FROM location_bookings b
       JOIN locations l ON b.location_id = l.location_id
       WHERE b.booking_id = $1`,
      [booking_id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const booking = bookingRes.rows[0];

    // Verify ownership (or Lab Manager)
    if (Number(booking.user_id) !== Number(userId) && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'This reservation belongs to another faculty member.' });
    }

    // Verify scanned room matches the reserved room
    if (location_id && Number(booking.location_id) !== Number(location_id)) {
      return res.status(400).json({
        error: `Room mismatch: This reservation is for ${booking.location_name} (${booking.location_code}). Please scan the QR code inside ${booking.location_code}.`,
      });
    }
    if (code && String(booking.location_code).toUpperCase() !== String(code).trim().toUpperCase()) {
      return res.status(400).json({
        error: `Room mismatch: This reservation is for ${booking.location_name} (${booking.location_code}).`,
      });
    }

    if (booking.checked_in_at) {
      return res.status(400).json({
        error: 'Attendance has already been confirmed for this reservation.',
        checked_in_at: booking.checked_in_at,
        attendance_status: booking.attendance_status,
      });
    }

    const now = new Date();
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const earliestCheckin = new Date(start.getTime() - 15 * 60 * 1000); // 15 minutes before start_time
    const onTimeDeadline = new Date(start.getTime() + 15 * 60 * 1000); // 15 minutes after start_time

    if (now < earliestCheckin) {
      const earliestStr = earliestCheckin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.status(400).json({
        error: `Too early to check in. QR attendance confirmation opens 15 minutes before your scheduled start time (at ${earliestStr}).`,
        code: 'TOO_EARLY',
      });
    }

    if (now > end) {
      const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.status(400).json({
        error: `Check-in window closed at ${endStr}. This reservation has been marked as Missed / Absent.`,
        code: 'WINDOW_CLOSED',
      });
    }

    const attendanceStatus = now <= onTimeDeadline ? 'on_time' : 'late';
    const diffMins = Math.max(0, Math.round((now.getTime() - start.getTime()) / 60000));
    const cleanNotes = notes?.trim() || booking.purpose || 'QR Code Attendance Verified';

    // Update location_bookings
    await query(
      `UPDATE location_bookings
       SET checked_in_at = CURRENT_TIMESTAMP,
           attendance_status = $1,
           attendance_notes = $2,
           status = 'approved'
       WHERE booking_id = $3`,
      [attendanceStatus, cleanNotes, booking.booking_id]
    );

    // Insert or update corresponding record in lab_usage_logs for Lab Manager
    const existingLog = await query('SELECT log_id FROM lab_usage_logs WHERE booking_id = $1', [booking.booking_id]);
    let createdLog;
    if (existingLog.rows.length > 0) {
      const upd = await query(
        `UPDATE lab_usage_logs
         SET checked_in_at = CURRENT_TIMESTAMP,
             attendance_status = $1,
             purpose = $2
         WHERE booking_id = $3
         RETURNING *`,
        [attendanceStatus, cleanNotes, booking.booking_id]
      );
      createdLog = upd.rows[0];
    } else {
      const ins = await query(
        `INSERT INTO lab_usage_logs (booking_id, location_id, user_id, start_time, end_time, course_id, course_name, purpose, checked_in_at, attendance_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
         RETURNING *`,
        [
          booking.booking_id,
          booking.location_id,
          booking.user_id,
          booking.start_time,
          booking.end_time,
          booking.course_id || 'LAB-SESSION',
          booking.course_name || 'Lab / Room Reservation',
          cleanNotes,
          attendanceStatus,
        ]
      );
      createdLog = ins.rows[0];
    }

    // Notify Lab Managers
    try {
      const managers = await query("SELECT user_id FROM users WHERE role = 'manager'");
      const statusLabel = attendanceStatus === 'on_time' ? 'On-Time' : `Late (+${diffMins} mins)`;
      for (const mgr of managers.rows) {
        await createUserNotification({
          userId: mgr.user_id,
          type: 'room_booking',
          title: `QR Attendance Verified (${statusLabel})`,
          message: `${req.user.name} confirmed attendance via QR at ${booking.location_name} (${booking.location_code}) for ${booking.course_id || booking.purpose} — Status: ${statusLabel}.`,
          entityType: 'lab_usage',
          entityId: createdLog.log_id,
        });
      }
    } catch (notifyErr) {
      console.warn('Notification notice for QR attendance:', notifyErr.message);
    }

    return res.status(200).json({
      success: true,
      attendance_status: attendanceStatus,
      late_minutes: attendanceStatus === 'late' ? diffMins : 0,
      checked_in_at: createdLog.checked_in_at,
      message:
        attendanceStatus === 'on_time'
          ? `Attendance confirmed On-Time for ${booking.location_name} (${booking.location_code})!`
          : `Attendance confirmed (Late Check-In: +${diffMins} mins) for ${booking.location_name} (${booking.location_code}).`,
      log: createdLog,
    });
  } catch (err) {
    console.error('checkInViaQr error:', err);
    return res.status(500).json({ error: 'Failed to confirm QR attendance.' });
  }
}

// DELETE /api/lab-usage/:id
async function deleteLabUsageLog(req, res) {
  try {
    await ensureQrAttendanceSchema();
    const { id } = req.params;

    if (String(id).startsWith('B-')) {
      const bookingId = parseInt(String(id).replace('B-', ''), 10);
      await query(
        `UPDATE location_bookings
         SET checked_in_at = NULL, attendance_status = NULL, attendance_notes = NULL
         WHERE booking_id = $1`,
        [bookingId]
      );
      await query('DELETE FROM lab_usage_logs WHERE booking_id = $1', [bookingId]);
      return res.json({ success: true, message: 'Attendance log reset.' });
    }

    const existing = await query('SELECT * FROM lab_usage_logs WHERE log_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lab usage log record not found.' });
    }

    const log = existing.rows[0];
    const isStaff = ['manager', 'technician'].includes(req.user.role);
    if (!isStaff && Number(log.user_id) !== Number(req.user.user_id)) {
      return res.status(403).json({ error: 'Not authorized to delete this record.' });
    }

    if (log.booking_id) {
      await query(
        `UPDATE location_bookings
         SET checked_in_at = NULL, attendance_status = NULL, attendance_notes = NULL
         WHERE booking_id = $1`,
        [log.booking_id]
      );
    }

    await query('DELETE FROM lab_usage_logs WHERE log_id = $1', [id]);
    return res.json({ success: true, message: 'Lab usage log record deleted.' });
  } catch (err) {
    console.error('deleteLabUsageLog error:', err);
    return res.status(500).json({ error: 'Failed to delete lab usage log.' });
  }
}

module.exports = {
  ensureQrAttendanceSchema,
  getLabUsageLogs,
  checkInViaQr,
  deleteLabUsageLog,
};
