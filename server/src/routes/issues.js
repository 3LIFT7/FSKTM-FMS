const express = require('express');
const router = express.Router();
const issuesController = require('../controllers/issuesController');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const { createImageUploader, verifyImageMagicBytes, safeUnlink } = require('../utils/fileUpload');

const upload = createImageUploader('issue');

function uploadIssuePhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Invalid photo upload.' });
    }
    if (req.file) {
      const detected = verifyImageMagicBytes(req.file.path);
      if (!detected) {
        safeUnlink(req.file.path);
        return res.status(400).json({
          error: 'Invalid uploaded image content. Only authentic JPEG, PNG, WebP, and GIF files are allowed.',
        });
      }
    }
    next();
  });
}

router.get('/', authenticateToken, issuesController.getIssues);
router.post('/', optionalAuth, uploadIssuePhoto, issuesController.createIssue);
router.patch('/:id/status', authenticateToken, requireRole(['technician', 'manager']), issuesController.updateIssueStatus);

module.exports = router;
