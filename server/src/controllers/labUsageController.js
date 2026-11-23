const { query, withTransaction } = require('../config/db');
const { createUserNotification } = require('./notificationsController');

function computeBookingAttendanceState(row, now = new Date()) {
  if (row.checked_in_at || (row.attendance_status && ['on_time', 'late'].includes(row.attendance_status))) {
    const start = new Date(row.start_time);
    const checkedIn = row.checked_in_at ? new Date(row.checked_in_at) : start;
    const diffMins = Math.round((checkedIn.getTime() - start.getTime()) / 60000);
    const status = row.attendance_status || (diffMins <= 15 ? 'on_time' : 'late');
    return {
      attendance_status: status,
      late_minutes: status === 'late' ? Math.max(1, diffMins) : 0,
    };
  }

  const end = new Date(row.end_time);
  if (now.getTime() > end.getTime()) {
    return {
      attendance_status: 'missed',
      late_minutes: 0,
    };
  }

  return {
    attendance_status: 'pending_checkin',
    late_minutes: 0,
  };
}

// GET /api/lab-usage
// Restricted to staff (technician, manager) and lecturers (who only see their own attendance records)
async function getLabUsageLogs(req, res) {
  try {
    const currentUser = req.user;
    if (!currentUser || !['lecturer', 'technician', 'manager'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied. Only faculty and lab management staff can access attendance logs.' });
    }

    const isStaff = ['technician', 'manager'].includes(currentUser.role);
    const { location_id, user_id, startDate, endDate, floor, attendance_status } = req.query;

    // Non-staff (lecturers) can only view their own attendance records
    const effectiveUserId = isStaff ? user_id : currentUser.user_id;
    if (!isStaff && user_id && Number(user_id) !== Number(currentUser.user_id)) {
      return res.status(403).json({ error: 'Lecturers may only view their own attendance records.' });
    }

    let bookingsSql = `
      SELECT
        b.booking_id,
        lg.log_id,
        b.location_id,
        b.user_id,
        b.start_time,
        b.end_time,
        b.course_id,
        b.course_name,
        COALESCE(b.attendance_notes, lg.purpose, b.purpose) AS purpose,
        COALESCE(b.checked_in_at, lg.checked_in_at) AS checked_in_at,
        COALESCE(b.attendance_status, lg.attendance_status) AS raw_attendance_status,
        COALESCE(lg.created_at, b.created_at) AS created_at,
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
      FROM location_bookings b
      JOIN locations l ON b.location_id = l.location_id
      JOIN users u ON b.user_id = u.user_id
      LEFT JOIN lab_usage_logs lg ON lg.booking_id = b.booking_id
      WHERE u.role = 'lecturer'
        AND b.status = 'approved'
    `;
    const params = [];

    if (location_id) {
      params.push(location_id);
      bookingsSql += ` AND b.location_id = $${params.length}`;
    }

    if (effectiveUserId) {
      params.push(effectiveUserId);
      bookingsSql += ` AND b.user_id = $${params.length}`;
    }

    if (floor) {
      params.push(floor);
      bookingsSql += ` AND l.floor = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      bookingsSql += ` AND b.end_time >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      bookingsSql += ` AND b.start_time <= $${params.length}`;
    }

    let standaloneSql = `
      SELECT
        lg.booking_id,
        lg.log_id,
        lg.location_id,
        lg.user_id,
        lg.start_time,
        lg.end_time,
        lg.course_id,
        lg.course_name,
        lg.purpose,
        lg.checked_in_at,
        lg.attendance_status AS raw_attendance_status,
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
      WHERE lg.booking_id IS NULL
    `;
    const standaloneParams = [];

    if (location_id) {
      standaloneParams.push(location_id);
      standaloneSql += ` AND lg.location_id = $${standaloneParams.length}`;
    }
    if (effectiveUserId) {
      standaloneParams.push(effectiveUserId);
      standaloneSql += ` AND lg.user_id = $${standaloneParams.length}`;
    }
    if (floor) {
      standaloneParams.push(floor);
      standaloneSql += ` AND l.floor = $${standaloneParams.length}`;
    }

    const [bookingsRes, standaloneRes] = await Promise.all([
      query(bookingsSql, params),
      query(standaloneSql, standaloneParams),
    ]);

    const now = new Date();
    const combined = [...bookingsRes.rows, ...standaloneRes.rows].map((row) => {
      const computed = computeBookingAttendanceState(
        {
          ...row,
          attendance_status: row.raw_attendance_status,
        },
        now
      );

      return {
        ...row,
        record_key: row.booking_id ? `booking-${row.booking_id}` : `log-${row.log_id}`,
        log_id: row.log_id || `B-${row.booking_id}`,
        attendance_status: computed.attendance_status,
        late_minutes: computed.late_minutes,
      };
    });

    combined.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const filtered =
      attendance_status && attendance_status !== 'All'
        ? combined.filter((item) => item.attendance_status === attendance_status)
        : combined;

    return res.json({
      success: true,
      count: filtered.length,
      logs: filtered,
    });
  } catch (err) {
    console.error('getLabUsageLogs error:', err);
    return res.status(500).json({ error: 'Failed to retrieve lab usage logs.' });
  }
}

// POST /api/lab-usage/qr-checkin
// Lecturer scans the QR code in the reserved lab/room to confirm attendance for an APPROVED booking
async function checkInViaQr(req, res) {
  try {
    const { booking_id, location_id, code, notes } = req.body;
    const userId = req.user.user_id;

    if (!booking_id) {
      return res.status(400).json({ error: 'Reservation ID (booking_id) is required to confirm QR attendance.' });
    }

    const txResult = await withTransaction(async (tx) => {
      // Lock the booking row so concurrent requests cannot create duplicate check-ins
      const bookingRes = await tx.query(
        `SELECT b.*, l.name AS location_name, l.code AS location_code, l.floor AS location_floor
         FROM location_bookings b
         JOIN locations l ON b.location_id = l.location_id
         WHERE b.booking_id = $1
         FOR UPDATE`,
        [booking_id]
      );

      if (bookingRes.rows.length === 0) {
        const err = new Error('Reservation not found.');
        err.status = 404;
        throw err;
      }

      const booking = bookingRes.rows[0];

      // Verify ownership: strictly only the lecturer who created the booking can confirm attendance
      if (req.user.role !== 'lecturer' || Number(booking.user_id) !== Number(userId)) {
        const err = new Error('Only the faculty member who reserved this room can confirm attendance.');
        err.status = 403;
        throw err;
      }

      // Only APPROVED bookings can be checked into; QR scan must never auto-approve a pending booking
      if (booking.status !== 'approved') {
        const err = new Error(
          `Cannot check in: This reservation is currently "${booking.status}". Only approved bookings can be checked into via QR code.`
        );
        err.status = 400;
        err.code = 'BOOKING_NOT_APPROVED';
        throw err;
      }

      // Verify scanned room matches the reserved room
      if (location_id && Number(booking.location_id) !== Number(location_id)) {
        const err = new Error(
          `Room mismatch: This reservation is for ${booking.location_name} (${booking.location_code}). Please scan the QR code inside ${booking.location_code}.`
        );
        err.status = 400;
        err.code = 'WRONG_ROOM_QR';
        throw err;
      }
      if (code && String(booking.location_code).toUpperCase() !== String(code).trim().toUpperCase()) {
        const err = new Error(
          `Room mismatch: This reservation is for ${booking.location_name} (${booking.location_code}).`
        );
        err.status = 400;
        err.code = 'WRONG_ROOM_QR';
        throw err;
      }

      if (booking.checked_in_at) {
        const err = new Error('Attendance has already been confirmed for this reservation.');
        err.status = 409;
        err.code = 'DUPLICATE_CHECKIN';
        throw err;
      }

      const existingLog = await tx.query('SELECT log_id FROM lab_usage_logs WHERE booking_id = $1', [booking.booking_id]);
      if (existingLog.rows.length > 0) {
        const err = new Error('Attendance has already been recorded for this reservation.');
        err.status = 409;
        err.code = 'DUPLICATE_CHECKIN';
        throw err;
      }

      const now = new Date();
      const start = new Date(booking.start_time);
      const end = new Date(booking.end_time);
      const earliestCheckin = new Date(start.getTime() - 15 * 60 * 1000); // 15 minutes before start_time
      const onTimeDeadline = new Date(start.getTime() + 15 * 60 * 1000); // 15 minutes after start_time

      if (now < earliestCheckin) {
        const earliestStr = earliestCheckin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const err = new Error(
          `Too early to check in. QR attendance confirmation opens 15 minutes before your scheduled start time (at ${earliestStr}).`
        );
        err.status = 400;
        err.code = 'TOO_EARLY';
        throw err;
      }

      if (now > end) {
        const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const err = new Error(
          `Check-in window closed at ${endStr}. This reservation has been marked as Missed / Absent.`
        );
        err.status = 400;
        err.code = 'WINDOW_CLOSED';
        throw err;
      }

      const attendanceStatus = now <= onTimeDeadline ? 'on_time' : 'late';
      const diffMins = Math.max(0, Math.round((now.getTime() - start.getTime()) / 60000));
      const cleanNotes = notes?.trim() || booking.purpose || 'QR Code Attendance Verified';

      // Update location_bookings without changing booking approval status
      await tx.query(
        `UPDATE location_bookings
         SET checked_in_at = CURRENT_TIMESTAMP,
             attendance_status = $1,
             attendance_notes = $2
         WHERE booking_id = $3`,
        [attendanceStatus, cleanNotes, booking.booking_id]
      );

      // Insert synchronized record into lab_usage_logs
      const ins = await tx.query(
        `INSERT INTO lab_usage_logs (
           booking_id, location_id, user_id, start_time, end_time,
           course_id, course_name, purpose, checked_in_at, attendance_status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
         RETURNING *`,
        [
          booking.booking_id,
          booking.location_id,
          booking.user_id,
          booking.start_time,
          booking.end_time,
          booking.course_id || 'LAB-SESSION',
          booking.course_name || 'Lab / Room Reservation',
          cleanNotes,
          attendanceStatus,
        ]
      );

      return {
        booking,
        createdLog: ins.rows[0],
        attendanceStatus,
        diffMins,
      };
    });

    // Notify Lab Managers
    try {
      const managers = await query("SELECT user_id FROM users WHERE role = 'manager'");
      const statusLabel = txResult.attendanceStatus === 'on_time' ? 'On-Time' : `Late (+${txResult.diffMins} mins)`;
      for (const mgr of managers.rows) {
        await createUserNotification({
          userId: mgr.user_id,
          type: 'room_booking',
          title: `QR Attendance Verified (${statusLabel})`,
          message: `${req.user.name} confirmed attendance via QR at ${txResult.booking.location_name} (${txResult.booking.location_code}) for ${txResult.booking.course_id || txResult.booking.purpose} — Status: ${statusLabel}.`,
          entityType: 'lab_usage',
          entityId: txResult.createdLog.log_id,
        });
      }
    } catch (notifyErr) {
      console.warn('Notification notice for QR attendance:', notifyErr.message);
    }

    return res.status(200).json({
      success: true,
      attendance_status: txResult.attendanceStatus,
      late_minutes: txResult.attendanceStatus === 'late' ? txResult.diffMins : 0,
      checked_in_at: txResult.createdLog.checked_in_at,
      message:
        txResult.attendanceStatus === 'on_time'
          ? `Attendance confirmed On-Time for ${txResult.booking.location_name} (${txResult.booking.location_code})!`
          : `Attendance confirmed (Late Check-In: +${txResult.diffMins} mins) for ${txResult.booking.location_name} (${txResult.booking.location_code}).`,
      log: txResult.createdLog,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        code: err.code,
      });
    }
    console.error('checkInViaQr error:', err);
    return res.status(500).json({ error: 'Failed to confirm QR attendance.' });
  }
}

