const { query } = require('../config/db');

// POST /api/feedback
async function submitFeedback(req, res) {
  try {
    const {
      location_id,
      code,
      rating = 5,
      category = 'General',
      comments,
      cleanliness_rating = 5,
      equipment_rating = 5,
      ac_rating = 5,
      reporter_name,
      reporter_email,
      reporter_role = 'student'
    } = req.body;

    if (!comments || comments.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide feedback comments or suggestions.' });
    }

    let resolvedLocationId = location_id;

    // Resolve location_id if code was provided
    if (!resolvedLocationId && code) {
      const locRes = await query('SELECT location_id FROM locations WHERE code = $1', [code]);
      if (locRes.rows.length > 0) {
        resolvedLocationId = locRes.rows[0].location_id;
      }
    }

    if (!resolvedLocationId) {
      return res.status(400).json({ error: 'Target classroom or facility is required.' });
    }

    const userId = req.user ? req.user.user_id : null;
    const name = req.user ? req.user.name : (reporter_name || 'Anonymous Student');
    const email = req.user ? req.user.email : (reporter_email || null);
    const role = req.user ? req.user.role : (reporter_role || 'student');

    const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
    const numClean = Math.max(1, Math.min(5, parseInt(cleanliness_rating, 10) || 5));
    const numEquip = Math.max(1, Math.min(5, parseInt(equipment_rating, 10) || 5));
    const numAc = Math.max(1, Math.min(5, parseInt(ac_rating, 10) || 5));

    const insertRes = await query(
      `INSERT INTO room_feedback (
        location_id, user_id, reporter_name, reporter_email, reporter_role,
        rating, category, comments, cleanliness_rating, equipment_rating, ac_rating
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        resolvedLocationId,
        userId,
        name,
        email,
        role,
        numRating,
        category,
        comments.trim(),
        numClean,
        numEquip,
        numAc
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Classroom feedback submitted successfully! Thank you for helping improve our faculty facilities.',
      feedback: insertRes.rows[0]
    });
  } catch (err) {
    console.error('submitFeedback error:', err);
    return res.status(500).json({ error: 'Failed to submit classroom feedback.' });
  }
}

// GET /api/feedback/location/:idOrCode
async function getLocationFeedback(req, res) {
  try {
    const { idOrCode } = req.params;

    // Find location by location_id or code
    let locSql = 'SELECT * FROM locations WHERE code = $1';
    let locParams = [idOrCode];
    if (!isNaN(parseInt(idOrCode, 10)) && String(parseInt(idOrCode, 10)) === String(idOrCode)) {
      locSql = 'SELECT * FROM locations WHERE location_id = $1 OR code = $2';
      locParams = [parseInt(idOrCode, 10), idOrCode];
    }

    const locRes = await query(locSql, locParams);
    if (locRes.rows.length === 0) {
      return res.status(404).json({ error: 'Classroom or facility location not found.' });
    }

    const location = locRes.rows[0];
    const locationId = location.location_id;

    // Get feedback entries
    const feedbackRes = await query(
      `SELECT f.*, u.matric_or_staff_id, u.role as user_role
       FROM room_feedback f
       LEFT JOIN users u ON f.user_id = u.user_id
       WHERE f.location_id = $1
       ORDER BY f.created_at DESC`,
      [locationId]
    );

    // Calculate rating metrics
    const feedbacks = feedbackRes.rows;
    const totalCount = feedbacks.length;
    let avgRating = 0;
    let avgCleanliness = 0;
    let avgEquipment = 0;
    let avgAc = 0;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalCount > 0) {
      let sumRating = 0;
      let sumClean = 0;
      let sumEquip = 0;
      let sumAc = 0;

      feedbacks.forEach(f => {
        sumRating += f.rating || 5;
        sumClean += f.cleanliness_rating || 5;
        sumEquip += f.equipment_rating || 5;
        sumAc += f.ac_rating || 5;
        const r = Math.round(f.rating || 5);
        if (ratingDistribution[r] !== undefined) ratingDistribution[r]++;
      });

      avgRating = Number((sumRating / totalCount).toFixed(1));
      avgCleanliness = Number((sumClean / totalCount).toFixed(1));
      avgEquipment = Number((sumEquip / totalCount).toFixed(1));
      avgAc = Number((sumAc / totalCount).toFixed(1));
    }

    // Get recent breakdown issues for this location
    const issuesRes = await query(
      `SELECT ir.*, u.name as reporter_name, d.name as device_name
       FROM issue_reports ir
       LEFT JOIN users u ON ir.reported_by = u.user_id
       LEFT JOIN devices d ON ir.device_id = d.device_id
       WHERE ir.location_id = $1
       ORDER BY ir.created_at DESC LIMIT 10`,
      [locationId]
    );

    // Get today's bookings for this classroom
    const bookingsRes = await query(
      `SELECT b.booking_id, b.start_time, b.end_time, b.purpose, b.course_id, b.status, u.name as booked_by
       FROM location_bookings b
       JOIN users u ON b.user_id = u.user_id
       WHERE b.location_id = $1
         AND b.status = 'approved'
         AND b.end_time >= CURRENT_DATE
         AND b.start_time < CURRENT_DATE + INTERVAL '1 day'
       ORDER BY b.start_time ASC`,
      [locationId]
    );

    return res.json({
      success: true,
      location,
      summary: {
        total_feedback: totalCount,
        average_rating: avgRating,
        average_cleanliness: avgCleanliness,
        average_equipment: avgEquipment,
        average_ac: avgAc,
        rating_distribution: ratingDistribution,
        open_issues_count: issuesRes.rows.filter(i => i.status === 'open' || i.status === 'in_progress').length
      },
      feedbacks,
      issues: issuesRes.rows,
      todays_bookings: bookingsRes.rows
    });
  } catch (err) {
    console.error('getLocationFeedback error:', err);
    return res.status(500).json({ error: 'Failed to retrieve classroom feedback.' });
  }
}

// GET /api/feedback (Staff / Admin View all)
async function getAllFeedback(req, res) {
  try {
    const { location_id, floor, category, min_rating } = req.query;

    let sql = `
      SELECT f.*, l.name as location_name, l.code as location_code, l.floor as location_floor,
             u.matric_or_staff_id, u.role as user_role
      FROM room_feedback f
      JOIN locations l ON f.location_id = l.location_id
      LEFT JOIN users u ON f.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (location_id) {
      params.push(location_id);
      sql += ` AND f.location_id = $${params.length}`;
    }

    if (floor) {
      params.push(floor);
      sql += ` AND l.floor = $${params.length}`;
    }

    if (category) {
      params.push(category);
      sql += ` AND f.category = $${params.length}`;
    }

    if (min_rating) {
      params.push(parseInt(min_rating, 10));
      sql += ` AND f.rating >= $${params.length}`;
    }

    sql += ' ORDER BY f.created_at DESC';

    const result = await query(sql, params);

    // Calculate overall stats
    let totalScore = 0;
    result.rows.forEach(r => totalScore += (r.rating || 5));
    const avgScore = result.rows.length > 0 ? Number((totalScore / result.rows.length).toFixed(1)) : 5.0;

    return res.json({
      success: true,
      count: result.rows.length,
      average_rating: avgScore,
      feedbacks: result.rows
    });
  } catch (err) {
    console.error('getAllFeedback error:', err);
    return res.status(500).json({ error: 'Failed to retrieve feedback list.' });
  }
}

// DELETE /api/feedback/:id (Staff / Admin)
async function deleteFeedback(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM room_feedback WHERE feedback_id = $1', [id]);
    return res.json({ success: true, message: 'Feedback entry deleted successfully.' });
  } catch (err) {
    console.error('deleteFeedback error:', err);
    return res.status(500).json({ error: 'Failed to delete feedback entry.' });
  }
}

module.exports = {
  submitFeedback,
  getLocationFeedback,
  getAllFeedback,
  deleteFeedback
};
