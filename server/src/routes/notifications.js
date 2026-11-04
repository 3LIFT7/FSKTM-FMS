const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, notificationsController.getNotifications);
router.patch('/read-all', authenticateToken, notificationsController.markAllNotificationsRead);
router.patch('/:id/read', authenticateToken, notificationsController.markNotificationRead);

module.exports = router;
