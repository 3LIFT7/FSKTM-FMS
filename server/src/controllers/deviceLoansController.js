const { query, withTransaction } = require('../config/db');
const { createUserNotification } = require('./notificationsController');

const VALID_RETURN_CONDITIONS = new Set([
  'Excellent',
  'Good',
  'Fair / Minor Wear',
  'Fair',
  'Missing Accessory',
  'Missing accessory',
  'Damaged',
]);

const CONDITION_DEFAULT_RATING = {
  Excellent: 5,
  Good: 4,
  'Fair / Minor Wear': 3,
  Fair: 3,
  'Missing Accessory': 2,
  'Missing accessory': 2,
  Damaged: 1,
};

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

function formatLoanRow(row, isStaff = true) {
  if (!row) return row;
  const effectiveRating = row.return_rating ?? row.device_rating ?? null;
  const effectiveReview = row.return_notes ?? row.device_review ?? null;

  const formatted = {
    ...row,
    selected_accessories: parseAccessories(row.selected_accessories),
    device_accessories: parseAccessories(row.device_accessories),
    return_rating: isStaff ? effectiveRating : null,
    device_rating: isStaff ? effectiveRating : null,
    return_notes: isStaff ? effectiveReview : null,
    device_review: isStaff ? effectiveReview : null,
    return_condition: isStaff ? row.return_condition : null,
  };
  return formatted;
}

// GET /api/device-loans/lecturers
async function getLecturers(req, res) {
  try {
    const result = await query(
      "SELECT user_id, name, email FROM users WHERE LOWER(TRIM(role)) = 'lecturer' ORDER BY name"
    );
    return res.json({ success: true, lecturers: result.rows });
  } catch (err) {
    console.error('getLecturers error:', err);
    return res.status(500).json({ error: 'Failed to load lecturer approvers.' });
  }
}

// GET /api/device-loans
async function getDeviceLoans(req, res) {
  try {
    const { status, overdue, user_id } = req.query;
    const currentUser = req.user;
    const isStaff = ['technician', 'manager'].includes(currentUser.role);

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
        dl.return_rating,
        dl.return_condition,
        dl.return_notes,
        dl.device_rating,
        dl.device_review,
        dl.rated_at,
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
    const loans = result.rows.map((r) => formatLoanRow(r, isStaff));
    return res.json({ success: true, count: loans.length, loans });
  } catch (err) {
    console.error('getDeviceLoans error:', err);
    return res.status(500).json({ error: 'Failed to retrieve device loans.' });
  }
}

