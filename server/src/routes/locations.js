const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

router.get('/', optionalAuth, locationsController.getAllLocations);
router.get('/:id', optionalAuth, locationsController.getLocationById);

// Staff only: toggle status (available <-> maintenance)
router.patch('/:id/status', authenticateToken, requireRole(['technician', 'manager']), locationsController.updateLocationStatus);

// Management
router.post('/', authenticateToken, requireRole(['technician', 'manager']), locationsController.createLocation);
router.put('/:id', authenticateToken, requireRole(['technician', 'manager']), locationsController.updateLocation);
router.delete('/:id', authenticateToken, requireRole(['manager']), locationsController.deleteLocation);

module.exports = router;
