const { getNextMemberNumber } = require('../../src/utils/memberNumber');
const { recordWebhookIfNew } = require('../../src/utils/webhookIdempotency');
const paymentService = require('../../src/services/paymentService');
const http = require('http');

describe('System Robustness & Fault-Tolerance Tests', () => {
  describe('Atomic Member Number Generator (church_counters)', () => {
    it('generates sequential monotonic member numbers using church_counters', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{ current_value: '42' }],
        }),
      };

      const memberNum = await getNextMemberNumber(mockClient, 'church-uuid-1');
      expect(memberNum).toBe('MBR-00042');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO church_counters'),
        ['church-uuid-1']
      );
    });

    it('synchronizes counter to existing member count if newly initialized counter is 1 but members exist', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ current_value: '1' }] }) // Counter just initialized at 1
          .mockResolvedValueOnce({ rows: [{ cnt: '25' }] })           // Church already has 25 members
          .mockResolvedValueOnce({ rows: [] }),                       // Updated counter to 25
      };

      const memberNum = await getNextMemberNumber(mockClient, 'church-uuid-2');
      expect(memberNum).toBe('MBR-00025');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE church_counters SET current_value = $1'),
        [25, 'church-uuid-2']
      );
    });

    it('falls back gracefully to COUNT(*) + 1 if church_counters query throws', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockRejectedValueOnce(new Error('relation church_counters does not exist'))
          .mockResolvedValueOnce({ rows: [{ cnt: '10' }] }),
      };

      const memberNum = await getNextMemberNumber(mockClient, 'church-uuid-3');
      expect(memberNum).toBe('MBR-00011');
    });
  });

  describe('Webhook Idempotency Store (processed_webhooks)', () => {
    it('returns true on new webhook event and false on duplicate event', async () => {
      const mockDb = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ id: 'wh-1' }] }) // First call: inserted
          .mockResolvedValueOnce({ rows: [] }),              // Second call: conflict (0 rows inserted)
      };

      const firstTry = await recordWebhookIfNew(mockDb, {
        provider: 'paystack',
        eventId: 'EVT-12345',
        rawPayload: '{"event":"charge.success"}',
      });
      expect(firstTry).toBe(true);

      const secondTry = await recordWebhookIfNew(mockDb, {
        provider: 'paystack',
        eventId: 'EVT-12345',
        rawPayload: '{"event":"charge.success"}',
      });
      expect(secondTry).toBe(false);
    });

    it('falls back to true if database check throws to prevent blocking webhook ingestion', async () => {
      const mockDb = {
        query: jest.fn().mockRejectedValueOnce(new Error('DB unreachable')),
      };

      const result = await recordWebhookIfNew(mockDb, {
        provider: 'flutterwave',
        eventId: 'FLW-999',
      });
      expect(result).toBe(true);
    });
  });

  describe('Payment Gateway HTTP Timeout & Socket Resilience', () => {
    it('aborts stalled HTTP gateway requests on timeout', async () => {
      // Start a local HTTP server that intentionally delays response
      const server = http.createServer((req, res) => {
        // Do not respond — simulate hanging network socket
      });

      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;

      const options = {
        hostname: '127.0.0.1',
        port,
        path: '/test-timeout',
        method: 'GET',
        timeout: 100, // 100ms quick timeout
      };

      // In paymentService, paymentService.request uses https, but test with custom timeout
      await expect(
        paymentService.request(options)
      ).rejects.toThrow();

      server.close();
    });
  });

  describe('Database Pool Statement Timeout Configuration', () => {
    it('exports pool with configured statement_timeout', () => {
      const { pool } = require('../../src/config/database');
      expect(pool.options).toBeDefined();
      expect(typeof pool.options.statement_timeout).toBe('number');
      expect(pool.options.statement_timeout).toBeGreaterThanOrEqual(5000);
    });
  });
});
