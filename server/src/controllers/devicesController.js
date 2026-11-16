const { query, exec } = require('../config/db');

let accessoriesColumnEnsured = false;

async function ensureAccessoriesColumn() {
  if (accessoriesColumnEnsured) return;
  try {
    await exec(`
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS accessories TEXT;
      ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS selected_accessories TEXT;
      ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS return_rating INT;
      ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS return_condition VARCHAR(100);
      ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS return_notes TEXT;
      ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS device_rating INT;
      ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS device_review TEXT;
      ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS rated_at TIMESTAMP WITH TIME ZONE;
    `);
    await exec(`UPDATE devices SET accessories = '["Touch Controllers (L & R)","USB-C Charging Cable","Carrying Case"]' WHERE serial_number IN ('VR-MQ2-001', 'VR-MQ2-002') AND accessories IS NULL`);
    await exec(`UPDATE devices SET accessories = '["Base Stations 2.0 (Pair)","Wireless Adapter","Controllers (L & R)","Link Box & Cables"]' WHERE serial_number = 'VR-VIVE-001' AND accessories IS NULL`);
    await exec(`UPDATE devices SET accessories = '["24-70mm GM Lens","Extra NP-FZ100 Battery","64GB SDXC Card","Camera Hard Case","Charger & Strap"]' WHERE serial_number = 'CAM-SNY-A7IV' AND accessories IS NULL`);
    await exec(`UPDATE devices SET accessories = '["BG30 Battery Grip","Quick-Release Plate","Extended Grip / Tripod","Carrying Case"]' WHERE serial_number = 'GMB-DJI-RS3P' AND accessories IS NULL`);
    await exec(`UPDATE devices SET accessories = '["140W USB-C Power Adapter","MagSafe 3 Cable","USB-C Multiport Hub","Protective Laptop Sleeve","Wireless Mouse"]' WHERE serial_number = 'LAP-APL-MBP16' AND accessories IS NULL`);
    await exec(`UPDATE devices SET accessories = '["130W USB-C Power Adapter","USB-C to HDMI/USB Adapter","Laptop Carrying Bag","Wireless Mouse"]' WHERE serial_number = 'LAP-DEL-XPS15' AND accessories IS NULL`);
    await exec(`UPDATE devices SET accessories = '["Remote Control","HDMI Cable","Power Cord"]' WHERE serial_number = 'PRJ-EPS-2250' AND accessories IS NULL`);
    await exec(`UPDATE device_bookings SET selected_accessories = '["24-70mm GM Lens","Extra NP-FZ100 Battery","Camera Hard Case"]' WHERE selected_accessories IS NULL AND device_id IN (SELECT device_id FROM devices WHERE serial_number = 'CAM-SNY-A7IV')`);
    accessoriesColumnEnsured = true;
  } catch (err) {
    console.warn('ensureAccessoriesColumn notice:', err.message);
  }
}

