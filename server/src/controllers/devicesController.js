const { query } = require('../config/db');

// GET /api/devices
async function getAllDevices(req, res) {
  try {
    const { status, category, location_id, is_loanable, search } = req.query;

    let sql = `
      SELECT 
        d.device_id,
        d.name,
        d.category,
        d.serial_number,
        d.specs,
        d.status,
        d.location_id,
        COALESCE(d.is_loanable, (d.location_id IS NULL)) AS is_loanable,
        d.created_at,
        l.name AS location_name,
        l.code AS location_code,
        l.floor AS location_floor
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
      sql += ` AND (LOWER(d.name) LIKE $${params.length} OR LOWER(d.serial_number) LIKE $${params.length} OR LOWER(d.category) LIKE $${params.length})`;
    }

    sql += ' ORDER BY d.category, d.name ASC';

    const result = await query(sql, params);
    return res.json({ success: true, count: result.rows.length, devices: result.rows });
  } catch (err) {
    console.error('getAllDevices error:', err);
    return res.status(500).json({ error: 'Failed to retrieve devices.' });
  }
}

// GET /api/devices/:id
async function getDeviceById(req, res) {
  try {
    const { id } = req.params;
    const devRes = await query(
      `SELECT d.*, 
              COALESCE(d.is_loanable, (d.location_id IS NULL)) AS is_loanable,
              l.name AS location_name, l.code AS location_code, l.floor AS location_floor
       FROM devices d
       LEFT JOIN locations l ON d.location_id = l.location_id
       WHERE d.device_id = $1`,
      [id]
    );

    if (devRes.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    // Recent loans
    const loanRes = await query(
      `SELECT dl.*, u.name AS borrower_name, u.email AS borrower_email, app.name AS approver_name
       FROM device_bookings dl
       JOIN users u ON dl.user_id = u.user_id
       LEFT JOIN users app ON dl.approved_by = app.user_id
       WHERE dl.device_id = $1
       ORDER BY dl.created_at DESC LIMIT 5`,
      [id]
    );

    // Maintenance history
    const maintRes = await query(
      `SELECT m.*, u.name AS technician_name
       FROM maintenance_logs m
       JOIN users u ON m.technician_id = u.user_id
       WHERE m.device_id = $1
       ORDER BY m.date_performed DESC LIMIT 5`,
      [id]
    );

    return res.json({
      success: true,
      device: {
        ...devRes.rows[0],
        recent_loans: loanRes.rows,
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
    const { name, category, serial_number, location_id, is_loanable, specs, status } = req.body;
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

    const result = await query(
      `INSERT INTO devices (name, category, serial_number, location_id, is_loanable, specs, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, category || 'General', serial_number.trim(), targetLocationId, targetIsLoanable, specs || '', status || 'available']
    );

    return res.status(201).json({ success: true, device: result.rows[0] });
  } catch (err) {
    console.error('createDevice error:', err);
    return res.status(500).json({ error: 'Failed to create device.' });
  }
}

// PUT /api/devices/:id
async function updateDevice(req, res) {
  try {
    const { id } = req.params;
    const { name, category, serial_number, location_id, is_loanable, specs, status } = req.body;

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
    const updatedStatus = status !== undefined ? status : current.status;

    await query(
      `UPDATE devices
       SET name = $1,
           category = $2,
           serial_number = $3,
           location_id = $4,
           is_loanable = $5,
           specs = $6,
           status = $7
       WHERE device_id = $8`,
      [updatedName, updatedCategory, updatedSerial, updatedLocationId, updatedIsLoanable, updatedSpecs, updatedStatus, id]
    );

    const devWithLoc = await query(
      `SELECT d.*, 
              COALESCE(d.is_loanable, (d.location_id IS NULL)) AS is_loanable,
              l.name AS location_name, l.code AS location_code, l.floor AS location_floor
       FROM devices d
       LEFT JOIN locations l ON d.location_id = l.location_id
       WHERE d.device_id = $1`,
      [id]
    );

    return res.json({ success: true, device: devWithLoc.rows[0] });
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
