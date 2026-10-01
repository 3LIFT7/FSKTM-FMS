const { query } = require('../config/db');

// GET /api/locations
async function getAllLocations(req, res) {
  try {
    const { floor, status, search } = req.query;
    let sql = `
      SELECT 
        l.location_id,
        l.code,
        l.name,
        l.floor,
        l.capacity,
        l.category,
        l.description,
        l.status,
        l.created_at,
        (SELECT COUNT(*) FROM devices d WHERE d.location_id = l.location_id) AS device_count,
        (SELECT COUNT(*) FROM location_bookings b WHERE b.location_id = l.location_id AND b.end_time > CURRENT_TIMESTAMP AND b.status IN ('pending', 'approved')) AS active_bookings_count
      FROM locations l
      WHERE 1=1
    `;
    const params = [];

    if (floor) {
      params.push(floor);
      sql += ` AND l.floor = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND l.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(l.name) LIKE $${params.length} OR LOWER(l.code) LIKE $${params.length})`;
    }

    sql += ' ORDER BY l.floor, l.name ASC';

    const result = await query(sql, params);
    return res.json({ success: true, count: result.rows.length, locations: result.rows });
  } catch (err) {
    console.error('getAllLocations error:', err);
    return res.status(500).json({ error: 'Failed to retrieve locations.' });
  }
}

// GET /api/locations/:id
async function getLocationById(req, res) {
  try {
    const { id } = req.params;
    const locResult = await query(
      `SELECT location_id, code, name, floor, capacity, category, description, status, created_at
       FROM locations WHERE location_id = $1`,
      [id]
    );

    if (locResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found.' });
    }

    const location = locResult.rows[0];

    // Fetch devices in this room
    const devResult = await query(
      `SELECT device_id, name, category, serial_number, specs, status,
              COALESCE(is_loanable, FALSE) AS is_loanable
       FROM devices WHERE location_id = $1 ORDER BY name ASC`,
      [id]
    );

    // Fetch upcoming bookings
    const bookingsResult = await query(
      `SELECT b.booking_id, b.start_time, b.end_time, b.purpose, b.is_recurring, b.course_id, b.status,
              u.name AS booked_by, u.role AS booked_by_role
       FROM location_bookings b
       JOIN users u ON b.user_id = u.user_id
       WHERE b.location_id = $1 AND b.end_time >= CURRENT_TIMESTAMP AND b.status IN ('pending', 'approved')
       ORDER BY b.start_time ASC LIMIT 10`,
      [id]
    );

    // Fetch recent maintenance logs
    const maintenanceResult = await query(
      `SELECT m.log_id, m.description, m.cost, m.date_performed, m.linked_report_id,
              u.name AS technician_name
       FROM maintenance_logs m
       JOIN users u ON m.technician_id = u.user_id
       WHERE m.location_id = $1
       ORDER BY m.date_performed DESC LIMIT 5`,
      [id]
    );

    return res.json({
      success: true,
      location: {
        ...location,
        devices: devResult.rows,
        upcoming_bookings: bookingsResult.rows,
        recent_maintenance: maintenanceResult.rows
      }
    });
  } catch (err) {
    console.error('getLocationById error:', err);
    return res.status(500).json({ error: 'Failed to retrieve location details.' });
  }
}

