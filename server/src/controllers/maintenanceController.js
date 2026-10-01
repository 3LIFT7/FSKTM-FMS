const { query } = require('../config/db');

// GET /api/maintenance
async function getMaintenanceLogs(req, res) {
  try {
    const { location_id, device_id, upcoming_reminders } = req.query;

    let sql = `
      SELECT 
        m.log_id,
        m.device_id,
        m.location_id,
        m.technician_id,
        m.description,
        m.cost,
        m.date_performed,
        m.linked_report_id,
        m.scheduled_reminder_date,
        m.created_at,
        u.name AS technician_name,
        u.email AS technician_email,
        l.name AS location_name,
        l.code AS location_code,
        l.floor AS location_floor,
        d.name AS device_name,
        d.serial_number AS device_serial,
        ir.description AS linked_issue_description,
        ir.status AS linked_issue_status
      FROM maintenance_logs m
      JOIN users u ON m.technician_id = u.user_id
      LEFT JOIN locations l ON m.location_id = l.location_id
      LEFT JOIN devices d ON m.device_id = d.device_id
      LEFT JOIN issue_reports ir ON m.linked_report_id = ir.report_id
      WHERE 1=1
    `;
    const params = [];

    if (location_id) {
      params.push(location_id);
      sql += ` AND m.location_id = $${params.length}`;
    }

    if (device_id) {
      params.push(device_id);
      sql += ` AND m.device_id = $${params.length}`;
    }

    if (upcoming_reminders === 'true') {
      sql += ` AND m.scheduled_reminder_date IS NOT NULL AND m.scheduled_reminder_date >= CURRENT_DATE`;
      sql += ' ORDER BY m.scheduled_reminder_date ASC';
    } else {
      sql += ' ORDER BY m.date_performed DESC';
    }

    const result = await query(sql, params);
    return res.json({ success: true, count: result.rows.length, logs: result.rows });
  } catch (err) {
    console.error('getMaintenanceLogs error:', err);
    return res.status(500).json({ error: 'Failed to retrieve maintenance logs.' });
  }
}

// POST /api/maintenance
async function createMaintenanceLog(req, res) {
  try {
    const {
      location_id,
      device_id,
      description,
      cost = 0.0,
      date_performed,
      linked_report_id,
      scheduled_reminder_date,
      set_status // 'maintenance' or 'available'
    } = req.body;
    const technician_id = req.user.user_id;

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Maintenance description is required.' });
    }

    if (!location_id && !device_id) {
      return res.status(400).json({ error: 'Must specify a facility or device for maintenance.' });
    }

    const result = await query(
      `INSERT INTO maintenance_logs (
        device_id, location_id, technician_id, description, cost, date_performed, linked_report_id, scheduled_reminder_date
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8)
      RETURNING *`,
      [
        device_id || null,
        location_id || null,
        technician_id,
        description.trim(),
        parseFloat(cost) || 0.0,
        date_performed || null,
        linked_report_id || null,
        scheduled_reminder_date || null
      ]
    );

    // If a linked report was provided, optionally update report to 'resolved'
    if (linked_report_id) {
      await query(
        `UPDATE issue_reports SET status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE report_id = $1`,
        [linked_report_id]
      );
    }

    // If requested, update room or device status
    if (set_status) {
      if (location_id && ['available', 'maintenance'].includes(set_status)) {
        await query('UPDATE locations SET status = $1 WHERE location_id = $2', [set_status, location_id]);
      }
      if (device_id && ['available', 'maintenance'].includes(set_status)) {
        await query('UPDATE devices SET status = $1 WHERE device_id = $2', [set_status, device_id]);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Maintenance record saved successfully.',
      log: result.rows[0]
    });
  } catch (err) {
    console.error('createMaintenanceLog error:', err);
    return res.status(500).json({ error: 'Failed to record maintenance log.' });
  }
}

module.exports = {
  getMaintenanceLogs,
  createMaintenanceLog
};
