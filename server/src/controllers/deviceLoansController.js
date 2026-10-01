const { query } = require('../config/db');

// GET /api/device-loans
async function getDeviceLoans(req, res) {
  try {
    const { status, overdue, user_id } = req.query;
    const currentUser = req.user;

    let sql = `
      SELECT 
        dl.loan_id,
        dl.device_id,
        dl.user_id,
        dl.checkout_time,
        dl.expected_return_time,
        dl.actual_return_time,
        dl.status,
        dl.purpose,
        dl.created_at,
        d.name AS device_name,
        d.category AS device_category,
        d.serial_number,
        d.specs AS device_specs,
        u.name AS borrower_name,
        u.email AS borrower_email,
        u.matric_or_staff_id,
        app.name AS approver_name,
        CASE 
          WHEN dl.status = 'checked_out' AND dl.expected_return_time < CURRENT_TIMESTAMP THEN TRUE
          ELSE FALSE
        END AS is_overdue
      FROM device_bookings dl
      JOIN devices d ON dl.device_id = d.device_id
      JOIN users u ON dl.user_id = u.user_id
      LEFT JOIN users app ON dl.approved_by = app.user_id
      WHERE 1=1
    `;
    const params = [];

    // Students only see their own loans unless staff
    if (currentUser.role === 'student' || currentUser.role === 'lecturer') {
      params.push(currentUser.user_id);
      sql += ` AND dl.user_id = $${params.length}`;
    } else if (user_id) {
      params.push(user_id);
      sql += ` AND dl.user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND dl.status = $${params.length}`;
    }

    if (overdue === 'true') {
      sql += ` AND dl.status = 'checked_out' AND dl.expected_return_time < CURRENT_TIMESTAMP`;
    }

    sql += ' ORDER BY dl.created_at DESC';

    const result = await query(sql, params);
    return res.json({ success: true, count: result.rows.length, loans: result.rows });
  } catch (err) {
    console.error('getDeviceLoans error:', err);
    return res.status(500).json({ error: 'Failed to retrieve device loans.' });
  }
}

// POST /api/device-loans (Student or Lecturer initiates loan)
async function requestDeviceLoan(req, res) {
  try {
    const { device_id, expected_return_time, purpose } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    if (!device_id || !expected_return_time || !purpose) {
      return res.status(400).json({ error: 'Device ID, expected return time, and purpose are required.' });
    }

    // Check device availability and loan eligibility
    const devRes = await query(
      `SELECT d.device_id, d.name, d.status, d.location_id, 
              COALESCE(d.is_loanable, (d.location_id IS NULL)) AS is_loanable,
              l.name AS location_name, l.code AS location_code
       FROM devices d
       LEFT JOIN locations l ON d.location_id = l.location_id
       WHERE d.device_id = $1`,
      [device_id]
    );
    if (devRes.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    const device = devRes.rows[0];

    // Check if device is loanable (non-loanable in-room devices cannot be reserved)
    if (!device.is_loanable || device.location_id !== null) {
      const roomDesc = device.location_name ? ` (${device.location_name})` : '';
      return res.status(400).json({
        error: `Device "${device.name}" is designated as fixed in-room equipment${roomDesc} and is not available for reservation or loan. Only portable equipment in the general loan pool can be reserved.`,
        code: 'DEVICE_NOT_LOANABLE'
      });
    }

    if (device.status !== 'available') {
      return res.status(400).json({
        error: `Device "${device.name}" is currently ${device.status.replace('_', ' ')} and cannot be booked.`,
        deviceStatus: device.status
      });
    }

    // Check system setting for approval
    const settingRes = await query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'device_booking_requires_approval'"
    );
    const requiresApproval = settingRes.rows.length > 0 ? settingRes.rows[0].setting_value === 'true' : true;

    const initialStatus = requiresApproval ? 'pending' : 'approved';

    const result = await query(
      `INSERT INTO device_bookings (device_id, user_id, expected_return_time, purpose, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [device_id, userId, expected_return_time, purpose, initialStatus]
    );

    return res.status(201).json({
      success: true,
      message: requiresApproval
        ? 'Device booking request submitted successfully. Awaiting technician approval.'
        : 'Device booked successfully.',
      loan: result.rows[0]
    });
  } catch (err) {
    console.error('requestDeviceLoan error:', err);
    return res.status(500).json({ error: 'Failed to submit device loan request.' });
  }
}

// PATCH /api/device-loans/:id/status (Approve, Reject, Checkout, Return)
async function updateLoanStatus(req, res) {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve', 'reject', 'checkout', 'return'
    const staffId = req.user.user_id;

    const loanRes = await query('SELECT * FROM device_bookings WHERE loan_id = $1', [id]);
    if (loanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Loan record not found.' });
    }

    const loan = loanRes.rows[0];

    if (action === 'approve') {
      await query(
        `UPDATE device_bookings SET status = 'approved', approved_by = $1 WHERE loan_id = $2`,
        [staffId, id]
      );
      return res.json({ success: true, message: 'Device loan request approved.' });
    }

    if (action === 'reject') {
      await query(
        `UPDATE device_bookings SET status = 'rejected', approved_by = $1 WHERE loan_id = $2`,
        [staffId, id]
      );
      return res.json({ success: true, message: 'Device loan request rejected.' });
    }

    if (action === 'checkout') {
      await query(
        `UPDATE device_bookings 
         SET status = 'checked_out', checkout_time = CURRENT_TIMESTAMP, approved_by = COALESCE(approved_by, $1) 
         WHERE loan_id = $2`,
        [staffId, id]
      );
      // Mark device as checked_out
      await query(`UPDATE devices SET status = 'checked_out' WHERE device_id = $1`, [loan.device_id]);
      return res.json({ success: true, message: 'Device checked out successfully.' });
    }

    if (action === 'return') {
      await query(
        `UPDATE device_bookings 
         SET status = 'returned', actual_return_time = CURRENT_TIMESTAMP 
         WHERE loan_id = $1`,
        [id]
      );
      // Return device to available
      await query(`UPDATE devices SET status = 'available' WHERE device_id = $1`, [loan.device_id]);
      return res.json({ success: true, message: 'Device returned and marked available in inventory.' });
    }

    return res.status(400).json({ error: 'Invalid action. Must be approve, reject, checkout, or return.' });
  } catch (err) {
    console.error('updateLoanStatus error:', err);
    return res.status(500).json({ error: 'Failed to update device loan status.' });
  }
}

module.exports = {
  getDeviceLoans,
  requestDeviceLoan,
  updateLoanStatus
};
