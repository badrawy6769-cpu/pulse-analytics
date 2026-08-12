/**
 * Deterministic sample dataset for the subscription analytics dashboard.
 * All data is synthetic and generated with a seeded PRNG so results are
 * stable across reloads and in tests (no Math.random directly here).
 */

// Mulberry32 seeded PRNG for deterministic "random" sample data.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLANS = [
  { id: 'starter', name: 'Starter', price: 19, color: '#6b7cff' },
  { id: 'growth', name: 'Growth', price: 49, color: '#22c55e' },
  { id: 'scale', name: 'Scale', price: 99, color: '#f59e0b' },
  { id: 'enterprise', name: 'Enterprise', price: 249, color: '#ef4444' },
];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Generate 12 months of MRR / churn / new-subscriber sample data ending
 * at the current month, with a gentle upward trend plus seeded noise.
 */
export function generateMonthlyMetrics(seed = 42) {
  const rand = mulberry32(seed);
  const months = [];
  const now = new Date();
  let baseMrr = 8200;
  let baseCustomers = 210;

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const growthFactor = 1 + 0.04 + (rand() - 0.5) * 0.03;
    baseMrr = Math.round(baseMrr * growthFactor);
    const churnRate = 0.02 + rand() * 0.025;
    const newCustomers = Math.round(8 + rand() * 14);
    const churnedCustomers = Math.round(baseCustomers * churnRate);
    baseCustomers = Math.max(1, baseCustomers + newCustomers - churnedCustomers);

    months.push({
      label: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      mrr: baseMrr,
      customers: baseCustomers,
      newCustomers,
      churnedCustomers,
      churnRate,
    });
  }
  return months;
}

/**
 * Generate a sample list of subscribers distributed across plans.
 */
export function generateSubscribers(count = 48, seed = 7) {
  const rand = mulberry32(seed);
  const firstNames = ['Ava', 'Liam', 'Noah', 'Mia', 'Zoe', 'Ethan', 'Ivy', 'Leo', 'Nora', 'Kai', 'Maya', 'Owen', 'Ruby', 'Finn', 'Sara', 'Theo'];
  const lastNames = ['Chen', 'Patel', 'Garcia', 'Smith', 'Kim', 'Novak', 'Silva', 'Rossi', 'Meyer', 'Diaz', 'Nguyen', 'Cohen'];
  const statuses = ['active', 'active', 'active', 'past_due', 'canceled'];

  const subscribers = [];
  for (let i = 0; i < count; i++) {
    const plan = PLANS[Math.floor(rand() * PLANS.length)];
    const status = statuses[Math.floor(rand() * statuses.length)];
    const first = firstNames[Math.floor(rand() * firstNames.length)];
    const last = lastNames[Math.floor(rand() * lastNames.length)];
    const daysAgo = Math.floor(rand() * 360) + 1;
    const joined = new Date(Date.now() - daysAgo * 86400000);

    subscribers.push({
      id: `sub_${1000 + i}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      plan: plan.id,
      planName: plan.name,
      mrr: plan.price,
      status,
      joinedAt: joined.toISOString(),
    });
  }
  return subscribers;
}

export function getPlans() {
  return PLANS;
}

/**
 * Aggregate top-level KPIs for the dashboard header cards.
 */
export function computeKpis(monthly, subscribers) {
  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2] || last;
  const activeSubscribers = subscribers.filter((s) => s.status === 'active').length;
  const arr = last.mrr * 12;

  return {
    mrr: last.mrr,
    mrrPrev: prev.mrr,
    arr,
    activeSubscribers,
    totalSubscribers: subscribers.length,
    churnRate: last.churnRate,
    churnRatePrev: prev.churnRate,
    newCustomers: last.newCustomers,
  };
}

/**
 * Breakdown of MRR contribution per plan, for the plan-mix chart.
 */
export function computePlanBreakdown(subscribers) {
  const plans = getPlans();
  return plans.map((plan) => {
    const planSubs = subscribers.filter((s) => s.plan === plan.id && s.status === 'active');
    return {
      ...plan,
      subscribers: planSubs.length,
      mrr: planSubs.length * plan.price,
    };
  });
}
