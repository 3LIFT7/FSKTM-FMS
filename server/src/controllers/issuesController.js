const { query } = require('../config/db');
const { createUserNotification } = require('./notificationsController');
const { safeUnlink } = require('../utils/fileUpload');

const VALID_ISSUE_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'cannot_be_resolved',
  'requires_further_action',
  'closed',
];

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
        ir.issue_reason,
        ir.resolution_notes,
        ir.created_at,
        ir.updated_at,
        ir.guest_name,
        ir.guest_email,
        ir.category,
        COALESCE(u.name, ir.guest_name, 'Classroom Reporter') AS reporter_name,
        COALESCE(u.email, ir.guest_email, '') AS reporter_email,
        COALESCE(u.role, 'guest') AS reporter_role,
        u.matric_or_staff_id AS reporter_matric_number,
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

    // Students and lecturers only view their own reports
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

    if (!description || String(description).trim().length === 0) {
      safeUnlink(req.file?.path);
      return res.status(400).json({ error: 'Problem description is required.' });
    }

    if (!location_id && !device_id) {
      safeUnlink(req.file?.path);
      return res.status(400).json({ error: 'Please specify either a room location or device for this report.' });
    }

    if (location_id) {
      const locCheck = await query('SELECT location_id FROM locations WHERE location_id = $1', [location_id]);
      if (locCheck.rows.length === 0) {
        safeUnlink(req.file?.path);
        return res.status(404).json({ error: 'Specified facility location does not exist.' });
      }
    }

    if (device_id) {
      const devCheck = await query('SELECT device_id FROM devices WHERE device_id = $1', [device_id]);
      if (devCheck.rows.length === 0) {
        safeUnlink(req.file?.path);
        return res.status(404).json({ error: 'Specified hardware device does not exist.' });
      }
    }

    let photo = photo_url || null;
    if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

    const gName = req.user ? req.user.name : guest_name || 'Classroom Reporter';
    const gEmail = req.user ? req.user.email : guest_email || null;
    const cat = category || 'General';

    const result = await query(
      `INSERT INTO issue_reports (reported_by, location_id, device_id, description, photo_url, status, guest_name, guest_email, category)
       VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8)
       RETURNING *`,
      [reported_by, location_id || null, device_id || null, String(description).trim(), photo, gName, gEmail, cat]
    );

    return res.status(201).json({
      success: true,
      message: 'Damage/breakdown report submitted successfully. Technicians have been notified.',
      report: result.rows[0],
    });
  } catch (err) {
    safeUnlink(req.file?.path);
    console.error('createIssue error:', err);
    return res.status(500).json({ error: 'Failed to submit report.' });
  }
}

// PATCH /api/issues/:id/status (Staff only)
async function updateIssueStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, issue_reason, resolution_notes } = req.body;

    if (!VALID_ISSUE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_ISSUE_STATUSES.join(', ')}`,
      });
    }

    const previousRes = await query(
      `SELECT ir.reported_by, ir.status,
              COALESCE(l.name, d.name, 'reported issue') AS issue_target
       FROM issue_reports ir
       LEFT JOIN locations l ON l.location_id = ir.location_id
       LEFT JOIN devices d ON d.device_id = ir.device_id
       WHERE ir.report_id = $1`,
      [id]
    );
    if (!previousRes.rows.length) return res.status(404).json({ error: 'Report not found.' });
    const previous = previousRes.rows[0];

    const result = await query(
      `UPDATE issue_reports 
       SET status = $1, issue_reason = $2, resolution_notes = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE report_id = $4 
       RETURNING *`,
      [status, issue_reason || null, resolution_notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    if (previous.status !== status) {
      const statusLabels = {
        open: 'Open',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        cannot_be_resolved: 'Cannot Be Resolved',
        requires_further_action: 'Requires Further Action',
        closed: 'Closed',
      };
      const details = [issue_reason, resolution_notes].filter(Boolean).join(' ');
      await createUserNotification({
        userId: previous.reported_by,
        type: 'damage_report',
        title: 'Damage & Breakdown Report updated',
        message: `Report #${id} for ${previous.issue_target} changed from ${statusLabels[previous.status] || previous.status} to ${statusLabels[status]}.${details ? ` ${details}` : ''}`,
        entityType: 'damage_report',
        entityId: id,
      });
    }

    return res.json({
      success: true,
      message: `Ticket status updated to ${status}.`,
      report: result.rows[0],
    });
  } catch (err) {
    console.error('updateIssueStatus error:', err);
    return res.status(500).json({ error: 'Failed to update ticket status.' });
  }
}

module.exports = {
  getIssues,
  createIssue,
  updateIssueStatus,
  VALID_ISSUE_STATUSES,
};