// PATCH /api/locations/:id/status
// Core feature: Changing status to 'maintenance' immediately hides room from calendar & disables map booking
async function updateLocationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['available', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "available" or "maintenance".' });
    }

    const result = await query(
      `UPDATE locations SET status = $1 WHERE location_id = $2 RETURNING location_id, code, name, floor, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found.' });
    }

    const updated = result.rows[0];

    // If set to maintenance, automatically record a maintenance log entry if technician info provided
    if (status === 'maintenance' && req.user) {
      await query(
        `INSERT INTO maintenance_logs (location_id, technician_id, description, date_performed)
         VALUES ($1, $2, $3, CURRENT_DATE)`,
        [id, req.user.user_id, reason || 'Room marked under maintenance by staff.']
      );
    }

    return res.json({
      success: true,
      message: `Location ${updated.name} status updated to ${status}. Auto-hide from calendar is now active.`,
      location: updated
    });
  } catch (err) {
    console.error('updateLocationStatus error:', err);
    return res.status(500).json({ error: 'Failed to update location status.' });
  }
}

// POST /api/locations
async function createLocation(req, res) {
  try {
    const { code, name, floor, capacity, category, description, status } = req.body;
    if (!code || !name || !floor) {
      return res.status(400).json({ error: 'Code, name, and floor are required.' });
    }

    const result = await query(
      `INSERT INTO locations (code, name, floor, capacity, category, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [code, name, floor, capacity || 30, category || 'Lab', description || '', status || 'available']
    );

    return res.status(201).json({ success: true, location: result.rows[0] });
  } catch (err) {
    console.error('createLocation error:', err);
    return res.status(500).json({ error: 'Failed to create location.' });
  }
}

// PUT /api/locations/:id
async function updateLocation(req, res) {
  try {
    const { id } = req.params;
    const { code, name, floor, capacity, category, description, status, device_ids } = req.body;

    const existingRes = await query('SELECT * FROM locations WHERE location_id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found.' });
    }
    const current = existingRes.rows[0];

    const updatedCode = code !== undefined ? code.trim() : current.code;
    const updatedName = name !== undefined ? name.trim() : current.name;
    const updatedFloor = floor !== undefined ? floor : current.floor;
    const updatedCapacity = capacity !== undefined ? parseInt(capacity, 10) || 0 : current.capacity;
    const updatedCategory = category !== undefined ? category : current.category;
    const updatedDescription = description !== undefined ? description : current.description;
    const updatedStatus = status !== undefined ? status : current.status;

    const result = await query(
      `UPDATE locations
       SET code = $1,
           name = $2,
           floor = $3,
           capacity = $4,
           category = $5,
           description = $6,
           status = $7
       WHERE location_id = $8
       RETURNING *`,
      [updatedCode, updatedName, updatedFloor, updatedCapacity, updatedCategory, updatedDescription, updatedStatus, id]
    );

    // If device_ids array is provided, synchronize equipment inside this room
    if (Array.isArray(device_ids)) {
      // First unassign devices currently in this room that are being removed -> return to loanable pool
      await query('UPDATE devices SET location_id = NULL, is_loanable = TRUE WHERE location_id = $1', [id]);
      // Assign specified devices to this room -> mark unavailable for individual booking (is_loanable = FALSE)
      for (const devId of device_ids) {
        if (devId) {
          await query(
            'UPDATE devices SET location_id = $1, is_loanable = FALSE WHERE device_id = $2',
            [id, parseInt(devId, 10)]
          );
        }
      }
    }

    // Fetch refreshed equipment in this room
    const devResult = await query(
      `SELECT device_id, name, category, serial_number, specs, status
       FROM devices WHERE location_id = $1 ORDER BY name ASC`,
      [id]
    );

    return res.json({
      success: true,
      location: {
        ...result.rows[0],
        devices: devResult.rows
      }
    });
  } catch (err) {
    console.error('updateLocation error:', err);
    return res.status(500).json({ error: 'Failed to update location.' });
  }
}

// DELETE /api/locations/:id
async function deleteLocation(req, res) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM locations WHERE location_id = $1 RETURNING location_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found.' });
    }
    return res.json({ success: true, message: 'Location deleted successfully.' });
  } catch (err) {
    console.error('deleteLocation error:', err);
    return res.status(500).json({ error: 'Failed to delete location.' });
  }
}

module.exports = {
  getAllLocations,
  getLocationById,
  updateLocationStatus,
  createLocation,
  updateLocation,
  deleteLocation
};
