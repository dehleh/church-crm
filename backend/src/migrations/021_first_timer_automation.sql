-- ============================================================
-- 021: First-Timer Automated Follow-Up Sequences & Queue
-- ============================================================

CREATE TABLE IF NOT EXISTS first_timer_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Standard 3-Step Visitor Follow-Up',
  is_active BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[
    {
      "step": 1,
      "delayHours": 2,
      "channel": "whatsapp",
      "template": "Dear {{firstName}}, thank you for worshiping with us at {{churchName}} today! We were truly blessed to have you in service. Pastor {{pastorName}} and the entire church family welcome you warmly. We pray that God meets you at your point of need. Have a glorious week!"
    },
    {
      "step": 2,
      "delayHours": 72,
      "channel": "sms",
      "template": "Hello {{firstName}}! Pastor {{pastorName}} and your {{churchName}} family are praying for you this week. If you have any prayer requests or need counseling, feel free to reply or visit us again this Sunday!"
    },
    {
      "step": 3,
      "delayHours": 144,
      "channel": "whatsapp",
      "template": "Happy weekend {{firstName}}! We are looking forward to having you with us again this Sunday at {{churchName}}. Join us for an inspiring time in God''s presence. Service starts at 9:00 AM. See you there!"
    }
  ]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id)
);

CREATE TABLE IF NOT EXISTS first_timer_sequence_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  first_timer_id UUID NOT NULL REFERENCES first_timers(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp', -- whatsapp | sms | email
  recipient_phone VARCHAR(50),
  recipient_email VARCHAR(255),
  message_body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled', -- scheduled | sent | failed | cancelled | skipped
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ft_sequence_queue_status_sched
  ON first_timer_sequence_queue(status, scheduled_for)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_ft_sequence_queue_church_ft
  ON first_timer_sequence_queue(church_id, first_timer_id);