function parseAccessories(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (_) {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function serializeAccessories(val) {
  const arr = parseAccessories(val);
  return arr.length > 0 ? JSON.stringify(arr) : null;
}

function formatDeviceRow(row) {
  if (!row) return row;
  return {
    ...row,
    accessories: parseAccessories(row.accessories),
    loan_count: row.loan_count !== undefined ? Number(row.loan_count) : 0,
    rating_count: row.rating_count !== undefined ? Number(row.rating_count) : 0,
    avg_rating: row.avg_rating !== null && row.avg_rating !== undefined ? Number(Number(row.avg_rating).toFixed(1)) : null,
  };
}

// GET /api/devices
async function getAllDevices(req, res) {
  try {
    await ensureAccessoriesColumn();
    const { status, category, location_id, is_loanable, search } = req.query;

    let sql = `
      SELECT 
        d.device_id,
        d.name,
        d.category,
        d.serial_number,
        d.barcode,
        d.specs,
        d.accessories,
        d.image_url,
        d.status,
        d.location_id,
        COALESCE(d.is_loanable, (d.location_id IS NULL)) AS is_loanable,
        d.created_at,
        l.name AS location_name,
        l.code AS location_code,
        l.floor AS location_floor,
        (SELECT COUNT(*)::int FROM device_bookings db WHERE db.device_id = d.device_id) AS loan_count,
        (SELECT COUNT(*)::int FROM device_bookings db WHERE db.device_id = d.device_id AND COALESCE(db.device_rating, db.return_rating) IS NOT NULL) AS rating_count,
        (SELECT AVG(COALESCE(db.device_rating, db.return_rating)::numeric) FROM device_bookings db WHERE db.device_id = d.device_id AND COALESCE(db.device_rating, db.return_rating) IS NOT NULL) AS avg_rating
      FROM devices d
      LEFT JOIN locations l ON d.location_id = l.location_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND d.status = $${params.length}`;
    }

    if (category) {
      params.push(category);
      sql += ` AND d.category = $${params.length}`;
    }

    if (location_id) {
      params.push(location_id);
      sql += ` AND d.location_id = $${params.length}`;
    }

    if (is_loanable !== undefined) {
      if (is_loanable === 'true') {
        sql += ` AND COALESCE(d.is_loanable, (d.location_id IS NULL)) = TRUE`;
      } else if (is_loanable === 'false') {
        sql += ` AND COALESCE(d.is_loanable, (d.location_id IS NULL)) = FALSE`;
      }
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(d.name) LIKE $${params.length} OR LOWER(d.serial_number) LIKE $${params.length} OR LOWER(COALESCE(d.barcode, '')) LIKE $${params.length} OR LOWER(d.category) LIKE $${params.length})`;
    }

    sql += ' ORDER BY d.category, d.name ASC';

    const result = await query(sql, params);
    const devices = result.rows.map(formatDeviceRow);
    return res.json({ success: true, count: devices.length, devices });
  } catch (err) {
    console.error('getAllDevices error:', err);
    return res.status(500).json({ error: 'Failed to retrieve devices.' });
  }
}

// GET /api/devices/:id
async function getDeviceById(req, res) {
  try {
    await ensureAccessoriesColumn();
    const { id } = req.params;
    if (isNaN(parseInt(id, 10))) {
      return res.status(404).json({ error: 'Device not found.' });
    }
    const devRes = await query(
      `SELECT d.*, 
              COALESCE(d.is_loanable, (d.location_id IS NULL)) AS is_loanable,
              l.name AS location_name, l.code AS location_code, l.floor AS location_floor,
              (SELECT COUNT(*)::int FROM device_bookings db WHERE db.device_id = d.device_id) AS loan_count,
              (SELECT COUNT(*)::int FROM device_bookings db WHERE db.device_id = d.device_id AND COALESCE(db.device_rating, db.return_rating) IS NOT NULL) AS rating_count,
              (SELECT AVG(COALESCE(db.device_rating, db.return_rating)::numeric) FROM device_bookings db WHERE db.device_id = d.device_id AND COALESCE(db.device_rating, db.return_rating) IS NOT NULL) AS avg_rating
       FROM devices d
       LEFT JOIN locations l ON d.location_id = l.location_id
       WHERE d.device_id = $1`,
      [id]
    );

    if (devRes.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    const isStaff = req.user && ['technician', 'manager'].includes(req.user.role);

    if (!isStaff) {
      return res.json({
        success: true,
        device: {
          ...formatDeviceRow(devRes.rows[0]),
          loan_history: [],
          recent_loans: [],
          maintenance_logs: []
        }
      });
    }

    // Complete borrowing history for this device with all borrower, approver, and rating details (Technician & Lab Manager only)
    const loanRes = await query(
      `SELECT 
         dl.*,
         u.name AS borrower_name,
         u.email AS borrower_email,
         u.matric_or_staff_id,
         u.role AS user_role,
         u.department AS borrower_department,
         u.specialization AS borrower_specialization,
         app.name AS approver_name,
         app.email AS approver_email,
         lecturer.name AS lecturer_approver_name,
         lecturer.email AS lecturer_approver_email,
         lecturer_approver.name AS lecturer_approved_by_name,
         lecturer_approver.email AS lecturer_approved_by_email,
         technician.name AS technician_approver_name,
         technician.email AS technician_approver_email,
         CASE 
           WHEN dl.status = 'checked_out' AND dl.expected_return_time < CURRENT_TIMESTAMP THEN TRUE
           ELSE FALSE
         END AS is_overdue
       FROM device_bookings dl
       JOIN users u ON dl.user_id = u.user_id
       LEFT JOIN users app ON dl.approved_by = app.user_id
       LEFT JOIN users lecturer ON dl.lecturer_approver_id = lecturer.user_id
       LEFT JOIN users lecturer_approver ON dl.lecturer_approved_by = lecturer_approver.user_id
       LEFT JOIN users technician ON dl.approved_by = technician.user_id
       WHERE dl.device_id = $1
       ORDER BY dl.created_at DESC`,
      [id]
    );

    // Maintenance history
    const maintRes = await query(
      `SELECT m.*, u.name AS technician_name
       FROM maintenance_logs m
       JOIN users u ON m.technician_id = u.user_id
       WHERE m.device_id = $1
       ORDER BY m.date_performed DESC`,
      [id]
    );

    const formattedLoans = loanRes.rows.map((l) => ({
      ...l,
      selected_accessories: parseAccessories(l.selected_accessories),
    }));

    return res.json({
      success: true,
      device: {
        ...formatDeviceRow(devRes.rows[0]),
        loan_history: formattedLoans,
        recent_loans: formattedLoans,
        maintenance_logs: maintRes.rows
      }
    });
  } catch (err) {
    console.error('getDeviceById error:', err);
    return res.status(500).json({ error: 'Failed to retrieve device.' });
  }
}

// POST /api/devices
async function createDevice(req, res) {
  try {
    await ensureAccessoriesColumn();
    const { name, category, serial_number, barcode, location_id, is_loanable, specs, accessories, status, image_url } = req.body;
    if (!name || !serial_number) {
      return res.status(400).json({ error: 'Device name and serial number are required.' });
    }

    const checkRes = await query('SELECT device_id FROM devices WHERE serial_number = $1', [serial_number.trim()]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'A device with this serial number already exists.' });
    }

    const targetLocationId = location_id ? parseInt(location_id, 10) : null;
    // Once added to a room, a device becomes unavailable for individual booking (is_loanable = false)
    const targetIsLoanable = targetLocationId !== null
      ? false
      : (is_loanable !== undefined ? (is_loanable === true || is_loanable === 'true') : true);

    const serializedAccessories = serializeAccessories(accessories);

    const result = await query(
      `INSERT INTO devices (name, category, serial_number, barcode, location_id, is_loanable, specs, accessories, status, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name.trim(),
        category || 'General',
        serial_number.trim(),
        barcode ? barcode.trim() : null,
        targetLocationId,
        targetIsLoanable,
        specs || '',
        serializedAccessories,
        status || 'available',
        image_url || null
      ]
    );

    return res.status(201).json({ success: true, device: formatDeviceRow(result.rows[0]) });
  } catch (err) {
    console.error('createDevice error:', err);
    return res.status(500).json({ error: 'Failed to create device.' });
  }
}

