const { query } = require('../config/db');

async function createUserNotification({ userId, type, title, message, entityType = null, entityId = null }) {
  if (!userId) return;
  try {
    await query(
      `INSERT INTO user_notifications (user_id, type, title, message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, message, entityType, entityId == null ? null : String(entityId)]
    );
  } catch (err) {
    // A notification failure should not undo or mask the status change itself.
    console.error('createUserNotification error:', err);
  }
}

async function getNotifications(req, res) {
  try {
    const result = await query(
      `SELECT notification_id, type, title, message, entity_type, entity_id, created_at, read_at
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC, notification_id DESC
       LIMIT 50`,
      [req.user.user_id]
    );
    return res.json({
      success: true,
      notifications: result.rows,
      unread_count: result.rows.filter((item) => !item.read_at).length,
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
}

async function markNotificationRead(req, res) {
  try {
    const result = await query(
      `UPDATE user_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id, read_at`,
      [req.params.id, req.user.user_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Notification not found.' });
    return res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    console.error('markNotificationRead error:', err);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    await query(
      `UPDATE user_notifications SET read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.user_id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('markAllNotificationsRead error:', err);
    return res.status(500).json({ error: 'Failed to update notifications.' });
  }
}

module.exports = {
  createUserNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