// DELETE /api/lab-usage/:id
async function deleteLabUsageLog(req, res) {
  try {
    const { id } = req.params;

    if (String(id).startsWith('B-')) {
      const bookingId = parseInt(String(id).replace('B-', ''), 10);
      await withTransaction(async (tx) => {
        await tx.query(
          `UPDATE location_bookings
           SET checked_in_at = NULL, attendance_status = NULL, attendance_notes = NULL
           WHERE booking_id = $1`,
          [bookingId]
        );
        await tx.query('DELETE FROM lab_usage_logs WHERE booking_id = $1', [bookingId]);
      });
      return res.json({ success: true, message: 'Attendance log reset.' });
    }

    const existing = await query('SELECT * FROM lab_usage_logs WHERE log_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lab usage log record not found.' });
    }

    const log = existing.rows[0];
    const isStaff = ['manager', 'technician'].includes(req.user.role);
    if (!isStaff) {
      return res.status(403).json({ error: 'Not authorized to delete this record.' });
    }

    await withTransaction(async (tx) => {
      if (log.booking_id) {
        await tx.query(
          `UPDATE location_bookings
           SET checked_in_at = NULL, attendance_status = NULL, attendance_notes = NULL
           WHERE booking_id = $1`,
          [log.booking_id]
        );
      }
      await tx.query('DELETE FROM lab_usage_logs WHERE log_id = $1', [id]);
    });

    return res.json({ success: true, message: 'Lab usage log record deleted.' });
  } catch (err) {
    console.error('deleteLabUsageLog error:', err);
    return res.status(500).json({ error: 'Failed to delete lab usage log.' });
  }
}

module.exports = {
  getLabUsageLogs,
  checkInViaQr,
  deleteLabUsageLog,
};
