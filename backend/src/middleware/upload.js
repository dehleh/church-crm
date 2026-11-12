const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || 'uploads');

// Ensure upload directories exist on volume / disk
['media', 'avatars', 'documents', 'branding', 'logos', 'covers', 'general'].forEach((sub) => {
  const dir = path.join(uploadDir, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const sub = req.uploadCategory || 'media';
    const target = path.join(uploadDir, sub);
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    cb(null, target);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const ALLOWED_TYPES = {
  media: /\.(mp3|mp4|wav|m4a|webm|ogg|pdf|doc|docx|jpg|jpeg|png|gif|webp)$/i,
  avatars: /\.(jpg|jpeg|png|gif|webp)$/i,
  documents: /\.(pdf|doc|docx|xls|xlsx|csv|txt)$/i,
  branding: /\.(jpg|jpeg|png|gif|webp|ico)$/i,
  logos: /\.(jpg|jpeg|png|gif|webp|ico)$/i,
  covers: /\.(jpg|jpeg|png|gif|webp)$/i,
};

const fileFilter = (req, file, cb) => {
  const category = req.uploadCategory || 'media';
  const pattern = ALLOWED_TYPES[category] || ALLOWED_TYPES.media;
  const ext = path.extname(file.originalname).toLowerCase();
  if (pattern.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not allowed for ${category} uploads`), false);
  }
};

const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024;

const upload = multer({ storage, fileFilter, limits: { fileSize: maxSize } });

// Middleware factory: sets the upload sub-folder
const uploadFor = (category) => (req, _res, next) => {
  req.uploadCategory = category;
  next();
};

module.exports = { upload, uploadFor, uploadDir };
