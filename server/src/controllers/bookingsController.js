const { query } = require('../config/db');

// GET /api/bookings
async function getBookings(req, res) {
  try {
    const { startDate, endDate, location_id, floor, include_maintenance, status, user_id } = req.query;

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

    // Exclude rooms under maintenance from the calendar unless staff explicitly requested
    if (include_maintenance !== 'true') {
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
      params.push(user_id);
      sql += ` AND b.user_id = $${params.length}`;
    }

    sql += ' ORDER BY b.start_time ASC';

    const result = await query(sql, params);
    return res.json({ success: true, count: result.rows.length, bookings: result.rows });
  } catch (err) {
    console.error('getBookings error:', err);
    return res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
}

// POST /api/bookings
async function createBooking(req, res) {
  try {
    const { location_id, start_time, end_time, purpose, is_recurring, weeks = 14, recurrence_day, course_id } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    if (!location_id || !start_time || !end_time || !purpose) {
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

    // Check single booking max duration (max 8 hours)
    const durationHours = (end - start) / (1000 * 60 * 60);
    if (durationHours > 8) {
      return res.status(400).json({ error: 'Single booking duration cannot exceed 8 hours.' });
    }

    // 1. Check Location Existence & Room status must NOT be 'maintenance'
    const locRes = await query('SELECT location_id, name, code, category, status FROM locations WHERE location_id = $1', [location_id]);
    if (locRes.rows.length === 0) {
      return res.status(404).json({ error: 'Selected location does not exist.' });
    }

    const location = locRes.rows[0];
    if (location.status === 'maintenance') {
      return res.status(400).json({
        error: `Cannot book ${location.name} (${location.code}): This facility is currently UNDER MAINTENANCE and cannot be reserved.`,
        code: 'ROOM_UNDER_MAINTENANCE'
      });
    }

    // Recurring bookings policy: only lecturers and managers can book recurring
    if (userRole === 'student' && is_recurring) {
      return res.status(403).json({ error: 'Recurring bookings are reserved for Academic Lecturers and Lab Managers.' });
    }

    // Booking approval policy:
    // Staff (technicians, managers) bookings are pre-approved.
    // Student & Lecturer bookings require Administrator approval.
    const isStaff = ['technician', 'manager'].includes(userRole);
    const initialStatus = isStaff ? 'approved' : 'pending';
    const approvedBy = isStaff ? userId : null;

    const numberOfWeeks = is_recurring ? Math.min(Math.max(parseInt(weeks, 10) || 14, 1), 18) : 1;
    const recurrenceGroupId = is_recurring ? `REC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` : null;
    const createdBookings = [];
    const conflicts = [];

    // Pre-check all weekly slots for collisions with approved or pending bookings
    for (let i = 0; i < numberOfWeeks; i++) {
      const slotStart = new Date(start);
      slotStart.setDate(slotStart.getDate() + (i * 7));
      const slotEnd = new Date(end);
      slotEnd.setDate(slotEnd.getDate() + (i * 7));

      // Overlap check against active pending or approved bookings
      const conflictRes = await query(
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
          conflictingBooking: conflictRes.rows[0]
        });
      }
    }

    if (conflicts.length > 0) {
      const c = conflicts[0].conflictingBooking;
      const cStatusText = c.status === 'approved' ? 'already booked' : 'pending approval';
      return res.status(409).json({
        error: `Time slot conflict detected for ${location.name}. This time slot is ${cStatusText} (${new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
        code: 'SCHEDULE_CONFLICT',
        conflicts
      });
    }

    // Insert bookings
    for (let i = 0; i < numberOfWeeks; i++) {
      const slotStart = new Date(start);
      slotStart.setDate(slotStart.getDate() + (i * 7));
      const slotEnd = new Date(end);
      slotEnd.setDate(slotEnd.getDate() + (i * 7));

      const pattern = is_recurring ? `WEEKLY:${recurrence_day || 'WEEKDAY'}:W${i + 1}` : null;

      const insertRes = await query(
        `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, is_recurring, recurrence_pattern, recurrence_group_id, series_status, course_id, status, approved_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING booking_id, start_time, end_time, purpose, status, recurrence_group_id, series_status;`,
        [location_id, userId, slotStart.toISOString(), slotEnd.toISOString(), purpose, is_recurring || false, pattern, recurrenceGroupId, 'active', course_id || null, initialStatus, approvedBy]
      );
      createdBookings.push(insertRes.rows[0]);
    }

    const confirmationMsg = initialStatus === 'pending'
      ? `Room booking request submitted successfully! Your request is pending Admin approval and the slot is held.`
      : (is_recurring ? `Created ${createdBookings.length} weekly recurring bookings.` : 'Booking confirmed successfully.');

    return res.status(201).json({
      success: true,
      requires_approval: initialStatus === 'pending',
      status: initialStatus,
      message: confirmationMsg,
      recurrence_group_id: recurrenceGroupId,
      bookings: createdBookings
    });
  } catch (err) {
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

    const existingRes = await query(
      `SELECT b.*, l.name AS location_name, u.name AS user_name, u.email AS user_email
       FROM location_bookings b
       JOIN locations l ON b.location_id = l.location_id
       JOIN users u ON b.user_id = u.user_id
       WHERE b.booking_id = $1`,
      [id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking record not found.' });
    }

    const booking = existingRes.rows[0];

    // User cancelling their own booking
    if (action === 'cancel') {
      if (booking.user_id !== staffId && !['technician', 'manager'].includes(staffRole)) {
        return res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
      }

      await query(
        `UPDATE location_bookings SET status = 'cancelled' WHERE booking_id = $1`,
        [id]
      );
      return res.json({ success: true, message: 'Room booking cancelled successfully.' });
    }

    // Only staff / admin can approve or reject
    if (!['technician', 'manager'].includes(staffRole)) {
      return res.status(403).json({ error: 'Administrator privileges required to approve or reject bookings.' });
    }

    if (action === 'approve') {
      // Collision verification: Ensure no other approved booking already occupies this slot
      const conflictCheck = await query(
        `SELECT booking_id, purpose, start_time, end_time FROM location_bookings
         WHERE location_id = $1
           AND booking_id != $2
           AND status = 'approved'
           AND start_time < $3
           AND end_time > $4`,
        [booking.location_id, id, booking.end_time, booking.start_time]
      );

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({
          error: `Cannot approve: This time slot conflicts with an already approved booking ("${conflictCheck.rows[0].purpose}").`,
          conflictingBooking: conflictCheck.rows[0]
        });
      }

      const updateRes = await query(
        `UPDATE location_bookings 
         SET status = 'approved', approved_by = $1, rejection_reason = NULL 
         WHERE booking_id = $2 
         RETURNING *`,
        [staffId, id]
      );

      return res.json({
        success: true,
        message: `Booking request for ${booking.location_name} approved successfully.`,
        booking: updateRes.rows[0]
      });
    }

    if (action === 'reject') {
      const updateRes = await query(
        `UPDATE location_bookings 
         SET status = 'rejected', approved_by = $1, rejection_reason = $2 
         WHERE booking_id = $3 
         RETURNING *`,
        [staffId, reason || 'Booking request was not approved by administration.', id]
      );

      return res.json({
        success: true,
        message: `Booking request for ${booking.location_name} rejected. The time slot is now released.`,
        booking: updateRes.rows[0]
      });
    }

    return res.status(400).json({ error: 'Invalid action. Must be approve, reject, or cancel.' });
  } catch (err) {
    console.error('updateBookingStatus error:', err);
    return res.status(500).json({ error: 'Failed to update booking status.' });
  }
}

// DELETE /api/bookings/:id
async function deleteBooking(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    // Check ownership or staff privileges
    const existing = await query('SELECT booking_id, user_id FROM location_bookings WHERE booking_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = existing.rows[0];
    if (booking.user_id !== userId && !['technician', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
    }

    await query('DELETE FROM location_bookings WHERE booking_id = $1', [id]);
    return res.json({ success: true, message: 'Booking record deleted successfully.' });
  } catch (err) {
    console.error('deleteBooking error:', err);
    return res.status(500).json({ error: 'Failed to delete booking.' });
  }
}

// PATCH /api/bookings/recurring/:groupId/status (Toggle / Pause / Reactivate / Cancel whole recurring series)
async function toggleRecurringSeries(req, res) {
  try {
    const { groupId } = req.params;
    const { action } = req.body; // 'activate' | 'pause' | 'cancel'
    const userId = req.user.user_id;
    const userRole = req.user.role;

    if (!['activate', 'pause', 'cancel'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be activate, pause, or cancel.' });
    }

    // 1. Fetch bookings in this recurring series
    const seriesRes = await query(
      `SELECT b.*, l.name as location_name 
       FROM location_bookings b
       JOIN locations l ON b.location_id = l.location_id
       WHERE b.recurrence_group_id = $1 
       ORDER BY b.start_time ASC`,
      [groupId]
    );

    if (seriesRes.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring booking series not found.' });
    }

    const firstBooking = seriesRes.rows[0];
    const isStaff = ['technician', 'manager'].includes(userRole);
    if (firstBooking.user_id !== userId && !isStaff) {
      return res.status(403).json({ error: 'You are not authorized to modify this recurring series.' });
    }

    const now = new Date().toISOString();

    if (action === 'pause') {
      // Deactivate upcoming unstarted slots while preserving history
      await query(
        `UPDATE location_bookings 
         SET status = 'cancelled', series_status = 'paused', rejection_reason = 'Series paused by lecturer' 
         WHERE recurrence_group_id = $1 
           AND start_time > $2 
           AND status IN ('pending', 'approved')`,
        [groupId, now]
      );
      // Mark all records in series with series_status = 'paused'
      await query(
        `UPDATE location_bookings 
         SET series_status = 'paused' 
         WHERE recurrence_group_id = $1`,
        [groupId]
      );

      return res.json({ 
        success: true, 
        series_status: 'paused',
        message: 'Recurring weekly booking series has been paused. Future time slots have been released.' 
      });
    }

    if (action === 'activate') {
      // Find future bookings in this series
      const futureBookings = seriesRes.rows.filter(b => new Date(b.start_time) > new Date());
      
      // Conflict check: make sure the slots are still free
      for (const b of futureBookings) {
        const conflict = await query(
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
          return res.status(409).json({
            error: `Cannot reactivate series: Conflict on ${new Date(b.start_time).toLocaleDateString()} (${new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Slot is already booked by ${c.booked_by}.`,
            conflictingBooking: c
          });
        }
      }

      // Reactivate future bookings
      await query(
        `UPDATE location_bookings 
         SET status = 'approved', series_status = 'active', rejection_reason = NULL 
         WHERE recurrence_group_id = $1 AND start_time > $2`,
        [groupId, now]
      );
      // Mark all records in series as active
      await query(
        `UPDATE location_bookings 
         SET series_status = 'active' 
         WHERE recurrence_group_id = $1`,
        [groupId]
      );

      return res.json({ 
        success: true, 
        series_status: 'active',
        message: 'Recurring weekly booking series reactivated successfully.' 
      });
    }

    if (action === 'cancel') {
      // Permanently cancel future occurrences
      await query(
        `UPDATE location_bookings 
         SET status = 'cancelled', series_status = 'cancelled', rejection_reason = 'Series permanently cancelled' 
         WHERE recurrence_group_id = $1 AND start_time > $2`,
        [groupId, now]
      );
      await query(
        `UPDATE location_bookings 
         SET series_status = 'cancelled' 
         WHERE recurrence_group_id = $1`,
        [groupId]
      );

      return res.json({ 
        success: true, 
        series_status: 'cancelled',
        message: 'Recurring weekly booking series cancelled permanently.' 
      });
    }
  } catch (err) {
    console.error('toggleRecurringSeries error:', err);
    return res.status(500).json({ error: 'Failed to update recurring series.' });
  }
}

module.exports = {
  getBookings,
  createBooking,
  updateBookingStatus,
  deleteBooking,
  toggleRecurringSeries
};

