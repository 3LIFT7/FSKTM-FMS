const { query, withTransaction } = require('../config/db');

const ALLOWED_SETTINGS = {
  device_booking_requires_approval: {
    description: 'Require technician or manager approval before device checkout',
    validate: (val) => {
      const s = String(val).trim().toLowerCase();
      if (s !== 'true' && s !== 'false') {
        return { valid: false, error: 'device_booking_requires_approval must be "true" or "false".' };
      }
      return { valid: true, value: s };
    },
  },
  operating_hours_start: {
    description: 'Facility booking day start time',
    validate: (val) => {
      const s = String(val).trim();
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(s)) {
        return { valid: false, error: 'operating_hours_start must be a valid 24-hour time in HH:MM format (e.g. 08:00).' };
      }
      return { valid: true, value: s };
    },
  },
  operating_hours_end: {
    description: 'Facility booking day end time',
    validate: (val) => {
      const s = String(val).trim();
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(s)) {
        return { valid: false, error: 'operating_hours_end must be a valid 24-hour time in HH:MM format (e.g. 20:00).' };
      }
      return { valid: true, value: s };
    },
  },
  max_booking_duration_hours: {
    description: 'Maximum single booking duration in hours',
    validate: (val) => {
      const num = Number(val);
      if (!Number.isFinite(num) || num < 0.5 || num > 24) {
        return { valid: false, error: 'max_booking_duration_hours must be a number between 0.5 and 24.' };
      }
      return { valid: true, value: String(num) };
    },
  },
};

function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

// GET /api/settings
async function getSettings(req, res) {
  try {
    const result = await query(
      `SELECT setting_key, setting_value, description
       FROM system_settings
       WHERE setting_key IN ('device_booking_requires_approval', 'operating_hours_start', 'operating_hours_end', 'max_booking_duration_hours')`
    );
    const settingsMap = {
      device_booking_requires_approval: 'true',
      operating_hours_start: '08:00',
      operating_hours_end: '20:00',
      max_booking_duration_hours: '4',
    };
    result.rows.forEach((r) => {
      settingsMap[r.setting_key] = r.setting_value;
    });
    return res.json({ success: true, settings: settingsMap, list: result.rows });
  } catch (err) {
    console.error('getSettings error:', err);
    return res.status(500).json({ error: 'Failed to retrieve system settings.' });
  }
}

// PATCH /api/settings (Manager only)
async function updateSettings(req, res) {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings key-value object required.' });
    }

    const keys = Object.keys(settings);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'At least one setting key must be provided.' });
    }

    const validatedEntries = {};
    for (const [key, rawVal] of Object.entries(settings)) {
      if (!Object.prototype.hasOwnProperty.call(ALLOWED_SETTINGS, key)) {
        return res.status(400).json({
          error: `Unknown or restricted system setting key: "${key}".`,
        });
      }
      const check = ALLOWED_SETTINGS[key].validate(rawVal);
      if (!check.valid) {
        return res.status(400).json({ error: check.error });
      }
      validatedEntries[key] = check.value;
    }

    // Cross-validate operating_hours_start < operating_hours_end
    const existingRes = await query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('operating_hours_start', 'operating_hours_end')`
    );
    const currentHours = {
      operating_hours_start: '08:00',
      operating_hours_end: '20:00',
    };
    existingRes.rows.forEach((r) => {
      currentHours[r.setting_key] = r.setting_value;
    });

    const effectiveStart = validatedEntries.operating_hours_start || currentHours.operating_hours_start;
    const effectiveEnd = validatedEntries.operating_hours_end || currentHours.operating_hours_end;

    if (timeToMinutes(effectiveEnd) <= timeToMinutes(effectiveStart)) {
      return res.status(400).json({
        error: `Daily Facility Closing Time (${effectiveEnd}) must be later than Opening Time (${effectiveStart}).`,
      });
    }

    await withTransaction(async (tx) => {
      for (const [key, value] of Object.entries(validatedEntries)) {
        await tx.query(
          `INSERT INTO system_settings (setting_key, setting_value, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
          [key, value, ALLOWED_SETTINGS[key].description]
        );
      }
    });

    return res.json({
      success: true,
      message: 'System settings updated successfully.',
      settings: validatedEntries,
    });
  } catch (err) {
    console.error('updateSettings error:', err);
    return res.status(500).json({ error: 'Failed to update system settings.' });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  ALLOWED_SETTINGS,
};