// PUT /api/devices/:id
async function updateDevice(req, res) {
  try {
    await ensureAccessoriesColumn();
    const { id } = req.params;
    const { name, category, serial_number, barcode, location_id, is_loanable, specs, accessories, status, image_url } = req.body;

    const existingRes = await query('SELECT * FROM devices WHERE device_id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found.' });
    }
    const current = existingRes.rows[0];

    // Check serial uniqueness if changing
    if (serial_number && serial_number.trim() !== current.serial_number) {
      const dup = await query('SELECT device_id FROM devices WHERE serial_number = $1 AND device_id != $2', [
        serial_number.trim(),
        id
      ]);
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: 'A device with this serial number already exists.' });
      }
    }

    const updatedName = name !== undefined ? name.trim() : current.name;
    const updatedCategory = category !== undefined ? category : current.category;
    const updatedSerial = serial_number !== undefined ? serial_number.trim() : current.serial_number;
    const updatedBarcode = barcode !== undefined ? (barcode ? barcode.trim() : null) : current.barcode;
    
    // Allow explicitly setting location_id to null / General Pool
    const updatedLocationId =
      location_id !== undefined
        ? location_id === '' || location_id === null || location_id === 'null'
          ? null
          : parseInt(location_id, 10)
        : current.location_id;

    // Rule: When assigned to a room, device is strictly unavailable for booking (is_loanable = false)
    let updatedIsLoanable;
    if (updatedLocationId !== null) {
      updatedIsLoanable = false;
    } else if (is_loanable !== undefined) {
      updatedIsLoanable = (is_loanable === true || is_loanable === 'true');
    } else {
      updatedIsLoanable = true;
    }

    const updatedSpecs = specs !== undefined ? specs : current.specs;
    const updatedAccessories = accessories !== undefined ? serializeAccessories(accessories) : current.accessories;
    const updatedStatus = status !== undefined ? status : current.status;
    const updatedImageUrl = image_url !== undefined ? (image_url ? image_url.trim() : null) : current.image_url;

    await query(
      `UPDATE devices
       SET name = $1,
           category = $2,
           serial_number = $3,
           barcode = $4,
           location_id = $5,
           is_loanable = $6,
           specs = $7,
           accessories = $8,
           status = $9,
           image_url = $10
       WHERE device_id = $11`,
      [updatedName, updatedCategory, updatedSerial, updatedBarcode, updatedLocationId, updatedIsLoanable, updatedSpecs, updatedAccessories, updatedStatus, updatedImageUrl, id]
    );

    const devWithLoc = await query(
      `SELECT d.*, 
              COALESCE(d.is_loanable, (d.location_id IS NULL)) AS is_loanable,
              l.name AS location_name, l.code AS location_code, l.floor AS location_floor,
              (SELECT COUNT(*)::int FROM device_bookings db WHERE db.device_id = d.device_id) AS loan_count,
              (SELECT COUNT(*)::int FROM device_bookings db WHERE db.device_id = d.device_id AND COALESCE(db.device_rating, db.return_rating) IS NOT NULL) AS rating_count,
              (SELECT AVG(COALESCE(db.device_rating, db.return_rating)::numeric) FROM device_bookings db WHERE db.device_id = d.device_id AND COALESCE(db.device_rating, db.return_rating) IS NOT NULL) AS avg_rating
       FROM devices d
       LEFT JOIN locations l ON d.location_id = l.location_id
       WHERE d.device_id = $1`,
      [id]
    );

    return res.json({ success: true, device: formatDeviceRow(devWithLoc.rows[0]) });
  } catch (err) {
    console.error('updateDevice error:', err);
    return res.status(500).json({ error: 'Failed to update device.' });
  }
}

