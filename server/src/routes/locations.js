const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', locationsController.getAllLocations);
router.get('/:id', locationsController.getLocationById);

// Staff only: toggle status (available <-> maintenance)
router.patch('/:id/status', authenticateToken, requireRole(['technician', 'manager']), locationsController.updateLocationStatus);

// Management
router.post('/', authenticateToken, requireRole(['technician', 'manager']), locationsController.createLocation);
router.put('/:id', authenticateToken, requireRole(['technician', 'manager']), locationsController.updateLocation);
router.delete('/:id', authenticateToken, requireRole(['manager']), locationsController.deleteLocation);

module.exports = router;
