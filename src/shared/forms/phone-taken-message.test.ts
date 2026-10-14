/**
 * B0-IAM-05 — "this phone number is already in use" (409) must give the
 * real owner of a number somewhere to go. Numbers are unique but not yet
 * verified, so a number can be held by someone else; the recourse is
 * support (docs/support/PHONE-NUMBER-CLAIM-RUNBOOK.md in the backend).
 * The message still never says whose account holds the number.
 */
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@/localization/i18n';

describe('phone-taken message', () => {
  it('points the holder of the number to support (EN)', () => {
    const { t } = createI18nInstance('en');
    for (const key of ['validation:phoneTaken', 'errors:auth.phoneTaken']) {
      const text = t(key);
      expect(text, key).toMatch(/contact support/i);
      expect(text, key).toMatch(/different number/i);
    }
  });

  it('points the holder of the number to support (AR)', () => {
    const { t } = createI18nInstance('ar');
    for (const key of ['validation:phoneTaken', 'errors:auth.phoneTaken']) {
      const text = t(key);
      expect(text, key).toContain('تواصل مع الدعم');
      expect(text, key).toContain('أدخل رقمًا آخر');
    }
  });
});
