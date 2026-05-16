// Subscription plan catalogue — single source of truth.
// Prices are in NGN (kobo for Paystack = amount * 100).

const PLANS = {
  starter: {
    code: 'starter',
    name: 'Starter',
    priceNgn: 25000,
    branchLimit: 1,
    memberLimit: null, // soft cap enforced by upgrade prompts, not hard
    multiBranch: false,
    description: 'Single branch — best for one location.',
  },
  growth: {
    code: 'growth',
    name: 'Growth',
    priceNgn: 60000,
    branchLimit: 3,
    memberLimit: 500,
    multiBranch: true,
    description: 'Up to 3 branches or 500 members.',
  },
  enterprise: {
    code: 'enterprise',
    name: 'Enterprise',
    priceNgn: null, // contact admin
    branchLimit: null, // unlimited
    memberLimit: null, // unlimited
    multiBranch: true,
    description: '10+ branches or 5000+ members. Contact admin.',
  },
};

const PLAN_CODES = Object.keys(PLANS);

function getPlan(code) {
  return PLANS[code] || null;
}

module.exports = { PLANS, PLAN_CODES, getPlan };
