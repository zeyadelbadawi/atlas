/**
 * B0-LRN-05 / B0-COM-05 — currency pickers offer the supported list (EGP),
 * plus a legacy stored value so it is still shown; a price with no
 * currency displays as EGP, never USD.
 */
import { describe, expect, it } from 'vitest';
import { currencyOptions, DEFAULT_DISPLAY_CURRENCY } from './currency.utils';
import { formatCoursePricing } from '@/features/course/utils/course-pricing.utils';

describe('currencyOptions', () => {
  it('offers EGP only for a new or EGP value', () => {
    expect(currencyOptions()).toEqual(['EGP']);
    expect(currencyOptions('EGP')).toEqual(['EGP']);
  });

  it('keeps a legacy stored value visible, without offering others', () => {
    expect(currencyOptions('USD')).toEqual(['EGP', 'USD']);
  });
});

describe('price display fallback', () => {
  it('is EGP', () => {
    expect(DEFAULT_DISPLAY_CURRENCY).toBe('EGP');
    const t = ((key: string) => key) as never;
    expect(formatCoursePricing({ type: 'paid', amount: 490 }, t)).toContain(
      'EGP'
    );
  });
});
