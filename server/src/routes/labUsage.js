const express = require('express');
const router = express.Router();
const labUsageController = require('../controllers/labUsageController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, requireRole(['lecturer', 'technician', 'manager']), labUsageController.getLabUsageLogs);
router.post('/qr-checkin', authenticateToken, requireRole(['lecturer']), labUsageController.checkInViaQr);
router.delete('/:id', authenticateToken, requireRole(['manager', 'technician']), labUsageController.deleteLabUsageLog);

module.exports = router;
