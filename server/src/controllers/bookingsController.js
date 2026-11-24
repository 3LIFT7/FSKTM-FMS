const { query, withTransaction } = require('../config/db');
const { createUserNotification } = require('./notificationsController');

function parseHHMMToMinutes(hhmm, fallbackMinutes) {
  if (!hhmm || typeof hhmm !== 'string') return fallbackMinutes;
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallbackMinutes;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

async function getBookingPolicySettings(dbOrTx = { query }) {
  const res = await dbOrTx.query(
    `SELECT setting_key, setting_value
     FROM system_settings
     WHERE setting_key IN ('operating_hours_start', 'operating_hours_end', 'max_booking_duration_hours')`
  );
  const map = {
    operating_hours_start: '08:00',
    operating_hours_end: '20:00',
    max_booking_duration_hours: '4',
  };
  res.rows.forEach((r) => {
    map[r.setting_key] = r.setting_value;
  });

  const maxHours = parseFloat(map.max_booking_duration_hours);
  return {
    startStr: map.operating_hours_start,
    endStr: map.operating_hours_end,
    startMinutes: parseHHMMToMinutes(map.operating_hours_start, 8 * 60),
    endMinutes: parseHHMMToMinutes(map.operating_hours_end, 20 * 60),
    maxDurationHours: Number.isFinite(maxHours) && maxHours > 0 ? maxHours : 4,
  };
}

function sanitizeBookingForRequester(row, currentUser) {
  const isStaff = Boolean(currentUser && ['technician', 'manager'].includes(currentUser.role));
  const isOwner = Boolean(currentUser && Number(currentUser.user_id) === Number(row.user_id));

  if (isStaff || isOwner) {
    return row;
  }

  // Public or other-user view: strip personal identifiers (email, matric_or_staff_id, user_id, lecturer_name, etc.)
  return {
    booking_id: row.booking_id,
    location_id: row.location_id,
    start_time: row.start_time,
    end_time: row.end_time,
    purpose: row.purpose,
    is_recurring: row.is_recurring,
    recurrence_pattern: row.recurrence_pattern,
    recurrence_group_id: row.recurrence_group_id,
    series_status: row.series_status,
    course_id: row.course_id,
    course_name: row.course_name,
    status: row.status,
    created_at: row.created_at,
    location_name: row.location_name,
    location_code: row.location_code,
    location_floor: row.location_floor,
    location_capacity: row.location_capacity,
    location_status: row.location_status,
  };
}

// GET /api/bookings/lecturers
async function getBookingLecturers(req, res) {
  try {
    const result = await query(
      "SELECT user_id, name, email FROM users WHERE LOWER(TRIM(role)) = 'lecturer' ORDER BY name"
    );
    return res.json({ success: true, lecturers: result.rows });
  } catch (err) {
    console.error('getBookingLecturers error:', err);
    return res.status(500).json({ error: 'Failed to load lecturers.' });
  }
}

// GET /api/bookings
async function getBookings(req, res) {
  try {
    const { startDate, endDate, location_id, floor, include_maintenance, status, user_id } = req.query;
    const currentUser = req.user || null;
    const isStaff = Boolean(currentUser && ['technician', 'manager'].includes(currentUser.role));

    let sql = `
      SELECT 
        b.booking_id,
        b.location_id,
        b.user_id,
        b.start_time,
        b.end_time,
        b.purpose,
        b.is_recurring,
        b.recurrence_pattern,
        b.recurrence_group_id,
        COALESCE(b.series_status, 'active') AS series_status,
        b.course_id,
        b.course_name,
        b.lecturer_name,
        b.checked_in_at,
        b.attendance_status,
        b.attendance_notes,
        COALESCE(b.status, 'approved') AS status,
        b.approved_by,
        b.rejection_reason,
        b.created_at,
        l.name AS location_name,
        l.code AS location_code,
        l.floor AS location_floor,
        l.capacity AS location_capacity,
        l.status AS location_status,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        u.matric_or_staff_id,
        app.name AS approver_name
      FROM location_bookings b
      JOIN locations l ON b.location_id = l.location_id
      JOIN users u ON b.user_id = u.user_id
      LEFT JOIN users app ON b.approved_by = app.user_id
      WHERE 1=1
    `;
    const params = [];

    if (include_maintenance !== 'true' || !isStaff) {
      sql += ` AND l.status != 'maintenance'`;
    }

    if (location_id) {
      params.push(location_id);
      sql += ` AND b.location_id = $${params.length}`;
    }

    if (floor) {
      params.push(floor);
      sql += ` AND l.floor = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      sql += ` AND b.end_time >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      sql += ` AND b.start_time <= $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND b.status = $${params.length}`;
    }

    if (user_id) {
      // Non-staff can only filter by their own user_id
      if (!isStaff && (!currentUser || Number(user_id) !== Number(currentUser.user_id))) {
        return res.status(403).json({ error: 'Not authorized to query bookings for another user.' });
      }
      params.push(user_id);
      sql += ` AND b.user_id = $${params.length}`;
    }

    sql += ' ORDER BY b.start_time DESC, b.created_at DESC';

    const result = await query(sql, params);
    const bookings = result.rows.map((row) => sanitizeBookingForRequester(row, currentUser));
    return res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error('getBookings error:', err);
    return res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
}

// POST /api/bookings
async function createBooking(req, res) {
  try {
    const {
      location_id,
      start_time,
      end_time,
      purpose,
      is_recurring,
      weeks = 14,
      recurrence_day,
      course_id,
      course_name,
      lecturer_name,
    } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    if (!location_id || !start_time || !end_time || !purpose || !String(purpose).trim()) {
      return res.status(400).json({ error: 'Location, start time, end time, and purpose are required.' });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date format.' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    // Prevent overnight / multi-day single bookings
    if (
      start.getFullYear() !== end.getFullYear() ||
      start.getMonth() !== end.getMonth() ||
      start.getDate() !== end.getDate()
    ) {
      return res.status(400).json({
        error: 'Overnight or multi-day bookings are not permitted. Start and end times must be on the same day.',
      });
    }

    // Recurring bookings policy: only lecturers and managers can book recurring
    if (userRole === 'student' && is_recurring) {
      return res.status(403).json({
        error: 'Recurring bookings are reserved for Academic Lecturers and Lab Managers.',
      });
    }

    const isStaff = ['technician', 'manager'].includes(userRole);
    if (!isStaff && (!course_id?.trim() || !course_name?.trim())) {
      return res.status(400).json({
        error: 'Course code and course name are required for student and lecturer bookings.',
      });
    }

    // Enforce system settings (operating hours & max duration)
    const policy = await getBookingPolicySettings();
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (durationHours > policy.maxDurationHours) {
      return res.status(400).json({
        error: `Single booking duration (${durationHours.toFixed(1)} hrs) cannot exceed the maximum configured limit of ${policy.maxDurationHours} hour(s).`,
        code: 'MAX_DURATION_EXCEEDED',
      });
    }

    const reqStartMinutes = start.getHours() * 60 + start.getMinutes();
    const reqEndMinutes = end.getHours() * 60 + end.getMinutes();

    if (reqStartMinutes < policy.startMinutes || reqEndMinutes > policy.endMinutes) {
      return res.status(400).json({
        error: `Booking time must be within facility operating hours (${policy.startStr} – ${policy.endStr}).`,
        code: 'OUTSIDE_OPERATING_HOURS',
      });
    }

    const initialStatus = isStaff ? 'approved' : 'pending';
    const approvedBy = isStaff ? userId : null;
    const numberOfWeeks = is_recurring ? Math.min(Math.max(parseInt(weeks, 10) || 14, 1), 18) : 1;
    const recurrenceGroupId = is_recurring ? `REC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : null;

    // Atomic transaction with row-level lock on locations to prevent concurrent overlapping bookings
    const txResult = await withTransaction(async (tx) => {
      const locRes = await tx.query(
        "SELECT location_id, name, code, category, status FROM locations WHERE location_id = $1 AND UPPER(code) <> 'RMP' FOR UPDATE",
        [location_id]
      );
      if (locRes.rows.length === 0) {
        const err = new Error('Selected location does not exist.');
        err.status = 404;
        throw err;
      }

      const location = locRes.rows[0];
      if (location.status === 'maintenance') {
        const err = new Error(
          `Cannot book ${location.name} (${location.code}): This facility is currently UNDER MAINTENANCE and cannot be reserved.`
        );
        err.status = 400;
        err.code = 'ROOM_UNDER_MAINTENANCE';
        throw err;
      }

      const conflicts = [];

      for (let i = 0; i < numberOfWeeks; i++) {
        const slotStart = new Date(start);
        slotStart.setDate(slotStart.getDate() + i * 7);
        const slotEnd = new Date(end);
        slotEnd.setDate(slotEnd.getDate() + i * 7);

        // 1. Room overlap check against active pending or approved bookings
        const conflictRes = await tx.query(
          `SELECT b.booking_id, b.start_time, b.end_time, b.purpose, b.status, u.name as booked_by
           FROM location_bookings b
           JOIN users u ON b.user_id = u.user_id
           WHERE b.location_id = $1
             AND b.status IN ('pending', 'approved')
             AND b.start_time < $2
             AND b.end_time > $3`,
          [location_id, slotEnd.toISOString(), slotStart.toISOString()]
        );

        if (conflictRes.rows.length > 0) {
          conflicts.push({
            week: i + 1,
            date: slotStart.toISOString().split('T')[0],
            type: 'room_clash',
            conflictingBooking: conflictRes.rows[0],
          });
        }

        // 2. User schedule clash check
        const lecturerClashRes = await tx.query(
          `SELECT b.booking_id, b.start_time, b.end_time, b.purpose, b.status, l.name as loc_name
           FROM location_bookings b
           JOIN locations l ON b.location_id = l.location_id
           WHERE b.user_id = $1
             AND b.status IN ('pending', 'approved')
             AND b.start_time < $2
             AND b.end_time > $3`,
          [userId, slotEnd.toISOString(), slotStart.toISOString()]
        );

        if (lecturerClashRes.rows.length > 0) {
          conflicts.push({
            week: i + 1,
            date: slotStart.toISOString().split('T')[0],
            type: 'lecturer_clash',
            conflictingBooking: lecturerClashRes.rows[0],
          });
        }
      }

      if (conflicts.length > 0) {
        const c = conflicts[0].conflictingBooking;
        const isLecturerClash = conflicts[0].type === 'lecturer_clash';
        const cStatusText = c.status === 'approved' ? 'already scheduled' : 'pending approval';

        const errorMsg = isLecturerClash
          ? `Schedule time clash detected: You already have another class or booking (${c.purpose} in ${c.loc_name}) scheduled during this time.`
          : `Time slot conflict detected for ${location.name}. This time slot is ${cStatusText}.`;

        const err = new Error(errorMsg);
        err.status = 409;
        err.code = 'SCHEDULE_CONFLICT';
        err.conflicts = conflicts;
        throw err;
      }

      const createdBookings = [];
      const resolvedLecturerName = lecturer_name
        ? String(lecturer_name).trim()
        : userRole === 'lecturer'
        ? req.user.name
        : null;

      for (let i = 0; i < numberOfWeeks; i++) {
        const slotStart = new Date(start);
        slotStart.setDate(slotStart.getDate() + i * 7);
        const slotEnd = new Date(end);
        slotEnd.setDate(slotEnd.getDate() + i * 7);

        const pattern = is_recurring ? `WEEKLY:${recurrence_day || 'WEEKDAY'}:W${i + 1}` : null;

        const insertRes = await tx.query(
          `INSERT INTO location_bookings (
             location_id, user_id, start_time, end_time, purpose,
             is_recurring, recurrence_pattern, recurrence_group_id, series_status,
             course_id, course_name, lecturer_name, status, approved_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING booking_id, location_id, user_id, start_time, end_time, purpose, course_id, course_name, lecturer_name, status, recurrence_group_id, series_status;`,
          [
            location_id,
            userId,
            slotStart.toISOString(),
            slotEnd.toISOString(),
            String(purpose).trim(),
            Boolean(is_recurring),
            pattern,
            recurrenceGroupId,
            'active',
            course_id ? course_id.toUpperCase().trim() : null,
            course_name ? course_name.trim() : null,
            resolvedLecturerName,
            initialStatus,
            approvedBy,
          ]
        );
        createdBookings.push(insertRes.rows[0]);
      }

      return { createdBookings };
    });

    const confirmationMsg =
      initialStatus === 'pending'
        ? is_recurring
          ? `Semester recurring reservation submitted (${numberOfWeeks} weeks)! Sent as 1 request pending technician approval.`
          : 'Room booking request submitted successfully! Your request is pending Admin approval and the slot is held.'
        : is_recurring
        ? `Created ${txResult.createdBookings.length} weekly recurring bookings.`
        : 'Booking confirmed successfully.';

    return res.status(201).json({
      success: true,
      requires_approval: initialStatus === 'pending',
      status: initialStatus,
      message: confirmationMsg,
      recurrence_group_id: recurrenceGroupId,
      booking: txResult.createdBookings[0],
      bookings: txResult.createdBookings,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        code: err.code,
        conflicts: err.conflicts,
      });
    }
    console.error('createBooking error:', err);
    return res.status(500).json({ error: 'Failed to create room booking.' });
  }
}

// PATCH /api/bookings/:id/status (Approve, Reject, Cancel)
async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // 'approve', 'reject', 'cancel'
    const staffId = req.user.user_id;
    const staffRole = req.user.role;

    if (!['approve', 'reject', 'cancel'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve, reject, or cancel.' });
    }

    const txResult = await withTransaction(async (tx) => {
      const existingRes = await tx.query(
        `SELECT b.*, l.name AS location_name, l.status AS location_status, u.name AS user_name, u.email AS user_email
         FROM location_bookings b
         JOIN locations l ON b.location_id = l.location_id
         JOIN users u ON b.user_id = u.user_id
         WHERE b.booking_id = $1`,
        [id]
      );

      if (existingRes.rows.length === 0) {
        const err = new Error('Booking record not found.');
        err.status = 404;
        throw err;
      }

      const booking = existingRes.rows[0];

      // User cancelling their own booking or staff cancelling
      if (action === 'cancel') {
        if (Number(booking.user_id) !== Number(staffId) && !['technician', 'manager'].includes(staffRole)) {
          const err = new Error('You are not authorized to cancel this booking.');
          err.status = 403;
          throw err;
        }

        await tx.query(`UPDATE location_bookings SET status = 'cancelled' WHERE booking_id = $1`, [id]);
        return {
          status: 200,
          body: { success: true, message: 'Room booking cancelled successfully.' },
        };
      }

      // Only technician or manager can approve or reject
      if (!['technician', 'manager'].includes(staffRole)) {
        const err = new Error('Administrator privileges required to approve or reject bookings.');
        err.status = 403;
        throw err;
      }

      // Prevent users from approving their own pending bookings
      if (action === 'approve' && Number(booking.user_id) === Number(staffId)) {
        const err = new Error('Self-approval is not permitted. Another authorized staff member must approve this booking.');
        err.status = 403;
        throw err;
      }

      if (action === 'approve') {
        // Lock the location row during approval check
        await tx.query('SELECT location_id FROM locations WHERE location_id = $1 FOR UPDATE', [booking.location_id]);

        if (booking.location_status === 'maintenance') {
          const err = new Error(`Cannot approve booking: ${booking.location_name} is currently under maintenance.`);
          err.status = 400;
          throw err;
        }

        if (booking.recurrence_group_id) {
          const seriesBookings = await tx.query(
            `SELECT booking_id, start_time, end_time, purpose, status
             FROM location_bookings
             WHERE recurrence_group_id = $1 AND status != 'cancelled'`,
            [booking.recurrence_group_id]
          );

          for (const sb of seriesBookings.rows) {
            const conflictCheck = await tx.query(
              `SELECT booking_id, purpose, start_time, end_time
               FROM location_bookings
               WHERE location_id = $1
                 AND (recurrence_group_id IS NULL OR recurrence_group_id != $2)
                 AND status = 'approved'
                 AND start_time < $3
                 AND end_time > $4`,
              [booking.location_id, booking.recurrence_group_id, sb.end_time, sb.start_time]
            );

            if (conflictCheck.rows.length > 0) {
              const err = new Error(
                `Cannot approve semester series: Slot on ${new Date(sb.start_time).toLocaleDateString()} conflicts with an already approved booking ("${conflictCheck.rows[0].purpose}").`
              );
              err.status = 409;
              err.conflictingBooking = conflictCheck.rows[0];
              throw err;
            }

            const lecturerConflictCheck = await tx.query(
              `SELECT b.booking_id, b.purpose, b.start_time, b.end_time, l.name as loc_name
               FROM location_bookings b
               JOIN locations l ON b.location_id = l.location_id
               WHERE b.user_id = $1
                 AND (b.recurrence_group_id IS NULL OR b.recurrence_group_id != $2)
                 AND b.status = 'approved'
                 AND b.start_time < $3
                 AND b.end_time > $4`,
              [booking.user_id, booking.recurrence_group_id, sb.end_time, sb.start_time]
            );

            if (lecturerConflictCheck.rows.length > 0) {
              const err = new Error(
                `Cannot approve semester series: User already has an approved session ("${lecturerConflictCheck.rows[0].purpose}" in ${lecturerConflictCheck.rows[0].loc_name}) on ${new Date(sb.start_time).toLocaleDateString()}.`
              );
              err.status = 409;
              err.conflictingBooking = lecturerConflictCheck.rows[0];
              throw err;
            }
          }

          const updateRes = await tx.query(
            `UPDATE location_bookings
             SET status = 'approved', approved_by = $1, rejection_reason = NULL
             WHERE recurrence_group_id = $2 AND status != 'cancelled'
             RETURNING *`,
            [staffId, booking.recurrence_group_id]
          );

          return {
            status: 200,
            notify: booking.status !== 'approved'
              ? {
                  userId: booking.user_id,
                  type: 'room_booking',
                  title: 'Room booking approved',
                  message: `Your recurring booking for ${booking.location_name} was approved (${updateRes.rows.length} sessions).`,
                  entityType: 'room_booking_series',
                  entityId: booking.recurrence_group_id,
                }
              : null,
            body: {
              success: true,
              message: `Entire semester recurring reservation (${updateRes.rows.length} weeks) approved successfully!`,
              count: updateRes.rows.length,
              booking: updateRes.rows[0],
            },
          };
        }

        // Single booking collision check
        const conflictCheck = await tx.query(
          `SELECT booking_id, purpose, start_time, end_time
           FROM location_bookings
           WHERE location_id = $1
             AND booking_id != $2
             AND status = 'approved'
             AND start_time < $3
             AND end_time > $4`,
          [booking.location_id, id, booking.end_time, booking.start_time]
        );

        if (conflictCheck.rows.length > 0) {
          const err = new Error(
            `Cannot approve: This time slot conflicts with an already approved booking ("${conflictCheck.rows[0].purpose}").`
          );
          err.status = 409;
          err.conflictingBooking = conflictCheck.rows[0];
          throw err;
        }

        const lecturerConflictCheck = await tx.query(
          `SELECT b.booking_id, b.purpose, b.start_time, b.end_time, l.name as loc_name
           FROM location_bookings b
           JOIN locations l ON b.location_id = l.location_id
           WHERE b.user_id = $1
             AND b.booking_id != $2
             AND b.status = 'approved'
             AND b.start_time < $3
             AND b.end_time > $4`,
          [booking.user_id, id, booking.end_time, booking.start_time]
        );

        if (lecturerConflictCheck.rows.length > 0) {
          const err = new Error(
            `Cannot approve: User already has an approved session ("${lecturerConflictCheck.rows[0].purpose}" in ${lecturerConflictCheck.rows[0].loc_name}) at this time.`
          );
          err.status = 409;
          err.conflictingBooking = lecturerConflictCheck.rows[0];
          throw err;
        }

        const updateRes = await tx.query(
          `UPDATE location_bookings
           SET status = 'approved', approved_by = $1, rejection_reason = NULL
           WHERE booking_id = $2
           RETURNING *`,
          [staffId, id]
        );

        return {
          status: 200,
          notify: booking.status !== 'approved'
            ? {
                userId: booking.user_id,
                type: 'room_booking',
                title: 'Room booking approved',
                message: `Your booking for ${booking.location_name} was approved.`,
                entityType: 'room_booking',
                entityId: id,
              }
            : null,
          body: {
            success: true,
            message: `Booking request for ${booking.location_name} approved successfully.`,
            booking: updateRes.rows[0],
          },
        };
      }

      // action === 'reject'
      if (booking.recurrence_group_id) {
        const updateRes = await tx.query(
          `UPDATE location_bookings
           SET status = 'rejected', approved_by = $1, rejection_reason = $2
           WHERE recurrence_group_id = $3
           RETURNING *`,
          [staffId, reason || 'Semester recurring request was not approved by administration.', booking.recurrence_group_id]
        );

        return {
          status: 200,
          notify: booking.status !== 'rejected'
            ? {
                userId: booking.user_id,
                type: 'room_booking',
                title: 'Room booking rejected',
                message: `Your recurring booking for ${booking.location_name} was rejected (${updateRes.rows.length} sessions). Reason: ${reason || 'No reason provided.'}`,
                entityType: 'room_booking_series',
                entityId: booking.recurrence_group_id,
              }
            : null,
          body: {
            success: true,
            message: `Entire semester recurring reservation (${updateRes.rows.length} weeks) rejected. The time slots are released.`,
            count: updateRes.rows.length,
            booking: updateRes.rows[0],
          },
        };
      }

      const updateRes = await tx.query(
        `UPDATE location_bookings
         SET status = 'rejected', approved_by = $1, rejection_reason = $2
         WHERE booking_id = $3
         RETURNING *`,
        [staffId, reason || 'Booking request was not approved by administration.', id]
      );

      return {
        status: 200,
        notify: booking.status !== 'rejected'
          ? {
              userId: booking.user_id,
              type: 'room_booking',
              title: 'Room booking rejected',
              message: `Your booking for ${booking.location_name} was rejected. Reason: ${reason || 'No reason provided.'}`,
              entityType: 'room_booking',
              entityId: id,
            }
          : null,
        body: {
          success: true,
          message: `Booking request for ${booking.location_name} rejected. The time slot is now released.`,
          booking: updateRes.rows[0],
        },
      };
    });

    if (txResult.notify) {
      await createUserNotification(txResult.notify);
    }

    return res.status(txResult.status).json(txResult.body);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        conflictingBooking: err.conflictingBooking,
      });
    }
    console.error('updateBookingStatus error:', err);
    return res.status(500).json({ error: 'Failed to update booking status.' });
  }
}

// DELETE /api/bookings/:id
// Soft-cancels the booking (status = 'cancelled') to preserve historical records while releasing the time slot
async function deleteBooking(req, res) {
  try {
    const { id } = req.params;
    const { series } = req.query;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    const existing = await query(
      'SELECT booking_id, user_id, recurrence_group_id, status FROM location_bookings WHERE booking_id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = existing.rows[0];
    if (Number(booking.user_id) !== Number(userId) && !['technician', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
    }

    if (series === 'true' && booking.recurrence_group_id) {
      const cancelRes = await query(
        `UPDATE location_bookings
         SET status = 'cancelled', series_status = 'cancelled', rejection_reason = 'Booking series cancelled by user'
         WHERE recurrence_group_id = $1
         RETURNING booking_id`,
        [booking.recurrence_group_id]
      );
      return res.json({
        success: true,
        message: `All ${cancelRes.rows.length} bookings in the recurring series cancelled successfully.`,
      });
    }

    await query(
      `UPDATE location_bookings
       SET status = 'cancelled', rejection_reason = 'Booking cancelled by user'
       WHERE booking_id = $1`,
      [id]
    );
    return res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error('deleteBooking error:', err);
    return res.status(500).json({ error: 'Failed to cancel booking.' });
  }
}

// PATCH /api/bookings/recurring/:groupId/status
async function toggleRecurringSeries(req, res) {
  try {
    const { groupId } = req.params;
    const { action } = req.body; // 'activate' | 'pause' | 'cancel'
    const userId = req.user.user_id;
    const userRole = req.user.role;

    if (!['activate', 'pause', 'cancel'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be activate, pause, or cancel.' });
    }

    const txResult = await withTransaction(async (tx) => {
      const seriesRes = await tx.query(
        `SELECT b.*, l.name as location_name
         FROM location_bookings b
         JOIN locations l ON b.location_id = l.location_id
         WHERE b.recurrence_group_id = $1
         ORDER BY b.start_time ASC`,
        [groupId]
      );

      if (seriesRes.rows.length === 0) {
        const err = new Error('Recurring booking series not found.');
        err.status = 404;
        throw err;
      }

      const firstBooking = seriesRes.rows[0];
      const isStaff = ['technician', 'manager'].includes(userRole);
      if (Number(firstBooking.user_id) !== Number(userId) && !isStaff) {
        const err = new Error('You are not authorized to modify this recurring series.');
        err.status = 403;
        throw err;
      }

      const now = new Date().toISOString();

      if (action === 'pause') {
        await tx.query(
          `UPDATE location_bookings
           SET status = 'cancelled', series_status = 'paused', rejection_reason = 'Series paused by lecturer'
           WHERE recurrence_group_id = $1
             AND start_time > $2
             AND status IN ('pending', 'approved')`,
          [groupId, now]
        );
        await tx.query(`UPDATE location_bookings SET series_status = 'paused' WHERE recurrence_group_id = $1`, [groupId]);

        return {
          success: true,
          series_status: 'paused',
          message: 'Recurring weekly booking series has been paused. Future time slots have been released.',
        };
      }

      if (action === 'activate') {
        await tx.query('SELECT location_id FROM locations WHERE location_id = $1 FOR UPDATE', [firstBooking.location_id]);

        const futureBookings = seriesRes.rows.filter((b) => new Date(b.start_time) > new Date());

        for (const b of futureBookings) {
          const conflict = await tx.query(
            `SELECT b.booking_id, b.purpose, b.start_time, b.end_time, u.name as booked_by
             FROM location_bookings b
             JOIN users u ON b.user_id = u.user_id
             WHERE b.location_id = $1
               AND b.status IN ('pending', 'approved')
               AND (b.recurrence_group_id IS NULL OR b.recurrence_group_id != $2)
               AND b.start_time < $3
               AND b.end_time > $4`,
            [b.location_id, groupId, b.end_time, b.start_time]
          );
          if (conflict.rows.length > 0) {
            const c = conflict.rows[0];
            const err = new Error(
              `Cannot reactivate series: Conflict on ${new Date(b.start_time).toLocaleDateString()}. Slot is already booked by ${c.booked_by}.`
            );
            err.status = 409;
            err.conflictingBooking = c;
            throw err;
          }
        }

        // Security rule: Reactivation must NEVER allow a student or lecturer to self-approve previously unapproved bookings!
        // Only restore to 'approved' if the series had already been approved by staff (approved_by IS NOT NULL).
        await tx.query(
          `UPDATE location_bookings
           SET status = CASE WHEN approved_by IS NOT NULL THEN 'approved' ELSE 'pending' END,
               series_status = 'active',
               rejection_reason = NULL
           WHERE recurrence_group_id = $1 AND start_time > $2`,
          [groupId, now]
        );
        await tx.query(`UPDATE location_bookings SET series_status = 'active' WHERE recurrence_group_id = $1`, [groupId]);

        return {
          success: true,
          series_status: 'active',
          message: 'Recurring weekly booking series reactivated successfully.',
        };
      }

      if (action === 'cancel') {
        await tx.query(
          `UPDATE location_bookings
           SET status = 'cancelled', series_status = 'cancelled', rejection_reason = 'Series permanently cancelled'
           WHERE recurrence_group_id = $1 AND start_time > $2`,
          [groupId, now]
        );
        await tx.query(`UPDATE location_bookings SET series_status = 'cancelled' WHERE recurrence_group_id = $1`, [groupId]);

        return {
          success: true,
          series_status: 'cancelled',
          message: 'Recurring weekly booking series cancelled permanently.',
        };
      }
    });

    return res.json(txResult);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        conflictingBooking: err.conflictingBooking,
      });
    }
    console.error('toggleRecurringSeries error:', err);
    return res.status(500).json({ error: 'Failed to update recurring series.' });
  }
}

// PATCH /api/bookings/:id/cancel-week
async function cancelOneWeek(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    const existing = await query(
      `SELECT b.*, l.name AS location_name, u.name AS user_name
       FROM location_bookings b
       JOIN locations l ON b.location_id = l.location_id
       JOIN users u ON b.user_id = u.user_id
       WHERE b.booking_id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = existing.rows[0];
    const isStaff = ['technician', 'manager'].includes(userRole);
    if (Number(booking.user_id) !== Number(userId) && !isStaff) {
      return res.status(403).json({ error: 'You are not authorised to cancel this booking.' });
    }

    if (new Date(booking.start_time) < new Date()) {
      return res.status(400).json({ error: 'Cannot cancel a session that has already started or ended.' });
    }

    await query(
      `UPDATE location_bookings
       SET status = 'cancelled', rejection_reason = 'Session cancelled by ${isStaff ? 'technician/manager' : 'lecturer'}'
       WHERE booking_id = $1`,
      [id]
    );

    return res.json({
      success: true,
      message: `Session on ${new Date(booking.start_time).toLocaleDateString()} for ${booking.location_name} has been cancelled.`,
    });
  } catch (err) {
    console.error('cancelOneWeek error:', err);
    return res.status(500).json({ error: 'Failed to cancel booking session.' });
  }
}

module.exports = {
  getBookings,
  getBookingLecturers,
  createBooking,
  updateBookingStatus,
  deleteBooking,
  toggleRecurringSeries,
  cancelOneWeek,
};
