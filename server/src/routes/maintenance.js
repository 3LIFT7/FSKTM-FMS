const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, maintenanceController.getMaintenanceLogs);
router.post('/', authenticateToken, requireRole(['technician', 'manager']), maintenanceController.createMaintenanceLog);

module.exports = router;
