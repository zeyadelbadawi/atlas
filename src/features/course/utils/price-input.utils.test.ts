/**
 * B3 (UX audit, V02/V14) — a typed price is read exactly or refused with
 * the reason; it is never silently changed.
 */
import { describe, expect, it } from 'vitest';
import {
  MAX_COURSE_PRICE,
  parsePriceInput,
  priceAmountFromInput,
  priceInputFromAmount,
  pricingIssue,
} from './price-input.utils';

describe('parsePriceInput', () => {
  it.each([
    ['12.50', 12.5],
    ['12,50', 12.5], // a decimal comma is a decimal point, never 1,250
    ['  99 ', 99],
    ['0.5', 0.5],
    ['١٢٫٥٠', 12.5], // Arabic-Indic digits and the Arabic decimal mark
    [490, 490],
  ])('reads %j as %d', (raw, value) => {
    expect(parsePriceInput(raw)).toEqual({ kind: 'ok', value });
  });

  it('refuses sub-unit precision instead of storing 0 (V02)', () => {
    const result = parsePriceInput('0.001');
    expect(result.kind).toBe('error');
    expect(result.kind === 'error' && result.message).toMatch(
      /^course:validation\.priceDecimals/
    );
  });

  it.each([
    '1e3',
    '-5',
    '+5',
    '1,250.00',
    '1.250,00',
    '12.5.0',
    'abc',
    '12 50',
  ])('refuses %j as a format (V14)', (raw) => {
    expect(parsePriceInput(raw)).toEqual({
      kind: 'error',
      message: 'course:validation.priceFormat',
    });
  });

  it('refuses an amount above the maximum, naming it', () => {
    const result = parsePriceInput(String(MAX_COURSE_PRICE + 1));
    expect(result.kind === 'error' && result.message).toBe(
      'course:validation.priceTooHigh|{"max":"1,000,000"}'
    );
    expect(parsePriceInput(String(MAX_COURSE_PRICE)).kind).toBe('ok');
  });

  it('treats blank as empty', () => {
    expect(parsePriceInput('')).toEqual({ kind: 'empty' });
    expect(parsePriceInput(undefined)).toEqual({ kind: 'empty' });
  });
});

describe('pricingIssue', () => {
  it('a paid course needs a price above zero, "0.00" included', () => {
    expect(pricingIssue({ pricingType: 'paid', pricingAmount: '0.00' })).toBe(
      'course:validation.priceRequired'
    );
    expect(pricingIssue({ pricingType: 'paid', pricingAmount: '' })).toBe(
      'course:validation.priceRequired'
    );
    expect(
      pricingIssue({ pricingType: 'paid', pricingAmount: '12,50' })
    ).toBeNull();
  });

  it('a free course ignores the hidden price field', () => {
    expect(
      pricingIssue({ pricingType: 'free', pricingAmount: '1e3' })
    ).toBeNull();
  });
});

describe('conversions', () => {
  it('sends the parsed amount and shows stored amounts with two decimals', () => {
    expect(priceAmountFromInput('12,50')).toBe(12.5);
    expect(priceAmountFromInput('0.001')).toBeUndefined();
    expect(priceInputFromAmount(12.5)).toBe('12.50');
    expect(priceInputFromAmount(490)).toBe('490');
    expect(priceInputFromAmount(undefined)).toBe('');
  });
});
