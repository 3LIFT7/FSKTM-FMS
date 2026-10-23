const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

// Public or authenticated QR submission
router.post('/', optionalAuth, feedbackController.submitFeedback);

// View feedback, rating stats, and active reports for a specific classroom
router.get('/location/:idOrCode', optionalAuth, feedbackController.getLocationFeedback);

// Staff / Manager: View all feedback across the faculty
router.get('/', authenticateToken, requireRole(['technician', 'manager']), feedbackController.getAllFeedback);

// Staff / Manager: Delete feedback
router.delete('/:id', authenticateToken, requireRole(['technician', 'manager']), feedbackController.deleteFeedback);

module.exports = router;
