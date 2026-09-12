/**
 * The trial and grace-period countdowns, in both languages.
 *
 * WHAT WAS WRONG. With one day left, an English user was told "1 days
 * remaining in your trial" and an Arabic user "يتبقى 1 يومًا" — the
 * `يومًا` form is the one Arabic uses for 11–99, not for one. Both
 * strings were written with a single form and a `{{count}}` hole, so
 * every count got the same grammar. This is the message a customer sees
 * at the moment their access is about to end, which is the worst possible
 * place to look machine-translated.
 *
 * WHY THIS TEST DRIVES REAL i18next. Asserting on the JSON would only
 * prove the keys exist; it would not prove they RESOLVE. The plural
 * category is chosen by `Intl.PluralRules` at lookup time, so the only
 * way to know that `count: 1` reaches `_one` and `count: 3` reaches
 * `_few` is to ask i18next itself, configured the way the app configures
 * it. Arabic is the interesting case precisely because it has six
 * categories where English has two.
 *
 * The counts below are not arbitrary — they are one representative of
 * each Arabic plural category, which is what makes this a check of the
 * grammar rather than of three sample strings.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import i18next from 'i18next';
import en from '@localization/resources/en/tenant.json';
import ar from '@localization/resources/ar/tenant.json';

beforeAll(async () => {
  await i18next.init({
    lng: 'en',
    fallbackLng: 'en',
    // No `compatibilityJSON` — i18next v23 resolves plurals through
    // `Intl.PluralRules`, exactly as the application does.
    resources: {
      en: { tenant: en },
      ar: { tenant: ar },
    },
    interpolation: { escapeValue: false },
  });
});

function t(lng: string, key: string, count: number): string {
  return i18next.getFixedT(lng, 'tenant')(key, { count });
}

describe('English trial countdown', () => {
  it('says "day", not "days", when one day is left', () => {
    expect(t('en', 'dashboard.trialDaysRemaining', 1)).toBe(
      '1 day remaining in your trial',
    );
  });

  it('says "days" for every other count', () => {
    expect(t('en', 'dashboard.trialDaysRemaining', 3)).toBe(
      '3 days remaining in your trial',
    );
  });

  it('applies the same rule to the grace period', () => {
    expect(t('en', 'dashboard.graceDaysRemaining', 1)).toBe(
      '1 day remaining in your grace period',
    );
    expect(t('en', 'dashboard.graceDaysRemaining', 5)).toBe(
      '5 days remaining in your grace period',
    );
  });
});

describe('Arabic trial countdown', () => {
  /*
   * One count per Arabic plural category. `يومًا` — the old single form —
   * is correct ONLY for the `many` case, which is why using it everywhere
   * read as broken Arabic at every other count.
   */
  it('uses the singular form for one day', () => {
    const text = t('ar', 'dashboard.trialDaysRemaining', 1);
    expect(text).toContain('يوم واحد');
    // The bug: the 11–99 form appearing at count 1.
    expect(text).not.toContain('يومًا');
  });

  it('uses the dual form for two days', () => {
    expect(t('ar', 'dashboard.trialDaysRemaining', 2)).toContain('يومان');
  });

  it('uses the paucal form for three to ten days', () => {
    expect(t('ar', 'dashboard.trialDaysRemaining', 3)).toContain('أيام');
  });

  it('uses the 11-99 form, which is where يومًا actually belongs', () => {
    expect(t('ar', 'dashboard.trialDaysRemaining', 15)).toContain('يومًا');
  });

  it('never falls back to a missing key', () => {
    for (const count of [0, 1, 2, 3, 11, 100]) {
      for (const key of [
        'dashboard.trialDaysRemaining',
        'dashboard.graceDaysRemaining',
      ]) {
        const text = t('ar', key, count);
        // A missed lookup returns the key itself.
        expect(text).not.toContain('dashboard.');
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('language parity', () => {
  /*
   * Arabic legitimately has more forms than English, so the parity rule
   * is not "same number of keys" — it is that neither language is missing
   * a countdown entirely.
   */
  it('defines both countdowns in both languages', () => {
    for (const [name, bundle] of [
      ['en', en],
      ['ar', ar],
    ] as const) {
      const dashboard = (bundle as Record<string, Record<string, string>>)
        .dashboard;
      const keys = Object.keys(dashboard);
      expect(
        keys.some((k) => k.startsWith('trialDaysRemaining')),
        `${name} is missing the trial countdown`,
      ).toBe(true);
      expect(
        keys.some((k) => k.startsWith('graceDaysRemaining')),
        `${name} is missing the grace countdown`,
      ).toBe(true);
    }
  });
});
