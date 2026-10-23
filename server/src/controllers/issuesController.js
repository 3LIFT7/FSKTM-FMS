const { query } = require('../config/db');

// GET /api/issues
async function getIssues(req, res) {
  try {
    const { status, location_id, device_id } = req.query;
    const currentUser = req.user;

    let sql = `
      SELECT 
        ir.report_id,
        ir.reported_by,
        ir.location_id,
        ir.device_id,
        ir.description,
        ir.photo_url,
        ir.status,
        ir.created_at,
        ir.updated_at,
        ir.guest_name,
        ir.guest_email,
        ir.category,
        COALESCE(u.name, ir.guest_name, 'Classroom Reporter') AS reporter_name,
        COALESCE(u.email, ir.guest_email, '') AS reporter_email,
        COALESCE(u.role, 'guest') AS reporter_role,
        l.name AS location_name,
        l.code AS location_code,
        l.floor AS location_floor,
        d.name AS device_name,
        d.serial_number AS device_serial,
        (SELECT COUNT(*) FROM maintenance_logs m WHERE m.linked_report_id = ir.report_id) AS maintenance_count
      FROM issue_reports ir
      LEFT JOIN users u ON ir.reported_by = u.user_id
      LEFT JOIN locations l ON ir.location_id = l.location_id
      LEFT JOIN devices d ON ir.device_id = d.device_id
      WHERE 1=1
    `;
    const params = [];

    // Students only view their own reports
    if (currentUser.role === 'student' || currentUser.role === 'lecturer') {
      params.push(currentUser.user_id);
      sql += ` AND ir.reported_by = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND ir.status = $${params.length}`;
    }

    if (location_id) {
      params.push(location_id);
      sql += ` AND ir.location_id = $${params.length}`;
    }

    if (device_id) {
      params.push(device_id);
      sql += ` AND ir.device_id = $${params.length}`;
    }

    sql += ' ORDER BY ir.created_at DESC';

    const result = await query(sql, params);
    return res.json({ success: true, count: result.rows.length, reports: result.rows });
  } catch (err) {
    console.error('getIssues error:', err);
    return res.status(500).json({ error: 'Failed to retrieve breakdown tickets.' });
  }
}

// POST /api/issues
async function createIssue(req, res) {
  try {
    const { location_id, device_id, description, photo_url, guest_name, guest_email, category } = req.body;
    const reported_by = req.user ? req.user.user_id : null;

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Problem description is required.' });
    }

    if (!location_id && !device_id) {
      return res.status(400).json({ error: 'Please specify either a room location or device for this report.' });
    }

    let photo = photo_url || null;
    if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

    const gName = req.user ? req.user.name : (guest_name || 'Classroom Reporter');
    const gEmail = req.user ? req.user.email : (guest_email || null);
    const cat = category || 'General';

    const result = await query(
      `INSERT INTO issue_reports (reported_by, location_id, device_id, description, photo_url, status, guest_name, guest_email, category)
       VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8)
       RETURNING *`,
      [reported_by, location_id || null, device_id || null, description.trim(), photo, gName, gEmail, cat]
    );

    return res.status(201).json({
      success: true,
      message: 'Damage/breakdown report submitted successfully. Technicians have been notified.',
      report: result.rows[0]
    });
  } catch (err) {
    console.error('createIssue error:', err);
    return res.status(500).json({ error: 'Failed to submit report.' });
  }
}

// PATCH /api/issues/:id/status (Staff only)
async function updateIssueStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await query(
      `UPDATE issue_reports 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE report_id = $2 
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    return res.json({
      success: true,
      message: `Ticket status updated to ${status}.`,
      report: result.rows[0]
    });
  } catch (err) {
    console.error('updateIssueStatus error:', err);
    return res.status(500).json({ error: 'Failed to update ticket status.' });
  }
}

module.exports = {
  getIssues,
  createIssue,
  updateIssueStatus
};
