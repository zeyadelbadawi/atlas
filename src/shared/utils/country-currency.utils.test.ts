/**
 * D5-3 — country → default currency and the override rule. Codes only
 * (ISO 3166-1 alpha-2 / ISO 4217); a country whose currency the platform
 * does not support yet suggests nothing.
 */
import { describe, expect, it } from 'vitest';
import {
  COUNTRY_CURRENCIES,
  currencyAfterCountryChange,
  defaultCurrencyForCountry,
  isPickedCurrencyOverride,
  isSavedCurrencyOverride,
  suggestedCurrency,
} from './country-currency.utils';
import { SUPPORTED_CURRENCIES, defaultPriceCurrency } from './currency.utils';

/** A wider allow-list, to exercise the rule the way it behaves once SAR opens. */
const WITH_SAR = ['EGP', 'SAR'];

describe('defaultCurrencyForCountry', () => {
  it('maps Egypt to EGP', () => {
    expect(defaultCurrencyForCountry('EG')).toBe('EGP');
  });

  it('suggests nothing for a country whose currency is not supported yet', () => {
    // Only EGP is supported today, so the rest of the table is dormant.
    expect(SUPPORTED_CURRENCIES).toEqual(['EGP']);
    for (const country of ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'US']) {
      expect(defaultCurrencyForCountry(country)).toBeNull();
    }
  });

  it('suggests a mapped currency once it is supported', () => {
    expect(defaultCurrencyForCountry('SA', WITH_SAR)).toBe('SAR');
    expect(defaultCurrencyForCountry('AE', WITH_SAR)).toBeNull();
  });

  it('suggests nothing for an unmapped, empty or non-code country', () => {
    for (const country of ['FR', '', null, undefined, 'Egypt', 'eg']) {
      expect(defaultCurrencyForCountry(country)).toBeNull();
    }
  });

  it('keeps the table to upper-case ISO codes on both sides', () => {
    for (const [country, currency] of Object.entries(COUNTRY_CURRENCIES)) {
      expect(country).toMatch(/^[A-Z]{2}$/);
      expect(currency).toMatch(/^[A-Z]{3}$/);
    }
  });
});

describe('override rule', () => {
  it('a country change moves a currency that was not overridden', () => {
    expect(currencyAfterCountryChange('EG', 'USD', false)).toBe('EGP');
    expect(currencyAfterCountryChange('SA', 'EGP', false, WITH_SAR)).toBe(
      'SAR'
    );
  });

  it('a country change keeps a manual override', () => {
    expect(currencyAfterCountryChange('EG', 'USD', true)).toBe('USD');
    expect(currencyAfterCountryChange('SA', 'EGP', true, WITH_SAR)).toBe('EGP');
  });

  it('a country with no supported default leaves the currency unchanged', () => {
    expect(currencyAfterCountryChange('SA', 'EGP', false)).toBe('EGP');
    expect(currencyAfterCountryChange('FR', 'EGP', false)).toBe('EGP');
    expect(currencyAfterCountryChange('', 'EGP', false)).toBe('EGP');
  });

  it("picking a currency other than the country's default is an override; picking the default is not", () => {
    expect(isPickedCurrencyOverride('EG', 'USD')).toBe(true);
    expect(isPickedCurrencyOverride('EG', 'EGP')).toBe(false);
    // With no default to follow, an explicit pick is the person's choice.
    expect(isPickedCurrencyOverride('FR', 'EGP')).toBe(true);
  });

  it("a saved currency that differs from its country's default loads as an override", () => {
    expect(isSavedCurrencyOverride('EG', 'USD')).toBe(true);
    expect(isSavedCurrencyOverride('EG', 'EGP')).toBe(false);
    expect(isSavedCurrencyOverride('SA', 'EGP')).toBe(false);
    expect(isSavedCurrencyOverride(undefined, 'USD')).toBe(false);
  });

  it("the hint offers the country's default only when the currency differs", () => {
    expect(suggestedCurrency('EG', 'USD')).toBe('EGP');
    expect(suggestedCurrency('EG', 'EGP')).toBeNull();
    expect(suggestedCurrency('SA', 'EGP')).toBeNull();
    expect(suggestedCurrency('SA', 'EGP', WITH_SAR)).toBe('SAR');
  });
});

describe('defaultPriceCurrency', () => {
  it("is the academy's currency when supported, else the platform default", () => {
    expect(defaultPriceCurrency('EGP')).toBe('EGP');
    expect(defaultPriceCurrency('USD')).toBe('EGP');
    expect(defaultPriceCurrency(undefined)).toBe('EGP');
  });
});
