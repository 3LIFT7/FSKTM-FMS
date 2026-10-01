const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', bookingsController.getBookings);
router.post('/', authenticateToken, bookingsController.createBooking);
router.patch('/recurring/:groupId/status', authenticateToken, bookingsController.toggleRecurringSeries);
router.patch('/:id/status', authenticateToken, bookingsController.updateBookingStatus);
router.delete('/:id', authenticateToken, bookingsController.deleteBooking);

module.exports = router;
