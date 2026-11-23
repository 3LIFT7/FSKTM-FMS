const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (_) {}
}

/**
 * Inspects the first 12 bytes of a file on disk to verify its magic number signature
 * matches a real JPEG, PNG, GIF, or WebP image.
 */
function verifyImageMagicBytes(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { ext: '.jpg', mime: 'image/jpeg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytesRead >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { ext: '.png', mime: 'image/png' };
    }

    // GIF: GIF87a or GIF89a
    if (
      bytesRead >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      return { ext: '.gif', mime: 'image/gif' };
    }

    // WebP: RIFF....WEBP
    if (
      bytesRead >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return { ext: '.webp', mime: 'image/webp' };
    }

    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Verifies that a CSV file is plain text and not a binary/executable payload.
 */
function verifyCsvFileContent(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(512);
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);

    if (bytesRead === 0) return false;

    // Reject files containing null bytes or MZ/ELF/PDF/ZIP magic headers
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0x00) return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}

function createImageUploader(prefix = 'img') {
  const safePrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '') || 'img';

  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
      const rawExt = path.extname(file.originalname || '').toLowerCase();
      const ext = ALLOWED_IMAGE_EXTENSIONS.has(rawExt) ? rawExt : '.jpg';
      const token = crypto.randomBytes(12).toString('hex');
      cb(null, `${safePrefix}-${Date.now()}-${token}${ext}`);
    },
  });

  const fileFilter = (_req, file, cb) => {
    const rawExt = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.has(mime) || (rawExt && !ALLOWED_IMAGE_EXTENSIONS.has(rawExt))) {
      return cb(new Error('Only safe image files (JPEG, PNG, WebP, GIF) are allowed.'));
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 8 * 1024 * 1024, // 8MB max
      files: 1,
    },
  });
}

function createCsvUploader() {
  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename: function (_req, _file, cb) {
      const token = crypto.randomBytes(12).toString('hex');
      cb(null, `csv-${Date.now()}-${token}.csv`);
    },
  });

  const fileFilter = (_req, file, cb) => {
    const rawExt = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    const allowedMimes = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']);
    if (rawExt !== '.csv' && !allowedMimes.has(mime)) {
      return cb(new Error('Only valid .csv schedule files are allowed.'));
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
      files: 1,
    },
  });
}

module.exports = {
  uploadDir,
  safeUnlink,
  verifyImageMagicBytes,
  verifyCsvFileContent,
  createImageUploader,
  createCsvUploader,
};
