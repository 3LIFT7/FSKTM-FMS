const csv = require('csv-parser');
const fs = require('fs');
const { query, withTransaction } = require('../config/db');
const { safeUnlink } = require('../utils/fileUpload');

const VALID_DAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function getNextWeekdayDate(dayName, weeksOffset = 0) {
  const targetDay = VALID_DAYS[String(dayName).trim().toLowerCase()];
  if (targetDay === undefined) return null;

  const now = new Date();
  const currentDay = now.getDay();
  let distance = (targetDay - currentDay + 7) % 7;
  if (distance === 0) distance = 7;

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + distance + weeksOffset * 7);
  return targetDate;
}

function parseStrictTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m, totalMinutes: h * 60 + m };
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

    if (results.length === 0) {
      return res.status(400).json({ error: 'Uploaded CSV file contains no data rows.' });
    }

    const locRes = await query('SELECT location_id, code, name, status FROM locations');
    const locMap = {};
    locRes.rows.forEach((loc) => {
      locMap[loc.code.toUpperCase()] = loc;
      locMap[loc.name.toUpperCase()] = loc;
    });

    const semesterWeeks = 14;
    const seenRowSignatures = new Set();
    let rowIndex = 1;

    for (const row of results) {
      rowIndex++;
      const courseId = String(row['Course ID'] || row['Course'] || row['course_id'] || row['CourseCode'] || '').trim();
      const dayRaw = String(row['Day'] || row['day'] || '').trim();
      const day = dayRaw.toLowerCase();
      const startTimeStr = String(row['Start Time'] || row['Time'] || row['start_time'] || '').trim();
      const endTimeStr = String(row['End Time'] || row['end_time'] || '').trim();
      const labIdentifier = String(row['Lab'] || row['Room'] || row['lab'] || row['room'] || '')
        .toUpperCase()
        .trim();
      const purpose = String(row['Purpose'] || `${courseId || 'COURSE'} Semester Lecture/Lab Practical`).trim();

      if (!day || !startTimeStr || !labIdentifier) {
        errors.push({ row: rowIndex, message: 'Missing required columns (Day, Start Time, or Lab).' });
        continue;
      }

      if (VALID_DAYS[day] === undefined) {
        errors.push({ row: rowIndex, message: `Invalid weekday name "${dayRaw}".` });
        continue;
      }

      const startParsed = parseStrictTime(startTimeStr);
      if (!startParsed) {
        errors.push({ row: rowIndex, message: `Invalid Start Time "${startTimeStr}". Expected HH:MM (24-hour).` });
        continue;
      }

      let endParsed;
      if (endTimeStr) {
        endParsed = parseStrictTime(endTimeStr);
        if (!endParsed) {
          errors.push({ row: rowIndex, message: `Invalid End Time "${endTimeStr}". Expected HH:MM (24-hour).` });
          continue;
        }
      } else {
        const defaultEndH = startParsed.h + 2;
        if (defaultEndH > 23) {
          errors.push({ row: rowIndex, message: `Start Time "${startTimeStr}" extends past midnight.` });
          continue;
        }
        endParsed = { h: defaultEndH, m: startParsed.m, totalMinutes: defaultEndH * 60 + startParsed.m };
      }

      if (endParsed.totalMinutes <= startParsed.totalMinutes) {
        errors.push({
          row: rowIndex,
          message: `End Time (${endTimeStr || `${endParsed.h}:00`}) must be later than Start Time (${startTimeStr}).`,
        });
        continue;
      }

      const location = locMap[labIdentifier];
      if (!location) {
        errors.push({ row: rowIndex, message: `Facility "${labIdentifier}" not recognized in database.` });
        continue;
      }

      if (location.status === 'maintenance') {
        errors.push({
          row: rowIndex,
          message: `Cannot schedule for "${location.name}" (${location.code}): Facility is currently UNDER MAINTENANCE.`,
        });
        continue;
      }

      const rowSignature = `${location.location_id}|${day}|${startParsed.totalMinutes}|${endParsed.totalMinutes}`;
      if (seenRowSignatures.has(rowSignature)) {
        errors.push({
          row: rowIndex,
          message: `Duplicate schedule row in CSV for ${location.code} on ${dayRaw} (${startTimeStr}).`,
        });
        continue;
      }
      seenRowSignatures.add(rowSignature);

      // Atomic validation & insertion of all 14 weeks for this CSV row so partial series are never created
      try {
        const createdWeeks = await withTransaction(async (tx) => {
          await tx.query('SELECT location_id FROM locations WHERE location_id = $1 FOR UPDATE', [location.location_id]);

          const slotsToInsert = [];
          for (let w = 0; w < semesterWeeks; w++) {
            const slotDate = getNextWeekdayDate(day, w);
            const slotStart = new Date(slotDate);
            slotStart.setHours(startParsed.h, startParsed.m, 0, 0);

            const slotEnd = new Date(slotDate);
            slotEnd.setHours(endParsed.h, endParsed.m, 0, 0);

            const conflictRes = await tx.query(
              `SELECT booking_id, course_id, purpose FROM location_bookings
               WHERE location_id = $1
                 AND start_time < $2
                 AND end_time > $3
                 AND status NOT IN ('rejected', 'cancelled')`,
              [location.location_id, slotEnd.toISOString(), slotStart.toISOString()]
            );

            if (conflictRes.rows.length > 0) {
              const err = new Error(
                `Row ${rowIndex} (${courseId || purpose} in ${location.code}): Week ${w + 1} (${slotStart.toISOString().split('T')[0]}) conflicts with existing booking "${conflictRes.rows[0].purpose}".`
              );
              err.isRowConflict = true;
              throw err;
            }

            slotsToInsert.push({ w, slotStart, slotEnd });
          }

          const groupId = `CSV-${Date.now()}-${rowIndex}-${Math.random().toString(36).slice(2, 6)}`;
          for (const slot of slotsToInsert) {
            await tx.query(
              `INSERT INTO location_bookings (
                 location_id, user_id, start_time, end_time, purpose,
                 is_recurring, recurrence_pattern, recurrence_group_id, series_status,
                 course_id, course_name, status, approved_by
               )
               VALUES ($1, $2, $3, $4, $5, true, $6, $7, 'active', $8, $9, 'approved', $10)`,
              [
                location.location_id,
                req.user.user_id,
                slot.slotStart.toISOString(),
                slot.slotEnd.toISOString(),
                purpose,
                `WEEKLY:${day.toUpperCase()}:W${slot.w + 1}`,
                groupId,
                courseId ? courseId.toUpperCase() : null,
                purpose,
                req.user.user_id,
              ]
            );
          }

          return slotsToInsert.length;
        });

        successfulBookings.push({
          courseId,
          course_id: courseId,
          lab: location.name,
          location_name: location.name,
          day: dayRaw,
          start_time: startTimeStr,
          end_time: endTimeStr || `${endParsed.h}:${String(endParsed.m).padStart(2, '0')}`,
          purpose,
          time: `${startTimeStr} - ${endTimeStr || `${endParsed.h}:00`}`,
          weeksCreated: createdWeeks,
        });
      } catch (rowErr) {
        errors.push({
          row: rowIndex,
          message: rowErr.message || 'Failed to schedule course row.',
        });
      }
    }

    return res.json({
      success: true,
      message: `CSV processing finished. Created recurring bookings for ${successfulBookings.length} course(s) over ${semesterWeeks} weeks.`,
      importedCount: successfulBookings.length,
      importedCourses: successfulBookings,
      preview: successfulBookings,
      errors,
    });
  } catch (err) {
    console.error('importCsvSchedule error:', err);
    return res.status(500).json({ error: 'Failed to process timetable CSV.' });
  } finally {
    safeUnlink(filePath);
  }
}

module.exports = {
  importCsvSchedule,
};
