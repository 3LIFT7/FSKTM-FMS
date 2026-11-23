const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createCsvUploader, verifyCsvFileContent, safeUnlink } = require('../utils/fileUpload');

const upload = createCsvUploader();

function uploadCsvFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Invalid CSV file upload.' });
    }
    if (req.file && !verifyCsvFileContent(req.file.path)) {
      safeUnlink(req.file.path);
      return res.status(400).json({ error: 'Uploaded file is not a valid text/CSV document.' });
    }
    next();
  });
}

// Manager or Technician can import CSV schedule
router.post(
  '/import-csv',
  authenticateToken,
  requireRole(['manager', 'technician']),
  uploadCsvFile,
  scheduleController.importCsvSchedule
);

module.exports = router;
