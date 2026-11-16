const express = require('express');
const router = express.Router();
const deviceLoansController = require('../controllers/deviceLoansController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, deviceLoansController.getDeviceLoans);
router.get('/lecturers', authenticateToken, requireRole(['student']), deviceLoansController.getLecturers);
router.post('/', authenticateToken, deviceLoansController.requestDeviceLoan);
router.patch('/:id/status', authenticateToken, requireRole(['lecturer', 'technician', 'manager']), deviceLoansController.updateLoanStatus);
router.post('/:id/rating', authenticateToken, requireRole(['technician', 'manager']), deviceLoansController.rateReturnedLoan);

module.exports = router;
