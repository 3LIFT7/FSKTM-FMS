const { query, exec } = require('../config/db');
const { createUserNotification } = require('./notificationsController');

let loanAccessoriesColumnEnsured = false;

async function ensureLoanColumns() {
  if (loanAccessoriesColumnEnsured) return;
  try {
    await exec(`
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS accessories TEXT;
      ALTER TABLE device_bookings ADD COLUMN IF NOT EXISTS selected_accessories TEXT;
    `);
    loanAccessoriesColumnEnsured = true;
  } catch (err) {
    console.warn('ensureLoanColumns notice:', err.message);
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

function formatLoanRow(row) {
  if (!row) return row;
  return {
    ...row,
    selected_accessories: parseAccessories(row.selected_accessories),
    device_accessories: parseAccessories(row.device_accessories),
  };
}

// GET /api/device-loans/lecturers
async function getLecturers(req, res) {
  try {
    const result = await query("SELECT user_id, name, email FROM users WHERE LOWER(TRIM(role)) = 'lecturer' ORDER BY name");
    return res.json({ success: true, lecturers: result.rows });
  } catch (err) {
    console.error('getLecturers error:', err);
    return res.status(500).json({ error: 'Failed to load lecturer approvers.' });
  }
}

// GET /api/device-loans
async function getDeviceLoans(req, res) {
  try {
    await ensureLoanColumns();
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
        dl.selected_accessories,
        dl.lecturer_approver_id,
        dl.lecturer_approved_by,
        dl.pickup_location,
        dl.created_at,
        d.name AS device_name,
        d.category AS device_category,
        d.serial_number,
        d.specs AS device_specs,
        d.accessories AS device_accessories,
        u.name AS borrower_name,
        u.email AS borrower_email,
        u.matric_or_staff_id,
        app.name AS approver_name,
        lecturer.name AS lecturer_approver_name,
        lecturer_approver.name AS lecturer_approved_by_name,
        technician.name AS technician_approver_name,
        lecturer.email AS lecturer_approver_email,
        lecturer_approver.email AS lecturer_approved_by_email,
        technician.email AS technician_approver_email,
        u.role AS user_role,
        CASE 
          WHEN dl.status = 'checked_out' AND dl.expected_return_time < CURRENT_TIMESTAMP THEN TRUE
          ELSE FALSE
        END AS is_overdue
      FROM device_bookings dl
      JOIN devices d ON dl.device_id = d.device_id
      JOIN users u ON dl.user_id = u.user_id
      LEFT JOIN users app ON dl.approved_by = app.user_id
      LEFT JOIN users lecturer ON dl.lecturer_approver_id = lecturer.user_id
      LEFT JOIN users lecturer_approver ON dl.lecturer_approved_by = lecturer_approver.user_id
      LEFT JOIN users technician ON dl.approved_by = technician.user_id
      WHERE 1=1
    `;
    const params = [];

    // Lecturers see requests assigned to them plus their own borrowing history.
    if (currentUser.role === 'student') {
      params.push(currentUser.user_id);
      sql += ` AND dl.user_id = $${params.length}`;
    } else if (currentUser.role === 'lecturer') {
      params.push(currentUser.user_id);
      sql += ` AND (dl.user_id = $${params.length} OR dl.lecturer_approver_id = $${params.length})`;
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
    const loans = result.rows.map(formatLoanRow);
    return res.json({ success: true, count: loans.length, loans });
  } catch (err) {
    console.error('getDeviceLoans error:', err);
    return res.status(500).json({ error: 'Failed to retrieve device loans.' });
  }
}

// POST /api/device-loans (Student or Lecturer initiates loan)
async function requestDeviceLoan(req, res) {
  try {
    await ensureLoanColumns();
    const { device_id, expected_return_time, purpose, lecturer_approver_id, selected_accessories } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    if (userRole === 'student' && !lecturer_approver_id) {
      return res.status(400).json({ error: 'Select a registered lecturer to approve this request.' });
    }
    if (userRole === 'student') {
      const lecturerRes = await query('SELECT user_id FROM users WHERE user_id = $1 AND role = $2', [lecturer_approver_id, 'lecturer']);
      if (!lecturerRes.rows.length) return res.status(400).json({ error: 'Selected approver is not a registered lecturer.' });
    }

    if (!device_id || !expected_return_time || !purpose) {
      return res.status(400).json({ error: 'Device ID, expected return time, and purpose are required.' });
    }

    // Check device availability
    const devRes = await query(
      `SELECT d.device_id, d.name, d.status, d.location_id, d.accessories,
              COALESCE(d.is_loanable, TRUE) AS is_loanable,
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

    const initialStatus = userRole === 'student' ? 'pending_lecturer' : (requiresApproval ? 'pending_technician' : 'approved');
    const serializedSelectedAccessories = serializeAccessories(selected_accessories);

    const result = await query(
      `INSERT INTO device_bookings (device_id, user_id, expected_return_time, purpose, selected_accessories, status, lecturer_approver_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [device_id, userId, expected_return_time, purpose, serializedSelectedAccessories, initialStatus, lecturer_approver_id || null]
    );

    return res.status(201).json({
      success: true,
      message: userRole === 'student'
        ? 'Request sent to your selected lecturer for approval.'
        : requiresApproval ? 'Device booking request submitted successfully. Awaiting technician approval.' : 'Device booked successfully.',
      loan: formatLoanRow(result.rows[0])
    });
  } catch (err) {
    console.error('requestDeviceLoan error:', err);
    return res.status(500).json({ error: 'Failed to submit device loan request.' });
  }
}

// PATCH /api/device-loans/:id/status (Approve, Reject, Checkout, Return)
async function updateLoanStatus(req, res) {
  try {
    await ensureLoanColumns();
    const { id } = req.params;
    const { action, pickup_location } = req.body; // lecturer_approve, approve, reject, checkout, return
    const staffId = req.user.user_id;

    const loanRes = await query(
      `SELECT dl.*, d.name AS device_name
       FROM device_bookings dl JOIN devices d ON d.device_id = dl.device_id
       WHERE dl.loan_id = $1`,
      [id]
    );
    if (loanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Loan record not found.' });
    }

    const loan = loanRes.rows[0];
    const accList = parseAccessories(loan.selected_accessories);
    const accSuffix = accList.length > 0 ? ` (with accessories: ${accList.join(', ')})` : '';

    if (action === 'lecturer_approve' || (action === 'reject' && loan.status === 'pending_lecturer')) {
      if (req.user.role !== 'lecturer' || Number(loan.lecturer_approver_id) !== Number(staffId) || loan.status !== 'pending_lecturer') {
        return res.status(403).json({ error: 'Only the selected lecturer can review this request.' });
      }
      const nextStatus = action === 'lecturer_approve' ? 'pending_technician' : 'rejected';
      if (action === 'lecturer_approve') {
        await query(`UPDATE device_bookings SET status = $1, lecturer_approved_by = $2 WHERE loan_id = $3`, [nextStatus, staffId, id]);
        await createUserNotification({
          userId: loan.user_id,
          type: 'device_loan',
          title: 'Lecturer approved your device request',
          message: `${loan.device_name}${accSuffix} has been approved by your lecturer and sent to the technician for final approval.`,
          entityType: 'device_loan',
          entityId: id,
        });
      } else {
        await query(`UPDATE device_bookings SET status = $1 WHERE loan_id = $2`, [nextStatus, id]);
        await createUserNotification({
          userId: loan.user_id,
          type: 'device_loan',
          title: 'Device loan request rejected',
          message: `Your request to borrow ${loan.device_name}${accSuffix} was rejected by the selected lecturer.`,
          entityType: 'device_loan',
          entityId: id,
        });
      }
      return res.json({ success: true, message: action === 'lecturer_approve' ? 'Request approved and sent to the technician.' : 'Request rejected.' });
    }

    if (action === 'approve') {
      if (!['technician', 'manager'].includes(req.user.role) || !['pending_technician', 'pending'].includes(loan.status)) {
        return res.status(403).json({ error: 'This request is not awaiting technician approval.' });
      }
      if (!pickup_location?.trim()) {
        return res.status(400).json({ error: 'Enter a pickup location before approving this request.' });
      }
      await query(
        `UPDATE device_bookings SET status = 'approved', approved_by = $1, pickup_location = $2 WHERE loan_id = $3`,
        [staffId, pickup_location.trim(), id]
      );
      await createUserNotification({
        userId: loan.user_id,
        type: 'device_loan',
        title: 'Device loan request approved',
        message: `${loan.device_name}${accSuffix} is approved for pickup at ${pickup_location.trim()}.`,
        entityType: 'device_loan',
        entityId: id,
      });
      return res.json({ success: true, message: 'Device loan request approved.' });
    }

    if (action === 'reject') {
      if (!['technician', 'manager'].includes(req.user.role) || !['pending_technician', 'pending'].includes(loan.status)) {
        return res.status(403).json({ error: 'This request is not awaiting technician review.' });
      }
      await query(
        `UPDATE device_bookings SET status = 'rejected', approved_by = $1 WHERE loan_id = $2`,
        [staffId, id]
      );
      await createUserNotification({
        userId: loan.user_id,
        type: 'device_loan',
        title: 'Device loan request rejected',
        message: `Your request to borrow ${loan.device_name}${accSuffix} was rejected by the technician.`,
        entityType: 'device_loan',
        entityId: id,
      });
      return res.json({ success: true, message: 'Device loan request rejected.' });
    }

    if (action === 'checkout') {
      if (!['technician', 'manager'].includes(req.user.role) || loan.status !== 'approved') {
        return res.status(400).json({ error: 'Only approved loans can be checked out.' });
      }
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
      if (!['technician', 'manager'].includes(req.user.role) || loan.status !== 'checked_out') {
        return res.status(400).json({ error: 'Only checked out loans can be returned.' });
      }
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
  getLecturers,
  getDeviceLoans,
  requestDeviceLoan,
  updateLoanStatus
};
