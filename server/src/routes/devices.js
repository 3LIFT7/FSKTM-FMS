const express = require('express');
const router = express.Router();
const devicesController = require('../controllers/devicesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', devicesController.getAllDevices);
router.get('/:id', devicesController.getDeviceById);

// Staff management endpoints
router.post('/', authenticateToken, requireRole(['technician', 'manager']), devicesController.createDevice);
router.put('/:id', authenticateToken, requireRole(['technician', 'manager']), devicesController.updateDevice);
router.patch('/:id/status', authenticateToken, requireRole(['technician', 'manager']), devicesController.updateDeviceStatus);
router.delete('/:id', authenticateToken, requireRole(['technician', 'manager']), devicesController.deleteDevice);

module.exports = router;
