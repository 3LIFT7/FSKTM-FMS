const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const issuesController = require('../controllers/issuesController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `issue-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

router.get('/', authenticateToken, issuesController.getIssues);
router.post('/', authenticateToken, upload.single('photo'), issuesController.createIssue);
router.patch('/:id/status', authenticateToken, requireRole(['technician', 'manager']), issuesController.updateIssueStatus);

module.exports = router;