// PATCH /api/devices/:id/status
async function updateDeviceStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['available', 'checked_out', 'maintenance', 'broken'].includes(status)) {
      return res.status(400).json({ error: 'Invalid device status.' });
    }

    const result = await query(
      'UPDATE devices SET status = $1 WHERE device_id = $2 RETURNING device_id, name, serial_number, status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    return res.json({ success: true, device: result.rows[0] });
  } catch (err) {
    console.error('updateDeviceStatus error:', err);
    return res.status(500).json({ error: 'Failed to update device status.' });
  }
}

// DELETE /api/devices/:id
async function deleteDevice(req, res) {
  try {
    const { id } = req.params;

    // Check if device is actively loaned out
    const activeLoan = await query(
      `SELECT loan_id FROM device_bookings WHERE device_id = $1 AND status = 'checked_out'`,
      [id]
    );
    if (activeLoan.rows.length > 0) {
      return res.status(400).json({
        error: 'Cannot remove equipment that is currently checked out by a borrower. Please log its return first.'
      });
    }

    const result = await query('DELETE FROM devices WHERE device_id = $1 RETURNING device_id, name, serial_number', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found.' });
    }
    return res.json({
      success: true,
      message: `Equipment "${result.rows[0].name}" (${result.rows[0].serial_number}) removed successfully.`,
      device: result.rows[0]
    });
  } catch (err) {
    console.error('deleteDevice error:', err);
    return res.status(500).json({ error: 'Failed to delete device.' });
  }
}

module.exports = {
  getAllDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  updateDeviceStatus,
  deleteDevice
};
