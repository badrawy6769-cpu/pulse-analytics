import { describe, it, expect } from 'vitest';
import {
  generateMonthlyMetrics,
  generateSubscribers,
  getPlans,
  computeKpis,
  computePlanBreakdown,
} from '../js/data.js';

describe('generateMonthlyMetrics', () => {
  it('returns exactly 12 months of data', () => {
    const months = generateMonthlyMetrics();
    expect(months).toHaveLength(12);
  });

  it('is deterministic for the same seed', () => {
    const a = generateMonthlyMetrics(1);
    const b = generateMonthlyMetrics(1);
    expect(a).toEqual(b);
  });

  it('produces different data for different seeds', () => {
    const a = generateMonthlyMetrics(1);
    const b = generateMonthlyMetrics(2);
    expect(a).not.toEqual(b);
  });

  it('never produces negative MRR, customers, or churn rate', () => {
    const months = generateMonthlyMetrics();
    months.forEach((m) => {
      expect(m.mrr).toBeGreaterThan(0);
      expect(m.customers).toBeGreaterThan(0);
      expect(m.churnRate).toBeGreaterThanOrEqual(0);
      expect(m.newCustomers).toBeGreaterThanOrEqual(0);
      expect(m.churnedCustomers).toBeGreaterThanOrEqual(0);
    });
  });

  it('each month has a label string', () => {
    const months = generateMonthlyMetrics();
    months.forEach((m) => expect(typeof m.label).toBe('string'));
  });
});

describe('generateSubscribers', () => {
  it('returns the requested number of subscribers', () => {
    expect(generateSubscribers(20)).toHaveLength(20);
  });

  it('is deterministic for the same seed', () => {
    const a = generateSubscribers(10, 5);
    const b = generateSubscribers(10, 5);
    expect(a).toEqual(b);
  });

  it('gives every subscriber a valid status', () => {
    const subs = generateSubscribers(30);
    const validStatuses = ['active', 'past_due', 'canceled'];
    subs.forEach((s) => expect(validStatuses).toContain(s.status));
  });

  it('gives every subscriber a plan that exists in getPlans()', () => {
    const subs = generateSubscribers(30);
    const planIds = getPlans().map((p) => p.id);
    subs.forEach((s) => expect(planIds).toContain(s.plan));
  });

  it('generates unique subscriber ids', () => {
    const subs = generateSubscribers(50);
    const ids = new Set(subs.map((s) => s.id));
    expect(ids.size).toBe(subs.length);
  });
});

describe('getPlans', () => {
  it('returns a non-empty list of plans with required fields', () => {
    const plans = getPlans();
    expect(plans.length).toBeGreaterThan(0);
    plans.forEach((p) => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('price');
      expect(p.price).toBeGreaterThan(0);
    });
  });
});

describe('computeKpis', () => {
  it('derives KPIs from the last month of data and subscriber list', () => {
    const monthly = generateMonthlyMetrics(1);
    const subscribers = generateSubscribers(20, 1);
    const kpis = computeKpis(monthly, subscribers);

    expect(kpis.mrr).toBe(monthly[monthly.length - 1].mrr);
    expect(kpis.arr).toBe(monthly[monthly.length - 1].mrr * 12);
    expect(kpis.totalSubscribers).toBe(subscribers.length);
    expect(kpis.activeSubscribers).toBe(subscribers.filter((s) => s.status === 'active').length);
  });
});

describe('computePlanBreakdown', () => {
  it('only counts active subscribers toward plan MRR', () => {
    const subscribers = [
      { plan: 'starter', status: 'active' },
      { plan: 'starter', status: 'canceled' },
      { plan: 'growth', status: 'active' },
    ];
    const breakdown = computePlanBreakdown(subscribers);
    const starter = breakdown.find((p) => p.id === 'starter');
    const growth = breakdown.find((p) => p.id === 'growth');

    expect(starter.subscribers).toBe(1);
    expect(growth.subscribers).toBe(1);
  });

  it('returns one entry per known plan', () => {
    const breakdown = computePlanBreakdown([]);
    expect(breakdown).toHaveLength(getPlans().length);
    breakdown.forEach((p) => expect(p.mrr).toBe(0));
  });
});
