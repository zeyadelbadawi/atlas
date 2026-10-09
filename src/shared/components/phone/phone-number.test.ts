/**
 * The client's phone rule — the same cases the backend's
 * `phone-number.policy.spec.ts` pins, so the instant feedback and the
 * server's answer agree.
 */
import { describe, expect, it } from 'vitest';
import { getCountries } from 'libphonenumber-js/mobile';
import { hasFlag } from 'country-flag-icons';
import {
  FALLBACK_PHONE_COUNTRY,
  checkPhone,
  defaultPhoneCountry,
  foldForSearch,
  formatInternational,
  impliedCountry,
  phoneCountryOptions,
  toAsciiDigits,
} from './phone-number';
import { isPersistableQueryKey } from '@services/offline/query-persistence';
import { userKeys } from '@services/query';

describe('checkPhone', () => {
  it.each([
    ['01001234567', 'EG', '+201001234567'],
    ['010 0123 4567', 'EG', '+201001234567'],
    ['+20 100 123 4567', 'EG', '+201001234567'],
    ['(010) 0123-4567', 'EG', '+201001234567'],
    ['٠١٠٠١٢٣٤٥٦٧', 'EG', '+201001234567'],
    ['۰۱۰۰۱۲۳۴۵۶۷', 'EG', '+201001234567'],
    ['0501234567', 'SA', '+966501234567'],
    ['0151 23456789', 'DE', '+4915123456789'],
    ['(201) 555-0123', 'US', '+12015550123'],
  ])('accepts %s (%s) as %s', (typed, country, e164) => {
    expect(checkPhone(typed, country)).toMatchObject({ ok: true, e164 });
  });

  it.each([
    ['', 'EG', 'required'],
    ['   ', 'EG', 'required'],
    ['0223456789', 'EG', 'invalid'], // landline: not a mobile number
    ['0800 123 4567', 'GB', 'invalid'], // toll-free
    ['07700900123', 'GB', 'invalid'],
    ['call 01001234567', 'EG', 'invalid'],
    ['01001234567 ext 5', 'EG', 'invalid'],
    ['<img src=x onerror=alert(1)>', 'EG', 'invalid'],
    ['0'.repeat(33), 'EG', 'invalid'],
    ['01001234567', 'XX', 'invalidCountry'],
    ['01001234567', '', 'invalidCountry'],
  ])('refuses %j (%s): %s', (typed, country, issue) => {
    expect(checkPhone(typed, country)).toMatchObject({ ok: false, issue });
  });

  it('names the country a foreign number belongs to', () => {
    expect(checkPhone('+966501234567', 'EG')).toEqual({
      ok: false,
      issue: 'countryMismatch',
      numberCountry: 'SA',
    });
  });

  it('offers the national format for a complete number', () => {
    expect(checkPhone('+201001234567', 'EG')).toMatchObject({
      ok: true,
      national: '010 01234567',
    });
  });
});

describe('impliedCountry', () => {
  it('follows an international number, also in Arabic-Indic digits', () => {
    expect(impliedCountry('+966 50 123 4567', 'EG')).toBe('SA');
    expect(impliedCountry('+٩٦٦٥٠١٢٣٤٥٦٧', 'EG')).toBe('SA');
    expect(impliedCountry('+20 100 123 4567', 'EG')).toBeNull();
  });

  it('switches between countries that share a calling code', () => {
    expect(impliedCountry('(514) 555-0123', 'US')).toBe('CA');
    // A different calling code is never guessed from a national number.
    expect(impliedCountry('0501234567', 'EG')).toBeNull();
  });
});

describe('defaultPhoneCountry', () => {
  it('uses the device time zone for known markets, Egypt otherwise', () => {
    expect(defaultPhoneCountry('Asia/Riyadh')).toBe('SA');
    expect(defaultPhoneCountry('Africa/Cairo')).toBe('EG');
    expect(defaultPhoneCountry('America/Toronto')).toBe('CA');
    expect(defaultPhoneCountry('Pacific/Kiritimati')).toBe(
      FALLBACK_PHONE_COUNTRY
    );
    expect(defaultPhoneCountry('')).toBe('EG');
  });
});

describe('country options', () => {
  it('lists every libphonenumber country, each with an SVG flag', () => {
    const options = phoneCountryOptions('en');
    expect(options).toHaveLength(getCountries().length);
    expect(options.filter((option) => !hasFlag(option.code))).toEqual([]);
  });

  it('names and sorts countries in Arabic, searchable in Arabic and English', () => {
    const options = phoneCountryOptions('ar');
    const egypt = options.find((option) => option.code === 'EG')!;
    expect(egypt.name).toBe('مصر');
    expect(egypt.callingCode).toBe('20');
    for (const query of ['مصر', 'egypt', 'EG', '+20']) {
      expect(egypt.searchText).toContain(foldForSearch(query));
    }
    // Hamza and taa-marbuta variants fold together.
    const emirates = options.find((option) => option.code === 'AE')!;
    expect(emirates.searchText).toContain(foldForSearch('الامارات'));
  });

  it('formats a stored number for display and maps Arabic-Indic digits', () => {
    expect(formatInternational('+201001234567')).toBe('+20 10 01234567');
    expect(formatInternational('not-a-number')).toBe('not-a-number');
    expect(toAsciiDigits('+٢٠ ۱۰۰')).toBe('+20 100');
  });
});

describe('offline cache', () => {
  it('never persists the phone number query', () => {
    expect(isPersistableQueryKey(userKeys.phone())).toBe(false);
  });
});
