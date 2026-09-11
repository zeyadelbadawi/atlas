/**
 * Country-name formatting — P119-LOC-001..008.
 *
 * The rule under test is "never fabricate a location". A code the
 * platform does not recognise must produce NOTHING, so the caller falls
 * back to "Location unavailable" — showing the raw code, or echoing it as
 * though it were a place name, would be exactly the fabrication this
 * feature exists to avoid.
 */
import { describe, expect, it } from 'vitest';
import { formatCountryName } from './country.utils';

describe('country formatting — P119-LOC-001..008', () => {
  it('P119-LOC-001 — a real code becomes a readable English name', () => {
    expect(formatCountryName('EG', 'en')).toBe('Egypt');
    expect(formatCountryName('SA', 'en')).toBe('Saudi Arabia');
  });

  it('P119-LOC-002 — the same code becomes a readable Arabic name', () => {
    // The whole reason `Intl.DisplayNames` is used instead of a lookup
    // table: Arabic comes from the platform, not from a file someone has
    // to remember to update.
    const arabic = formatCountryName('EG', 'ar');
    expect(arabic).toBeTruthy();
    expect(arabic).not.toBe('Egypt');
    expect(arabic).not.toBe('EG');
  });

  it('P119-LOC-003 — a lowercase code still resolves', () => {
    expect(formatCountryName('eg', 'en')).toBe('Egypt');
  });

  it('P119-LOC-004 — an absent code yields nothing, never a placeholder', () => {
    expect(formatCountryName(undefined, 'en')).toBeUndefined();
    expect(formatCountryName('', 'en')).toBeUndefined();
  });

  it('P119-LOC-005 — a malformed code yields nothing', () => {
    for (const value of ['E', 'EGY', '12', '<script>', 'Egypt']) {
      expect(formatCountryName(value, 'en')).toBeUndefined();
    }
  });

  it('P119-LOC-006 — an unrecognised two-letter code is not echoed back as a name', () => {
    // `Intl.DisplayNames.of` returns its input unchanged for codes it
    // does not know. Passing that through would render "ZZ" in the UI as
    // if it were a country.
    const result = formatCountryName('ZZ', 'en');
    expect(result).not.toBe('ZZ');
  });

  it("P119-LOC-007 — Cloudflare's XX sentinel never becomes a place name", () => {
    // Defence in depth: the backend already filters `XX`, but if one ever
    // reached the client it must not render as a country.
    expect(formatCountryName('XX', 'en')).toBeUndefined();
  });

  it('P119-LOC-008 — a malformed locale degrades to nothing rather than throwing', () => {
    // `Intl.DisplayNames` throws on an invalid locale tag; a session list
    // must not crash because of a bad language preference.
    expect(() => formatCountryName('EG', 'not a locale!!')).not.toThrow();
  });
});
