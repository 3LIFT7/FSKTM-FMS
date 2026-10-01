const express = require('express');
const router = express.Router();
const deviceLoansController = require('../controllers/deviceLoansController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, deviceLoansController.getDeviceLoans);
router.post('/', authenticateToken, deviceLoansController.requestDeviceLoan);
router.patch('/:id/status', authenticateToken, requireRole(['technician', 'manager']), deviceLoansController.updateLoanStatus);

module.exports = router;
