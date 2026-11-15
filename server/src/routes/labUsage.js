const express = require('express');
const router = express.Router();
const labUsageController = require('../controllers/labUsageController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, labUsageController.getLabUsageLogs);
router.post('/', authenticateToken, requireRole(['lecturer', 'manager', 'technician']), labUsageController.createLabUsageLog);
router.delete('/:id', authenticateToken, requireRole(['lecturer', 'manager', 'technician']), labUsageController.deleteLabUsageLog);

module.exports = router;
