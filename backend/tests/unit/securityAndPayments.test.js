const twoFactorService = require('../../src/services/twoFactorService');
const paymentService = require('../../src/services/paymentService');
const storageService = require('../../src/services/storageService');
const crypto = require('crypto');

describe('Security, 2FA, and Payment Gateway Unit Tests', () => {
  describe('Two-Factor Authentication (TOTP)', () => {
    it('should generate a valid Base32 secret', () => {
      const secret = twoFactorService.generateSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThanOrEqual(16);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it('should generate and verify 6-digit TOTP tokens accurately', () => {
      const secret = twoFactorService.generateSecret();
      const token = twoFactorService.generateToken(secret);
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(6);
      expect(/^\d{6}$/.test(token)).toBe(true);

      const isValid = twoFactorService.verifyToken(secret, token);
      expect(isValid).toBe(true);
    });

    it('should reject invalid or tampered TOTP tokens', () => {
      const secret = twoFactorService.generateSecret();
      expect(twoFactorService.verifyToken(secret, '000000')).toBe(false);
      expect(twoFactorService.verifyToken(secret, 'invalid')).toBe(false);
      expect(twoFactorService.verifyToken(secret, '')).toBe(false);
    });

    it('should generate 8 formatted backup recovery codes', () => {
      const codes = twoFactorService.generateBackupCodes(8);
      expect(Array.isArray(codes)).toBe(true);
      expect(codes).toHaveLength(8);
      codes.forEach((code) => {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      });
      // Ensure all 8 codes are unique
      const unique = new Set(codes);
      expect(unique.size).toBe(8);
    });
  });

  describe('Payment Gateway Security', () => {
    it('should verify valid Paystack HMAC-SHA512 webhook signatures', () => {
      const secretKey = 'sk_test_mock_secret_key_123';
      const body = JSON.stringify({ event: 'charge.success', data: { reference: 'GIV-123' } });
      const signature = crypto.createHmac('sha512', secretKey).update(body).digest('hex');

      const verified = paymentService.verifyPaystackSignature(body, signature, secretKey);
      expect(verified).toBe(true);
    });

    it('should reject forged or mismatched webhook signatures', () => {
      const secretKey = 'sk_test_mock_secret_key_123';
      const body = JSON.stringify({ event: 'charge.success', data: { reference: 'GIV-123' } });

      const verified = paymentService.verifyPaystackSignature(body, 'forged_fake_signature', secretKey);
      expect(verified).toBe(false);
    });
  });

  describe('Storage Service Resilience', () => {
    it('should handle file buffer uploads and return public file access URL', async () => {
      const buffer = Buffer.from('mock image file content');
      const uploaded = await storageService.uploadFile({
        buffer,
        filename: 'avatar.png',
        mimetype: 'image/png',
        folder: 'avatars',
      });

      expect(uploaded).toBeDefined();
      expect(uploaded.url).toBeDefined();
      expect(typeof uploaded.url).toBe('string');
      expect(uploaded.size).toBe(buffer.length);
    });
  });
});
