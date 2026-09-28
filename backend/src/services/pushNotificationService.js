const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const { query } = require('../config/database');

let webpush = null;
try {
  webpush = require('web-push');
} catch (e) {
  logger.warn('web-push module not yet loaded, will initialize once installed');
}

class PushNotificationService {
  constructor() {
    this.initialized = false;
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    this.init();
  }

  init() {
    if (!webpush) {
      try {
        webpush = require('web-push');
      } catch {
        return;
      }
    }

    if (!this.vapidPublicKey || !this.vapidPrivateKey) {
      // Check persistent keys file
      const keysFile = path.join(__dirname, '../../.vapid.json');
      if (fs.existsSync(keysFile)) {
        try {
          const saved = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
          this.vapidPublicKey = saved.publicKey;
          this.vapidPrivateKey = saved.privateKey;
        } catch {}
      }

      if (!this.vapidPublicKey || !this.vapidPrivateKey) {
        try {
          const generated = webpush.generateVAPIDKeys();
          this.vapidPublicKey = generated.publicKey;
          this.vapidPrivateKey = generated.privateKey;
          fs.writeFileSync(keysFile, JSON.stringify(generated, null, 2), 'utf8');
          logger.info('Generated persistent VAPID keys for Web Push Notifications');
        } catch (e) {
          logger.warn('Failed to generate VAPID keys:', { error: e.message });
          return;
        }
      }
    }

    try {
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:notifications@themobilemissionary.org',
        this.vapidPublicKey,
        this.vapidPrivateKey
      );
      this.initialized = true;
      logger.info('Web Push Service initialized with VAPID configuration');
    } catch (err) {
      logger.warn('Web Push VAPID setup failed:', { error: err.message });
    }
  }

  getPublicKey() {
    if (!this.initialized) this.init();
    return this.vapidPublicKey;
  }

  /**
   * Save or update a member's browser/phone push subscription
   */
  async subscribe({ churchId, memberId, subscription, userAgent }) {
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new Error('Invalid subscription object');
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    const { rows } = await query(
      `INSERT INTO member_push_subscriptions (
        church_id, member_id, endpoint, keys_p256dh, keys_auth, user_agent, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (endpoint)
      DO UPDATE SET
        church_id = EXCLUDED.church_id,
        member_id = EXCLUDED.member_id,
        keys_p256dh = EXCLUDED.keys_p256dh,
        keys_auth = EXCLUDED.keys_auth,
        user_agent = EXCLUDED.user_agent,
        updated_at = NOW()
      RETURNING *`,
      [churchId, memberId, endpoint, p256dh, auth, userAgent || null]
    );

    // Also ensure notification preferences row exists
    await query(
      `INSERT INTO member_notification_preferences (church_id, member_id)
       VALUES ($1, $2)
       ON CONFLICT (church_id, member_id) DO NOTHING`,
      [churchId, memberId]
    );

    return rows[0];
  }

  /**
   * Remove a subscription by endpoint
   */
  async unsubscribe({ endpoint }) {
    await query(`DELETE FROM member_push_subscriptions WHERE endpoint = $1`, [endpoint]);
    return { success: true };
  }

  /**
   * Send a push notification to all devices belonging to a member
   */
  async sendPushToMember(memberId, payload) {
    if (!this.initialized) this.init();
    if (!webpush) return { sent: 0, failed: 0 };

    const { rows: subs } = await query(
      `SELECT mps.*, mnp.push_enabled
       FROM member_push_subscriptions mps
       LEFT JOIN member_notification_preferences mnp
         ON mnp.member_id = mps.member_id AND mnp.church_id = mps.church_id
       WHERE mps.member_id = $1`,
      [memberId]
    );

    if (!subs.length) return { sent: 0, failed: 0 };
    if (subs[0].push_enabled === false) return { sent: 0, optedOut: true };

    let sent = 0;
    let failed = 0;

    const bodyString = JSON.stringify(payload);

    for (const sub of subs) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, bodyString);
        sent++;
      } catch (err) {
        failed++;
        // If expired or unsubscribed on browser side, cleanup
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query(`DELETE FROM member_push_subscriptions WHERE id = $1`, [sub.id]);
        } else {
          logger.warn('Web push delivery failed to endpoint:', { status: err.statusCode, message: err.message });
        }
      }
    }

    return { sent, failed };
  }

  /**
   * Send broadcast push notification to members of a church
   */
  async sendPushToChurch(churchId, payload, { topic = 'general' } = {}) {
    if (!this.initialized) this.init();
    if (!webpush) return { sent: 0, failed: 0 };

    let topicFilter = '';
    if (topic === 'devotionals') topicFilter = 'AND (mnp.notify_devotionals IS NULL OR mnp.notify_devotionals = true)';
    else if (topic === 'prayers') topicFilter = 'AND (mnp.notify_prayers IS NULL OR mnp.notify_prayers = true)';
    else if (topic === 'announcements') topicFilter = 'AND (mnp.notify_announcements IS NULL OR mnp.notify_announcements = true)';
    else if (topic === 'events') topicFilter = 'AND (mnp.notify_events IS NULL OR mnp.notify_events = true)';
    else if (topic === 'giving') topicFilter = 'AND (mnp.notify_giving IS NULL OR mnp.notify_giving = true)';

    const { rows: subs } = await query(
      `SELECT mps.*
       FROM member_push_subscriptions mps
       LEFT JOIN member_notification_preferences mnp
         ON mnp.member_id = mps.member_id AND mnp.church_id = mps.church_id
       WHERE mps.church_id = $1
         AND (mnp.push_enabled IS NULL OR mnp.push_enabled = true)
         ${topicFilter}`,
      [churchId]
    );

    if (!subs.length) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;
    const bodyString = JSON.stringify(payload);

    for (const sub of subs) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, bodyString);
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query(`DELETE FROM member_push_subscriptions WHERE id = $1`, [sub.id]);
        }
      }
    }

    return { sent, failed };
  }
}

const pushNotificationService = new PushNotificationService();
module.exports = pushNotificationService;
