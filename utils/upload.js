const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_TYPES = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|zip/i;

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
]);

const DEFAULT_ATTACHMENT_BODY = (count) => `Sent ${count} file(s)`;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1);
    if (ALLOWED_TYPES.test(ext) && ALLOWED_MIMETYPES.has(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error('File type not allowed'));
  }
});

module.exports = { upload, UPLOADS_DIR, DEFAULT_ATTACHMENT_BODY };
