const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads') });

// Manager or Technician can import CSV schedule
router.post('/import-csv', authenticateToken, requireRole(['manager', 'technician']), upload.single('file'), scheduleController.importCsvSchedule);

module.exports = router;