// POST /api/device-loans (Student or Lecturer initiates loan)
async function requestDeviceLoan(req, res) {
  try {
    const { device_id, expected_return_time, purpose, lecturer_approver_id, selected_accessories } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    if (!device_id || !expected_return_time || !purpose || !String(purpose).trim()) {
      return res.status(400).json({ error: 'Device ID, expected return time, and purpose are required.' });
    }

    const expectedReturnDate = new Date(expected_return_time);
    if (isNaN(expectedReturnDate.getTime())) {
      return res.status(400).json({ error: 'Invalid expected return date format.' });
    }
    if (expectedReturnDate <= new Date()) {
      return res.status(400).json({ error: 'Expected return time must be in the future.' });
    }

    if (userRole === 'student' && !lecturer_approver_id) {
      return res.status(400).json({ error: 'Select a registered lecturer to approve this request.' });
    }

    const txResult = await withTransaction(async (tx) => {
      if (userRole === 'student') {
        const lecturerRes = await tx.query(
          'SELECT user_id FROM users WHERE user_id = $1 AND role = $2',
          [lecturer_approver_id, 'lecturer']
        );
        if (!lecturerRes.rows.length) {
          const err = new Error('Selected approver is not a registered lecturer.');
          err.status = 400;
          throw err;
        }
      }

      // Lock device row to serialize concurrent loan requests for the same asset
      const devRes = await tx.query(
        `SELECT d.device_id, d.name, d.status, d.location_id, d.accessories,
                COALESCE(d.is_loanable, (d.location_id IS NULL)) AS is_loanable
         FROM devices d
         WHERE d.device_id = $1
         FOR UPDATE`,
        [device_id]
      );
      if (devRes.rows.length === 0) {
        const err = new Error('Device not found.');
        err.status = 404;
        throw err;
      }

      const device = devRes.rows[0];

      if (!device.is_loanable || device.location_id !== null) {
        const err = new Error(
          `Device "${device.name}" is Fixed in Lab / Room and cannot be borrowed individually.`
        );
        err.status = 403;
        throw err;
      }

      if (device.status !== 'available') {
        const err = new Error(
          `Device "${device.name}" is currently ${device.status.replace('_', ' ')} and cannot be booked.`
        );
        err.status = 400;
        err.deviceStatus = device.status;
        throw err;
      }

      // Check if this device already has an active approved, checked_out, or pending loan
      const activeLoanRes = await tx.query(
        `SELECT loan_id, user_id, status
         FROM device_bookings
         WHERE device_id = $1
           AND status IN ('pending', 'pending_lecturer', 'pending_technician', 'approved', 'checked_out')`,
        [device_id]
      );

      if (activeLoanRes.rows.length > 0) {
        const existing = activeLoanRes.rows[0];
        const err = new Error(
          Number(existing.user_id) === Number(userId)
            ? `You already have an active or pending loan request for "${device.name}".`
            : `Device "${device.name}" already has an active or pending loan reservation.`
        );
        err.status = 409;
        throw err;
      }

      const settingRes = await tx.query(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'device_booking_requires_approval'"
      );
      const requiresApproval = settingRes.rows.length > 0 ? settingRes.rows[0].setting_value === 'true' : true;

      const initialStatus =
        userRole === 'student'
          ? 'pending_lecturer'
          : requiresApproval
          ? 'pending_technician'
          : 'approved';
      const serializedSelectedAccessories = serializeAccessories(selected_accessories);

      const result = await tx.query(
        `INSERT INTO device_bookings (
           device_id, user_id, expected_return_time, purpose, selected_accessories, status, lecturer_approver_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          device_id,
          userId,
          expectedReturnDate.toISOString(),
          String(purpose).trim(),
          serializedSelectedAccessories,
          initialStatus,
          lecturer_approver_id || null,
        ]
      );

      return {
        loan: result.rows[0],
        requiresApproval,
      };
    });

    const isStaff = ['technician', 'manager'].includes(userRole);

    return res.status(201).json({
      success: true,
      message:
        userRole === 'student'
          ? 'Request sent to your selected lecturer for approval.'
          : txResult.requiresApproval
          ? 'Device booking request submitted successfully. Awaiting technician approval.'
          : 'Device booked successfully.',
      loan: formatLoanRow(txResult.loan, isStaff),
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        deviceStatus: err.deviceStatus,
      });
    }
    console.error('requestDeviceLoan error:', err);
    return res.status(500).json({ error: 'Failed to submit device loan request.' });
  }
}

// PATCH /api/device-loans/:id/status (lecturer_approve, approve, reject, checkout, return)
async function updateLoanStatus(req, res) {
  try {
    const { id } = req.params;
    const { action, pickup_location, return_condition, return_notes } = req.body;
    const staffId = req.user.user_id;
    const staffRole = req.user.role;

    const validActions = ['lecturer_approve', 'approve', 'reject', 'checkout', 'return'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Must be lecturer_approve, approve, reject, checkout, or return.',
      });
    }

    const txResult = await withTransaction(async (tx) => {
      const loanRes = await tx.query(
        `SELECT dl.*, d.name AS device_name, d.status AS current_device_status
         FROM device_bookings dl
         JOIN devices d ON d.device_id = dl.device_id
         WHERE dl.loan_id = $1
         FOR UPDATE`,
        [id]
      );
      if (loanRes.rows.length === 0) {
        const err = new Error('Loan record not found.');
        err.status = 404;
        throw err;
      }

      const loan = loanRes.rows[0];
      // Lock the device row as well
      const devLockRes = await tx.query(
        `SELECT device_id, name, status FROM devices WHERE device_id = $1 FOR UPDATE`,
        [loan.device_id]
      );
      const device = devLockRes.rows[0];

      const accList = parseAccessories(loan.selected_accessories);
      const accSuffix = accList.length > 0 ? ` (with accessories: ${accList.join(', ')})` : '';

      // 1. Lecturer step: lecturer_approve or reject while pending_lecturer
      if (action === 'lecturer_approve' || (action === 'reject' && loan.status === 'pending_lecturer')) {
        const isAssignedLecturer =
          staffRole === 'lecturer' && Number(loan.lecturer_approver_id) === Number(staffId);
        const isStaffOverride = ['technician', 'manager'].includes(staffRole) && action === 'reject';

        if ((!isAssignedLecturer && !isStaffOverride) || loan.status !== 'pending_lecturer') {
          const err = new Error('Only the selected lecturer can review this request.');
          err.status = 403;
          throw err;
        }

        const nextStatus = action === 'lecturer_approve' ? 'pending_technician' : 'rejected';
        if (action === 'lecturer_approve') {
          await tx.query(
            `UPDATE device_bookings SET status = $1, lecturer_approved_by = $2 WHERE loan_id = $3`,
            [nextStatus, staffId, id]
          );
          return {
            notify: {
              userId: loan.user_id,
              type: 'device_loan',
              title: 'Lecturer approved your device request',
              message: `${loan.device_name}${accSuffix} has been approved by your lecturer and sent to the technician for final approval.`,
              entityType: 'device_loan',
              entityId: id,
            },
            body: {
              success: true,
              message: 'Request approved and sent to the technician.',
            },
          };
        } else {
          await tx.query(`UPDATE device_bookings SET status = $1 WHERE loan_id = $2`, [nextStatus, id]);
          return {
            notify: {
              userId: loan.user_id,
              type: 'device_loan',
              title: 'Device loan request rejected',
              message: `Your request to borrow ${loan.device_name}${accSuffix} was rejected.`,
              entityType: 'device_loan',
              entityId: id,
            },
            body: {
              success: true,
              message: 'Request rejected.',
            },
          };
        }
      }

      // All subsequent actions require technician or manager role
      if (!['technician', 'manager'].includes(staffRole)) {
        const err = new Error('Technician or Lab Manager privileges required for this action.');
        err.status = 403;
        throw err;
      }

      // 2. Technician approval
      if (action === 'approve') {
        if (!['pending_technician', 'pending'].includes(loan.status)) {
          const err = new Error('This request is not awaiting technician approval.');
          err.status = 400;
          throw err;
        }
        if (!pickup_location?.trim()) {
          const err = new Error('Enter a pickup location before approving this request.');
          err.status = 400;
          throw err;
        }
        if (device.status !== 'available') {
          const err = new Error(
            `Cannot approve loan: Device "${device.name}" is currently ${device.status.replace('_', ' ')}.`
          );
          err.status = 409;
          throw err;
        }

        // Ensure no other loan for this device is already approved or checked_out
        const competingLoan = await tx.query(
          `SELECT loan_id FROM device_bookings
           WHERE device_id = $1 AND loan_id != $2 AND status IN ('approved', 'checked_out')`,
          [loan.device_id, id]
        );
        if (competingLoan.rows.length > 0) {
          const err = new Error(
            `Cannot approve loan: Another borrower already has an approved or checked-out loan for "${device.name}".`
          );
          err.status = 409;
          throw err;
        }

        await tx.query(
          `UPDATE device_bookings SET status = 'approved', approved_by = $1, pickup_location = $2 WHERE loan_id = $3`,
          [staffId, pickup_location.trim(), id]
        );

        return {
          notify: {
            userId: loan.user_id,
            type: 'device_loan',
            title: 'Device loan request approved',
            message: `Your request for ${loan.device_name}${accSuffix} is approved. Pickup location: ${pickup_location.trim()}.`,
            entityType: 'device_loan',
            entityId: id,
          },
          body: { success: true, message: 'Device loan request approved.' },
        };
      }

      // 3. Technician reject
      if (action === 'reject') {
        if (!['pending_technician', 'pending', 'approved'].includes(loan.status)) {
          const err = new Error('This request cannot be rejected in its current state.');
          err.status = 400;
          throw err;
        }
        await tx.query(
          `UPDATE device_bookings SET status = 'rejected', approved_by = $1 WHERE loan_id = $2`,
          [staffId, id]
        );
        return {
          notify: {
            userId: loan.user_id,
            type: 'device_loan',
            title: 'Device loan request rejected',
            message: `Your request to borrow ${loan.device_name}${accSuffix} was rejected by the technician.`,
            entityType: 'device_loan',
            entityId: id,
          },
          body: { success: true, message: 'Device loan request rejected.' },
        };
      }

      // 4. Checkout
      if (action === 'checkout') {
        if (loan.status === 'checked_out') {
          const err = new Error('This loan is already checked out.');
          err.status = 409;
          throw err;
        }
        if (loan.status !== 'approved') {
          const err = new Error('Only approved loans can be checked out.');
          err.status = 400;
          throw err;
        }
        if (device.status !== 'available') {
          const err = new Error(
            `Cannot check out device: "${device.name}" is currently ${device.status.replace('_', ' ')}.`
          );
          err.status = 409;
          throw err;
        }

        const otherCheckout = await tx.query(
          `SELECT loan_id FROM device_bookings
           WHERE device_id = $1 AND loan_id != $2 AND status = 'checked_out'`,
          [loan.device_id, id]
        );
        if (otherCheckout.rows.length > 0) {
          const err = new Error(`Device "${device.name}" is already checked out on another loan.`);
          err.status = 409;
          throw err;
        }

        await tx.query(
          `UPDATE device_bookings
           SET status = 'checked_out', checkout_time = CURRENT_TIMESTAMP, approved_by = COALESCE(approved_by, $1)
           WHERE loan_id = $2`,
          [staffId, id]
        );
        await tx.query(`UPDATE devices SET status = 'checked_out' WHERE device_id = $1`, [loan.device_id]);

        return {
          body: { success: true, message: 'Device checked out successfully.' },
        };
      }

      // 5. Return
      if (action === 'return') {
        if (loan.status === 'returned') {
          const err = new Error('This device loan has already been returned.');
          err.status = 400;
          throw err;
        }
        if (loan.status !== 'checked_out') {
          const err = new Error('Only checked out loans can be returned.');
          err.status = 400;
          throw err;
        }

        const condVal = return_condition ? String(return_condition).trim() : 'Excellent';
        if (return_condition && !VALID_RETURN_CONDITIONS.has(condVal)) {
          const err = new Error('Invalid return condition value.');
          err.status = 400;
          throw err;
        }

        const notesVal = return_notes ? String(return_notes).trim() : null;

        await tx.query(
          `UPDATE device_bookings
           SET status = 'returned',
               actual_return_time = CURRENT_TIMESTAMP,
               return_condition = COALESCE($2, return_condition),
               return_notes = COALESCE($3, return_notes),
               device_review = COALESCE($3, device_review)
           WHERE loan_id = $1`,
          [id, condVal, notesVal]
        );

        // Verify no other active checked_out loan exists for this device before marking it available
        const remainingCheckouts = await tx.query(
          `SELECT COUNT(*)::int AS cnt FROM device_bookings
           WHERE device_id = $1 AND status = 'checked_out' AND loan_id != $2`,
          [loan.device_id, id]
        );

        let nextDeviceStatus = 'available';
        if (condVal === 'Damaged') {
          nextDeviceStatus = 'maintenance';
        } else if (remainingCheckouts.rows[0].cnt > 0) {
          nextDeviceStatus = 'checked_out';
        }

        await tx.query(`UPDATE devices SET status = $1 WHERE device_id = $2`, [nextDeviceStatus, loan.device_id]);

        return {
          notify: {
            userId: loan.user_id,
            type: 'device_loan',
            title: 'Device return confirmed',
            message: `${loan.device_name}${accSuffix} has been returned and received by the technician.`,
            entityType: 'device_loan',
            entityId: id,
          },
          body: {
            success: true,
            message: `Device returned and marked ${nextDeviceStatus} in inventory.`,
          },
        };
      }
    });

    if (txResult.notify) {
      await createUserNotification(txResult.notify);
    }

    return res.json(txResult.body);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('updateLoanStatus error:', err);
    return res.status(500).json({ error: 'Failed to update device loan status.' });
  }
}

// POST /api/device-loans/:id/rating (Technician or Lab Manager rates/updates device after return)
async function rateReturnedLoan(req, res) {
  try {
    const { id } = req.params;
    const { rating, return_rating, review, return_notes, device_review, return_condition } = req.body;
    const currentUser = req.user;

    if (!['technician', 'manager'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only technicians and lab managers can rate returned devices.' });
    }

    const cleanCondition = return_condition ? String(return_condition).trim() : null;
    if (cleanCondition && !VALID_RETURN_CONDITIONS.has(cleanCondition)) {
      return res.status(400).json({ error: 'Invalid return condition specified.' });
    }

    const rawRating = rating ?? return_rating ?? (cleanCondition ? CONDITION_DEFAULT_RATING[cleanCondition] : null);
    const numRating = parseInt(rawRating, 10);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Please select a valid star rating between 1 and 5.' });
    }

    const loanRes = await query(
      `SELECT dl.*, d.name AS device_name
       FROM device_bookings dl
       JOIN devices d ON d.device_id = dl.device_id
       WHERE dl.loan_id = $1`,
      [id]
    );
    if (loanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Loan record not found.' });
    }

    const loan = loanRes.rows[0];
    if (loan.status !== 'returned') {
      return res.status(400).json({
        error: 'This device can only be rated after it has been returned and received by the technician.',
      });
    }

    const cleanReview = [review, return_notes, device_review].find((v) => v !== undefined && v !== null);
    const trimmedReview = cleanReview !== undefined && cleanReview !== null ? String(cleanReview).trim() : null;

    await query(
      `UPDATE device_bookings
       SET return_rating = $1,
           device_rating = $1,
           return_condition = COALESCE($2, return_condition),
           return_notes = COALESCE($3, return_notes),
           device_review = COALESCE($3, device_review),
           rated_at = CURRENT_TIMESTAMP
       WHERE loan_id = $4`,
      [numRating, cleanCondition, trimmedReview, id]
    );

    const updatedRes = await query(`SELECT * FROM device_bookings WHERE loan_id = $1`, [id]);

    return res.json({
      success: true,
      message: 'Device rating submitted successfully!',
      loan: formatLoanRow(updatedRes.rows[0], true),
    });
  } catch (err) {
    console.error('rateReturnedLoan error:', err);
    return res.status(500).json({ error: 'Failed to submit device rating.' });
  }
}

module.exports = {
  getLecturers,
  getDeviceLoans,
  requestDeviceLoan,
  updateLoanStatus,
  rateReturnedLoan,
};
