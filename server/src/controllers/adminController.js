const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// GET /api/admin/users
async function getAllUsers(req, res) {
  try {
    const { role, search } = req.query;
    let sql = 'SELECT user_id, name, email, role, matric_or_staff_id, department, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(matric_or_staff_id) LIKE $${params.length})`;
    }

    sql += ' ORDER BY role, name ASC';
    const result = await query(sql, params);
    return res.json({ success: true, count: result.rows.length, users: result.rows });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user accounts.' });
  }
}

// POST /api/admin/users
async function createUser(req, res) {
  try {
    const { name, email, password, role, matric_or_staff_id, department } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    if (!['student', 'lecturer', 'technician', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role specified.' });
    }

    const checkRes = await query('SELECT user_id FROM users WHERE LOWER(email) = $1', [email.trim().toLowerCase()]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, matric_or_staff_id, department)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, name, email, role, matric_or_staff_id, department, created_at`,
      [name.trim(), email.trim().toLowerCase(), hash, role, matric_or_staff_id || null, department || 'FSKTM']
    );

    return res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ error: 'Failed to create user account.' });
  }
}

// PATCH /api/admin/users/:id/role
async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['student', 'lecturer', 'technician', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const result = await query('UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id, name, email, role', [role, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('updateUserRole error:', err);
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
}

// DELETE /api/admin/users/:id
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (parseInt(id, 10) === req.user.user_id) {
      return res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
    }

    const result = await query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ success: true, message: 'User account removed.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
}

// GET /api/admin/reports/summary
async function getReportsSummary(req, res) {
  try {
    const [locationsStats, devicesStats, bookingsStats, issuesStats, deviceLoansStats] = await Promise.all([
      query(`SELECT 
              COUNT(*) AS total_locations,
              COUNT(CASE WHEN status = 'available' THEN 1 END) AS available_locations,
              COUNT(CASE WHEN status = 'maintenance' THEN 1 END) AS maintenance_locations
             FROM locations`),
      query(`SELECT 
              COUNT(*) AS total_devices,
              COUNT(CASE WHEN status = 'available' THEN 1 END) AS available_devices,
              COUNT(CASE WHEN status = 'checked_out' THEN 1 END) AS checked_out_devices,
              COUNT(CASE WHEN status = 'maintenance' THEN 1 END) AS maintenance_devices,
              COUNT(CASE WHEN status = 'broken' THEN 1 END) AS broken_devices
             FROM devices`),
      query(`SELECT 
              COUNT(*) AS total_bookings,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_bookings,
              COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_bookings,
              COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_bookings,
              COUNT(CASE WHEN end_time > CURRENT_TIMESTAMP AND status IN ('pending', 'approved') THEN 1 END) AS upcoming_bookings
             FROM location_bookings WHERE status != 'cancelled'`),
      query(`SELECT 
              COUNT(*) AS total_reports,
              COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_reports,
              COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress_reports,
              COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolved_reports
             FROM issue_reports`),
      query(`SELECT 
              COUNT(*) AS total_loans,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_loans,
              COUNT(CASE WHEN status = 'checked_out' THEN 1 END) AS checked_out_loans,
              COUNT(CASE WHEN status = 'returned' THEN 1 END) AS returned_loans,
              COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_loans
             FROM device_bookings`)
    ]);

    // Top utilized facilities
    const topFacilities = await query(`
      SELECT l.location_id, l.name, l.code, l.floor, l.capacity, l.status,
             COUNT(b.booking_id) as booking_count
      FROM locations l
      LEFT JOIN location_bookings b ON l.location_id = b.location_id AND b.status != 'cancelled'
      GROUP BY l.location_id, l.name, l.code, l.floor, l.capacity, l.status
      ORDER BY booking_count DESC, l.name ASC LIMIT 10
    `);

    // Most common / popular equipment by loan frequency
    const topEquipment = await query(`
      SELECT d.device_id, d.name, d.category, d.serial_number, d.status,
             COUNT(db.loan_id) as loan_count
      FROM devices d
      LEFT JOIN device_bookings db ON d.device_id = db.device_id
      GROUP BY d.device_id, d.name, d.category, d.serial_number, d.status
      ORDER BY loan_count DESC, d.name ASC LIMIT 10
    `);

    // Most frequently broken items / locations
    const frequentBreakdowns = await query(`
      SELECT 
        COALESCE(l.name, 'Equipment Loan Issue') as facility_name,
        COALESCE(d.name, 'General Infrastructure') as device_name,
        COUNT(ir.report_id) as report_count
      FROM issue_reports ir
      LEFT JOIN locations l ON ir.location_id = l.location_id
      LEFT JOIN devices d ON ir.device_id = d.device_id
      GROUP BY l.name, d.name
      ORDER BY report_count DESC LIMIT 8
    `);

    // Recent breakdown issues
    const recentIssues = await query(`
      SELECT 
        ir.report_id,
        ir.description,
        ir.status,
        ir.category,
        ir.created_at,
        l.name as location_name,
        d.name as device_name,
        COALESCE(u.name, ir.guest_name, 'Reporter') as reporter_name
      FROM issue_reports ir
      LEFT JOIN locations l ON ir.location_id = l.location_id
      LEFT JOIN devices d ON ir.device_id = d.device_id
      LEFT JOIN users u ON ir.reported_by = u.user_id
      ORDER BY ir.created_at DESC LIMIT 10
    `);

    return res.json({
      success: true,
      stats: {
        locations: locationsStats.rows[0],
        devices: devicesStats.rows[0],
        bookings: bookingsStats.rows[0],
        issues: issuesStats.rows[0],
        device_loans: deviceLoansStats.rows[0],
        top_facilities: topFacilities.rows,
        top_rooms: topFacilities.rows,
        top_equipment: topEquipment.rows,
        frequent_breakdowns: frequentBreakdowns.rows,
        recent_issues: recentIssues.rows
      }
    });
  } catch (err) {
    console.error('getReportsSummary error:', err);
    return res.status(500).json({ error: 'Failed to compile management reports.' });
  }
}

module.exports = {
  getAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
  getReportsSummary
};
