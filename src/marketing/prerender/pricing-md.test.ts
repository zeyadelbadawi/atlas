/**
 * `/pricing.md` is generated from the catalog response only (DL-38): plan
 * names, monthly and yearly prices in the catalog's currency, trial days and
 * a limits table, in catalog order, archived plans left out.
 */
import { describe, expect, it } from 'vitest';
import snapshot from '../data/plans.snapshot.json';
import type { Plan } from '@/types/plan.types';
import { buildPricingMarkdown, publishedPlans } from './pricing-md';
import { FIXTURE_CTX, FIXTURE_PLANS } from './test-fixtures';

describe('pricing.md', () => {
  const md = buildPricingMarkdown({
    plans: FIXTURE_PLANS,
    siteUrl: FIXTURE_CTX.siteUrl,
    buildDate: FIXTURE_CTX.buildDate,
  });

  it('lists active plans in catalog order with prices and trial terms', () => {
    expect(publishedPlans(FIXTURE_PLANS).map((plan) => plan.key)).toEqual(['starter', 'growth']);
    expect(md).toContain('| Plan | Monthly | Yearly | Trial |');
    expect(md).toContain('| Teacher | EGP 1,190 | — | No trial |');
    expect(md).toContain('| Academy | EGP 2,790 | EGP 27,900 | 14 days |');
    expect(md).not.toContain('Legacy');
    expect(md.indexOf('| Teacher |')).toBeLessThan(md.indexOf('| Academy |'));
  });

  it('has a limits table, with units and Unlimited', () => {
    expect(md).toContain('| Limit | Teacher | Academy |');
    expect(md).toContain('| Students | 100 | 400 |');
    expect(md).toContain('| Courses | 20 | Unlimited |');
    expect(md).toContain('| Video storage | 30 GB | 75 GB |');
    expect(md).not.toContain('Emails per academy');
  });

  it('escapes table separators in catalog text and dates the catalog', () => {
    expect(md).toContain('For a small team \\| one brand.');
    expect(md).toContain('as of 2026-10-20');
    expect(md).toContain('https://atlass.dpdns.org/pricing');
  });

  it('never says "free" and handles an empty catalog', () => {
    expect(md).not.toMatch(/\bfree\b/i);
    expect(
      buildPricingMarkdown({ plans: [], siteUrl: 'https://x', buildDate: '2026-01-01' })
    ).toContain('No plans are published');
  });

  it('renders the committed snapshot (the live response shape)', () => {
    const fromSnapshot = buildPricingMarkdown({
      plans: snapshot as unknown as Plan[],
      siteUrl: FIXTURE_CTX.siteUrl,
      buildDate: FIXTURE_CTX.buildDate,
    });
    for (const plan of snapshot as unknown as Plan[]) {
      expect(fromSnapshot).toContain(`| ${plan.nameLocalized?.en ?? plan.name} |`);
    }
  });
});
