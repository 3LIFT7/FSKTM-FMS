const { query } = require('../config/db');

// GET /api/settings
async function getSettings(req, res) {
  try {
    const result = await query('SELECT setting_key, setting_value, description FROM system_settings');
    const settingsMap = {};
    result.rows.forEach(r => {
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
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings key-value object required.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES ($1, $2)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [key, String(value)]
      );
    }

    return res.json({ success: true, message: 'System settings updated successfully.' });
  } catch (err) {
    console.error('updateSettings error:', err);
    return res.status(500).json({ error: 'Failed to update system settings.' });
  }
}

module.exports = {
  getSettings,
  updateSettings
};
