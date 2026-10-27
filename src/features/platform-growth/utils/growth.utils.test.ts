/**
 * G1 — Growth & capacity helpers: Cairo months and ranges (≤ 36), money in
 * piastres (Arabic digits accepted, two decimals at most, the API's
 * ceiling), settings validation mirroring the DTOs, the PATCH body of
 * changed fields only, and the version-conflict test.
 */
import { describe, expect, it } from 'vitest';
import {
  addMonths,
  cairoMonth,
  defaultCacRange,
  defaultSpendRange,
  formatDay,
  formatMoney,
  formatMonth,
  isMonth,
  isStaleError,
  minorUnitsToInput,
  monthSpan,
  parseAmountToMinorUnits,
  rangeProblem,
  settingsChanges,
  settingsDraftOf,
  validateSettings,
} from './growth.utils';
import { growthSettings } from '../__tests__/fixtures';

describe('months', () => {
  it('reads the Cairo calendar month, not UTC', () => {
    // 22:30 UTC on 31 Oct = 00:30 (or 01:30) on 1 Nov in Cairo.
    expect(cairoMonth(new Date('2026-10-31T22:30:00Z'))).toBe('2026-11');
    expect(cairoMonth(new Date('2026-10-15T12:00:00Z'))).toBe('2026-10');
  });

  it('moves and measures months across years', () => {
    expect(addMonths('2026-10', -5)).toBe('2026-05');
    expect(addMonths('2026-02', -3)).toBe('2025-11');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(monthSpan('2026-05', '2026-10')).toBe(6);
    expect(monthSpan('2026-10', '2026-05')).toBeLessThan(1);
  });

  it('defaults CAC to the last 6 months and spend to the last 12', () => {
    const now = new Date('2026-10-26T10:00:00Z');
    expect(defaultCacRange(now)).toEqual({ from: '2026-05', to: '2026-10' });
    expect(defaultSpendRange(now)).toEqual({ from: '2025-11', to: '2026-10' });
  });

  it('checks ranges like the API', () => {
    expect(rangeProblem('2026-05', '2026-10')).toBeNull();
    expect(rangeProblem('2026-10', '2026-05')).toBe('range.reversed');
    expect(rangeProblem('2023-01', '2026-01')).toBe('range.tooLong');
    expect(rangeProblem('2023-02', '2026-01')).toBeNull();
    expect(rangeProblem('2026-13', '2026-12')).toBe('range.invalid');
    expect(isMonth('2019-12')).toBe(false);
  });

  it('formats months and days in both languages without shifting the day', () => {
    expect(formatMonth('2027-03', 'en')).toBe('March 2027');
    expect(formatMonth('2027-03', 'ar')).toContain('مارس');
    expect(formatDay('2027-06-01', 'en')).toBe('1 Jun 2027');
  });
});

describe('money', () => {
  it('turns pounds into piastres, two decimals at most', () => {
    expect(parseAmountToMinorUnits('1250.50')).toBe(125_050);
    expect(parseAmountToMinorUnits('1,250.5')).toBe(125_050);
    expect(parseAmountToMinorUnits('٣٠٠٠')).toBe(300_000);
    expect(parseAmountToMinorUnits('١٢٥٠٫٥')).toBe(125_050);
    expect(parseAmountToMinorUnits('0.01')).toBe(1);
    expect(parseAmountToMinorUnits('100000000')).toBe(10_000_000_000);
  });

  it('refuses zero, negatives, three decimals and amounts over the ceiling', () => {
    for (const bad of ['', '0', '-5', '1.234', 'abc', '100000000.01', '1e5']) {
      expect(parseAmountToMinorUnits(bad), bad).toBeNull();
    }
  });

  it('writes piastres back for the field and as money', () => {
    expect(minorUnitsToInput(125_050)).toBe('1250.50');
    expect(minorUnitsToInput(300_000)).toBe('3000');
    expect(formatMoney(125_050, 'en')).toMatch(/EGP\s?1,250\.50/);
    expect(formatMoney(300_000, 'en', { compact: true })).toMatch(
      /EGP\s?3,000$/
    );
  });
});

describe('settings', () => {
  const saved = growthSettings();
  const draft = settingsDraftOf(saved);

  it('accepts the defaults', () => {
    expect(validateSettings(draft)).toEqual({});
  });

  it('mirrors the DTO rules', () => {
    expect(
      validateSettings({
        ...draft,
        seasonEnd: '2027-05-01',
        weeklyOwnerHours: '15.25',
        onboardingCapPerWeek: '0',
        minutesPerOnboarding: '700',
        supportMinutesPerPayingOrgPerWeek: '2.5',
        hireNowPayingOrgs: '30',
      })
    ).toEqual({
      seasonEnd: 'settings.errors.seasonOrder',
      weeklyOwnerHours: 'settings.errors.hours',
      onboardingCapPerWeek: 'settings.errors.range',
      minutesPerOnboarding: 'settings.errors.range',
      supportMinutesPerPayingOrgPerWeek: 'settings.errors.range',
      hireNowPayingOrgs: 'settings.errors.hireOrder',
    });
    expect(validateSettings({ ...draft, seasonStart: '' }).seasonStart).toBe(
      'settings.errors.date'
    );
    expect(validateSettings({ ...draft, weeklyOwnerHours: '12.5' })).toEqual(
      {}
    );
    // One decimal that is not exact in binary (2.2 * 10 = 22.000000000000004).
    for (const hours of ['2.2', '1.1', '15.3']) {
      expect(validateSettings({ ...draft, weeklyOwnerHours: hours })).toEqual(
        {}
      );
    }
  });

  it('sends only the changed fields, as numbers', () => {
    expect(settingsChanges(draft, saved)).toEqual({});
    expect(
      settingsChanges(
        { ...draft, weeklyOwnerHours: '20', seasonEnd: '2027-10-15' },
        saved
      )
    ).toEqual({ weeklyOwnerHours: 20, seasonEnd: '2027-10-15' });
  });
});

describe('isStaleError', () => {
  it('recognises the growth 409s', () => {
    expect(
      isStaleError({ status: 409, messageKey: 'errors.growth.settingsStale' })
    ).toBe(true);
    expect(
      isStaleError({ status: 409, messageKey: 'errors.growth.spendStale' })
    ).toBe(true);
    expect(
      isStaleError({
        status: 400,
        messageKey: 'errors.growth.monthRangeInvalid',
      })
    ).toBe(false);
    expect(isStaleError(null)).toBe(false);
  });
});
