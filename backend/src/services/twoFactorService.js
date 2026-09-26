const crypto = require('crypto');
const logger = require('../config/logger');

// Optional qrcode library
let qrcodeLib;
try {
  qrcodeLib = require('qrcode');
} catch {
  // lazy loaded if needed
}

// RFC 4648 Base32 alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

class TwoFactorService {
  /**
   * Generate a random 160-bit Base32 TOTP secret
   */
  generateSecret() {
    const randomBytes = crypto.randomBytes(20);
    return base32Encode(randomBytes);
  }

  /**
   * Generate standard otpauth URI
   */
  getOtpAuthUrl({ secret, accountName, issuer = 'ChurchOS' }) {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Generate QR Code as Data URL
   */
  async generateQRCode(otpAuthUrl) {
    if (qrcodeLib && typeof qrcodeLib.toDataURL === 'function') {
      try {
        return await qrcodeLib.toDataURL(otpAuthUrl, { width: 280, margin: 2 });
      } catch (err) {
        logger.warn('Failed to generate QR with qrcode lib, using fallback:', { error: err.message });
      }
    }
    // Fallback simple SVG Data URL or encoded URI
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(otpAuthUrl)}`;
  }

  /**
   * Calculate TOTP for a given timestamp
   */
  generateToken(secret, timeMs = Date.now()) {
    const epochSeconds = Math.floor(timeMs / 1000);
    const timeStep = 30;
    const counter = Math.floor(epochSeconds / timeStep);

    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter), 0);

    const key = base32Decode(secret);
    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const strCode = (code % 1000000).toString();
    return strCode.padStart(6, '0');
  }

  /**
   * Verify TOTP token with +/- 1 time step window for clock drift
   */
  verifyToken(secret, token) {
    if (!secret || !token) return false;
    const cleanToken = String(token).trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return false;

    const now = Date.now();
    const windows = [-30000, 0, 30000]; // Check previous, current, next 30s window

    for (const offset of windows) {
      const calculated = this.generateToken(secret, now + offset);
      if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(calculated))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate 8 recovery backup codes
   */
  generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars (e.g. 4B8F-9C2A)
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }
}

const twoFactorService = new TwoFactorService();
module.exports = twoFactorService;
