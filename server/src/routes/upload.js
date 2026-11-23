const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { createImageUploader, verifyImageMagicBytes, safeUnlink } = require('../utils/fileUpload');

const upload = createImageUploader('img');

// POST /api/upload - Single image upload with magic-byte validation
router.post('/', optionalAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Failed to upload image.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided in request.' });
    }

    const detected = verifyImageMagicBytes(req.file.path);
    if (!detected) {
      safeUnlink(req.file.path);
      return res.status(400).json({
        error: 'Invalid image file signature. Only authentic JPEG, PNG, WebP, and GIF images are accepted.',
      });
    }

    const publicUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      url: publicUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: detected.mime,
    });
  });
});

module.exports = router;
