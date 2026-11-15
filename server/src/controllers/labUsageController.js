const { query } = require('../config/db');
const { createUserNotification } = require('./notificationsController');

let seededInitialLogs = false;

async function ensureSampleLogsSeeded() {
  if (seededInitialLogs) return;
  try {
    const countRes = await query('SELECT COUNT(*) AS count FROM lab_usage_logs');
    const count = parseInt(countRes.rows[0]?.count || '0', 10);
    if (count === 0) {
      const lecRes = await query("SELECT user_id FROM users WHERE role = 'lecturer' ORDER BY user_id ASC LIMIT 2");
      const locRes = await query("SELECT location_id FROM locations WHERE status != 'maintenance' ORDER BY location_id ASC LIMIT 3");
      if (lecRes.rows.length > 0 && locRes.rows.length > 0) {
        const l1 = lecRes.rows[0].user_id;
        const l2 = lecRes.rows[1] ? lecRes.rows[1].user_id : l1;
        const rm1 = locRes.rows[0].location_id;
        const rm2 = locRes.rows[1] ? locRes.rows[1].location_id : rm1;
        await query(
          `INSERT INTO lab_usage_logs (location_id, user_id, start_time, end_time, course_id, course_name, purpose)
           VALUES
             ($1, $2, CURRENT_DATE + INTERVAL '9 hours', CURRENT_DATE + INTERVAL '11 hours', 'BIC21404', 'Software Design & Architecture', 'Weekly Lecture & Lab Session - Attendance Recorded'),
             ($3, $4, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '14 hours', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '16 hours', 'BIW30103', 'Web Application Development', 'Practical Lab & Lecture Attendance')`,
          [rm1, l2, rm2, l1]
        );
      }
    }
    seededInitialLogs = true;
  } catch (err) {
    console.warn('Notice seeding initial lab usage logs:', err.message);
  }
}

// GET /api/lab-usage
async function getLabUsageLogs(req, res) {
  try {
    await ensureSampleLogsSeeded();

    const { location_id, user_id, startDate, endDate, floor } = req.query;

    let sql = `
      SELECT
        lg.log_id,
        lg.location_id,
        lg.user_id,
        lg.start_time,
        lg.end_time,
        lg.course_id,
        lg.course_name,
        lg.purpose,
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
      WHERE 1=1
    `;
    const params = [];

    if (location_id) {
      params.push(location_id);
      sql += ` AND lg.location_id = $${params.length}`;
    }

    if (user_id) {
      params.push(user_id);
      sql += ` AND lg.user_id = $${params.length}`;
    }

    if (floor) {
      params.push(floor);
      sql += ` AND l.floor = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      sql += ` AND lg.end_time >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      sql += ` AND lg.start_time <= $${params.length}`;
    }

    sql += ' ORDER BY lg.start_time DESC, lg.created_at DESC';

    const result = await query(sql, params);
    return res.json({
      success: true,
      count: result.rows.length,
      logs: result.rows
    });
  } catch (err) {
    console.error('getLabUsageLogs error:', err);
    return res.status(500).json({ error: 'Failed to retrieve lab usage logs.' });
  }
}

// POST /api/lab-usage
async function createLabUsageLog(req, res) {
  try {
    const { location_id, start_time, end_time, course_id, course_name, purpose } = req.body;
    const userId = req.user.user_id;

    if (!location_id || !start_time || !end_time || !purpose) {
      return res.status(400).json({ error: 'Lab/Room, date, time window, and purpose are required.' });
    }

    if (!course_id?.trim() || !course_name?.trim()) {
      return res.status(400).json({ error: 'Course code and course name are required.' });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date format.' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    const locRes = await query('SELECT location_id, name, code, status FROM locations WHERE location_id = $1', [location_id]);
    if (locRes.rows.length === 0) {
      return res.status(404).json({ error: 'Selected lab or room does not exist.' });
    }

    const location = locRes.rows[0];

    const insertRes = await query(
      `INSERT INTO lab_usage_logs (location_id, user_id, start_time, end_time, course_id, course_name, purpose)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        location_id,
        userId,
        start.toISOString(),
        end.toISOString(),
        course_id.trim().toUpperCase(),
        course_name.trim(),
        purpose.trim()
      ]
    );

    const createdLog = insertRes.rows[0];

    // Notify Lab Managers about the new lab usage / lecture attendance log
    try {
      const managers = await query("SELECT user_id FROM users WHERE role = 'manager'");
      for (const mgr of managers.rows) {
        if (Number(mgr.user_id) !== Number(userId)) {
          await createUserNotification({
            userId: mgr.user_id,
            type: 'room_booking',
            title: 'Rekod Penggunaan Makmal Baharu',
            message: `${req.user.name} logged lecture attendance for ${course_id.trim().toUpperCase()} at ${location.name} (${location.code}).`,
            entityType: 'lab_usage',
            entityId: createdLog.log_id
          });
        }
      }
    } catch (notifyErr) {
      console.warn('Notification notice for lab usage log:', notifyErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Lecture attendance & lab usage recorded for ${location.name} (${location.code}).`,
      log: createdLog
    });
  } catch (err) {
    console.error('createLabUsageLog error:', err);
    return res.status(500).json({ error: 'Failed to record lecture attendance / lab usage.' });
  }
}

// DELETE /api/lab-usage/:id
async function deleteLabUsageLog(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM lab_usage_logs WHERE log_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lab usage log record not found.' });
    }

    const log = existing.rows[0];
    const isStaff = ['manager', 'technician'].includes(req.user.role);
    if (!isStaff && Number(log.user_id) !== Number(req.user.user_id)) {
      return res.status(403).json({ error: 'Not authorized to delete this record.' });
    }

    await query('DELETE FROM lab_usage_logs WHERE log_id = $1', [id]);
    return res.json({ success: true, message: 'Lab usage log deleted.' });
  } catch (err) {
    console.error('deleteLabUsageLog error:', err);
    return res.status(500).json({ error: 'Failed to delete lab usage log.' });
  }
}

module.exports = {
  getLabUsageLogs,
  createLabUsageLog,
  deleteLabUsageLog
};
