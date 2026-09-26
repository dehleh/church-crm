const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

// Lazy load AWS S3 SDK to prevent crashing if not yet installed
let S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand;
try {
  const s3 = require('@aws-sdk/client-s3');
  S3Client = s3.S3Client;
  PutObjectCommand = s3.PutObjectCommand;
  DeleteObjectCommand = s3.DeleteObjectCommand;
  GetObjectCommand = s3.GetObjectCommand;
} catch {
  // S3 SDK optional in local dev
}

class StorageService {
  constructor() {
    this.bucket = process.env.S3_BUCKET || process.env.R2_BUCKET || process.env.AWS_BUCKET || '';
    this.endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || '';
    this.region = process.env.S3_REGION || process.env.AWS_REGION || 'auto';
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
    this.publicBaseUrl = (process.env.STORAGE_PUBLIC_URL || process.env.CDN_URL || '').replace(/\/+$/, '');
    this.uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');

    this.isS3Configured = Boolean(
      S3Client && this.bucket && this.accessKeyId && this.secretAccessKey
    );

    if (this.isS3Configured) {
      const clientConfig = {
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      };
      if (this.endpoint) {
        clientConfig.endpoint = this.endpoint;
      }
      this.s3Client = new S3Client(clientConfig);
      logger.info('☁️ Cloud Object Storage initialized (S3/R2 compatible)');
    } else {
      // Ensure local upload directories exist
      ['avatars', 'branding', 'media', 'documents', 'general'].forEach(sub => {
        const p = path.join(this.uploadDir, sub);
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
      });
      logger.info('💾 Local Disk Storage initialized (uploads/ folder)');
    }
  }

  /**
   * Upload a file buffer or stream to cloud storage or local disk
   */
  async uploadFile({ buffer, filename, mimetype = 'application/octet-stream', folder = 'general' }) {
    const ext = path.extname(filename || '') || '.bin';
    const uniqueKey = `${folder}/${Date.now()}-${uuidv4()}${ext}`;

    if (this.isS3Configured && this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: uniqueKey,
          Body: buffer,
          ContentType: mimetype,
          ACL: 'public-read',
        });
        await this.s3Client.send(command);

        const url = this.publicBaseUrl
          ? `${this.publicBaseUrl}/${uniqueKey}`
          : (this.endpoint ? `${this.endpoint}/${this.bucket}/${uniqueKey}` : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${uniqueKey}`);

        return {
          storage: 's3',
          key: uniqueKey,
          url,
          filename,
          mimetype,
          size: buffer.length,
        };
      } catch (err) {
        logger.error('S3 upload error, falling back to local disk:', { error: err.message });
      }
    }

    // Local Disk Fallback
    const targetDir = path.join(this.uploadDir, folder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const localFilePath = path.join(targetDir, `${Date.now()}-${uuidv4()}${ext}`);
    fs.writeFileSync(localFilePath, buffer);

    const relativeUrl = `/uploads/${folder}/${path.basename(localFilePath)}`;
    return {
      storage: 'local',
      key: relativeUrl,
      url: relativeUrl,
      filename,
      mimetype,
      size: buffer.length,
    };
  }

  /**
   * Delete a file by URL or key
   */
  async deleteFile(keyOrUrl) {
    if (!keyOrUrl) return;

    if (this.isS3Configured && this.s3Client && !keyOrUrl.startsWith('/uploads/')) {
      try {
        const key = keyOrUrl.replace(/^https?:\/\/[^/]+\//, '');
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }));
        return true;
      } catch (err) {
        logger.warn('S3 delete notice:', { error: err.message, keyOrUrl });
      }
    }

    // Local file delete
    try {
      const relPath = keyOrUrl.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.uploadDir, relPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return true;
    } catch (err) {
      logger.warn('Local file delete notice:', { error: err.message, keyOrUrl });
    }
  }
}

const storageService = new StorageService();
module.exports = storageService;
