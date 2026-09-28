// Subscription plan catalogue — single source of truth.
// Only annual billing is offered. Prices are in NGN (kobo for Paystack = amount * 100).

const PLANS = {
  starter: {
    code: 'starter',
    name: 'Starter',
    priceNgn: 250000,
    annualPriceNgn: 250000,
    billingInterval: 'annual',
    branchLimit: 1,
    memberLimit: null, // soft cap enforced by upgrade prompts, not hard
    multiBranch: false,
    description: 'Single branch — ₦250,000 / year (billed annually).',
  },
  growth: {
    code: 'growth',
    name: 'Growth',
    priceNgn: 600000,
    annualPriceNgn: 600000,
    billingInterval: 'annual',
    branchLimit: 3,
    memberLimit: 500,
    multiBranch: true,
    description: 'Up to 3 branches or 500 members — ₦600,000 / year (billed annually).',
  },
  enterprise: {
    code: 'enterprise',
    name: 'Enterprise',
    priceNgn: null, // contact admin
    annualPriceNgn: null,
    billingInterval: 'annual',
    branchLimit: null, // unlimited
    memberLimit: null, // unlimited
    multiBranch: true,
    description: '10+ branches or 5,000+ members (annual custom billing).',
  },
};

const PLAN_CODES = Object.keys(PLANS);

function getPlan(code) {
  return PLANS[code] || null;
}

module.exports = { PLANS, PLAN_CODES, getPlan };
