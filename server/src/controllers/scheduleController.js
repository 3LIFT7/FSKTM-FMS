const csv = require('csv-parser');
const fs = require('fs');
const { query } = require('../config/db');

// Helper to calculate date of next occurrence of a weekday
function getNextWeekdayDate(dayName, weeksOffset = 0) {
  const days = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  const targetDay = days[dayName.trim().toLowerCase()];
  if (targetDay === undefined) return null;

  const now = new Date();
  const currentDay = now.getDay();
  let distance = (targetDay - currentDay + 7) % 7;
  if (distance === 0) distance = 7; // start next week if today

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + distance + (weeksOffset * 7));
  return targetDate;
}

// POST /api/schedule/import-csv
async function importCsvSchedule(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a CSV timetable file.' });
  }

  const filePath = req.file.path;
  const results = [];
  const errors = [];
  const successfulBookings = [];

  try {
    const stream = fs.createReadStream(filePath).pipe(csv());

    for await (const row of stream) {
      results.push(row);
    }

    // Clean up temporary file
    fs.unlink(filePath, () => {});

    if (results.length === 0) {
      return res.status(400).json({ error: 'Uploaded CSV file contains no data rows.' });
    }

    // Fetch all locations to map by code or name
    const locRes = await query('SELECT location_id, code, name, status FROM locations');
    const locMap = {};
    locRes.rows.forEach(loc => {
      locMap[loc.code.toUpperCase()] = loc;
      locMap[loc.name.toUpperCase()] = loc;
    });

    const semesterWeeks = 14;
    let rowIndex = 1;

    for (const row of results) {
      rowIndex++;
      // Expected column names (flexible matching)
      const courseId = row['Course ID'] || row['Course'] || row['course_id'] || row['CourseCode'] || '';
      const day = (row['Day'] || row['day'] || '').toLowerCase();
      const startTimeStr = row['Start Time'] || row['Time'] || row['start_time'] || '';
      const endTimeStr = row['End Time'] || row['end_time'] || '';
      const labIdentifier = (row['Lab'] || row['Room'] || row['lab'] || row['room'] || '').toUpperCase().trim();
      const purpose = row['Purpose'] || `${courseId} Semester Lecture/Lab Practical`;

      if (!day || !startTimeStr || !labIdentifier) {
        errors.push({ row: rowIndex, message: 'Missing required columns (Day, Start Time, or Lab)' });
        continue;
      }

      // Find location
      const location = locMap[labIdentifier];
      if (!location) {
        errors.push({ row: rowIndex, message: `Facility "${labIdentifier}" not recognized in database.` });
        continue;
      }

      // CORE RULE: Skip or alert if room is under maintenance
      if (location.status === 'maintenance') {
        errors.push({
          row: rowIndex,
          message: `Cannot schedule for "${location.name}" (${location.code}): Facility is currently UNDER MAINTENANCE.`
        });
        continue;
      }

      // Parse hours and minutes
      const parseTime = (timeStr) => {
        const parts = timeStr.trim().split(':');
        return { h: parseInt(parts[0], 10), m: parts[1] ? parseInt(parts[1], 10) : 0 };
      };

      const startParsed = parseTime(startTimeStr);
      const endParsed = endTimeStr ? parseTime(endTimeStr) : { h: startParsed.h + 2, m: startParsed.m };

      let rowBookingCount = 0;
      for (let w = 0; w < semesterWeeks; w++) {
        const slotDate = getNextWeekdayDate(day, w);
        if (!slotDate) {
          errors.push({ row: rowIndex, message: `Invalid day name "${day}".` });
          break;
        }

        const slotStart = new Date(slotDate);
        slotStart.setHours(startParsed.h, startParsed.m, 0, 0);

        const slotEnd = new Date(slotDate);
        slotEnd.setHours(endParsed.h, endParsed.m, 0, 0);

        // Check conflicts (only against active pending or approved bookings)
        const conflictRes = await query(
          `SELECT booking_id FROM location_bookings 
           WHERE location_id = $1 AND start_time < $2 AND end_time > $3 AND status NOT IN ('rejected', 'cancelled')`,
          [location.location_id, slotEnd.toISOString(), slotStart.toISOString()]
        );

        if (conflictRes.rows.length === 0) {
          await query(
            `INSERT INTO location_bookings (location_id, user_id, start_time, end_time, purpose, is_recurring, recurrence_pattern, course_id, status, approved_by)
             VALUES ($1, $2, $3, $4, $5, true, $6, $7, 'approved', $8)`,
            [
              location.location_id,
              req.user.user_id,
              slotStart.toISOString(),
              slotEnd.toISOString(),
              purpose,
              `WEEKLY:${day.toUpperCase()}:W${w + 1}`,
              courseId,
              req.user.user_id
            ]
          );
          rowBookingCount++;
        }
      }

      if (rowBookingCount > 0) {
        successfulBookings.push({
          courseId,
          lab: location.name,
          day,
          time: `${startTimeStr} - ${endTimeStr || (startParsed.h + 2) + ':00'}`,
          weeksCreated: rowBookingCount
        });
      }
    }

    return res.json({
      success: true,
      message: `CSV processing finished. Created recurring bookings for ${successfulBookings.length} courses over ${semesterWeeks} weeks.`,
      importedCount: successfulBookings.length,
      importedCourses: successfulBookings,
      errors
    });
  } catch (err) {
    console.error('importCsvSchedule error:', err);
    return res.status(500).json({ error: 'Failed to process timetable CSV.' });
  }
}

module.exports = {
  importCsvSchedule
};
