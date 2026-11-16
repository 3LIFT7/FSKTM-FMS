const express = require('express');
const router = express.Router();
const devicesController = require('../controllers/devicesController');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

router.get('/', optionalAuth, devicesController.getAllDevices);
router.get('/:id', optionalAuth, devicesController.getDeviceById);

// Staff management endpoints
router.post('/', authenticateToken, requireRole(['technician', 'manager']), devicesController.createDevice);
router.put('/:id', authenticateToken, requireRole(['technician', 'manager']), devicesController.updateDevice);
router.patch('/:id/status', authenticateToken, requireRole(['technician', 'manager']), devicesController.updateDeviceStatus);
router.delete('/:id', authenticateToken, requireRole(['technician', 'manager']), devicesController.deleteDevice);

module.exports = router;
