/**
 * Language-aware field validation — P116-VAL-001..030.
 *
 * The false-POSITIVE tests matter more than the false-negative ones here.
 * A validator that rejects "دورة React للمبتدئين" is worse than no
 * validator at all, because people learn to ignore it and then miss the
 * real mistakes. Most of this file is legitimate content that must pass.
 */
import { describe, expect, it } from 'vitest';
import {
  countScripts,
  isAcceptableForLanguage,
  validateNumericField,
} from './script-validation.utils';

describe('language validation — P116-VAL-001..018', () => {
  it('P116-VAL-001 — Arabic text passes an Arabic field', () => {
    expect(isAcceptableForLanguage('مرحبًا بكم في أكاديميتنا', 'ar')).toBe(
      true
    );
  });

  it('P116-VAL-002 — English text passes an English field', () => {
    expect(isAcceptableForLanguage('Welcome to our academy', 'en')).toBe(true);
  });

  it('P116-VAL-003 — English text is rejected in an Arabic field', () => {
    expect(isAcceptableForLanguage('Welcome to our academy', 'ar')).toBe(false);
  });

  it('P116-VAL-004 — Arabic text is rejected in an English field', () => {
    expect(isAcceptableForLanguage('مرحبًا بكم في أكاديميتنا', 'en')).toBe(
      false
    );
  });

  // ---- the false-positive suite: all of these MUST pass ----

  it('P116-VAL-005 — a technical term inside Arabic is accepted', () => {
    expect(isAcceptableForLanguage('دورة React للمبتدئين', 'ar')).toBe(true);
  });

  it('P116-VAL-006 — an abbreviation inside Arabic is accepted', () => {
    expect(isAcceptableForLanguage('شهادة PDF معتمدة', 'ar')).toBe(true);
  });

  it('P116-VAL-007 — a brand name inside Arabic is accepted', () => {
    expect(
      isAcceptableForLanguage('نحن نستخدم منصة Atlas لإدارة الدورات', 'ar')
    ).toBe(true);
  });

  it('P116-VAL-008 — digits and years do not break an Arabic field', () => {
    expect(isAcceptableForLanguage('ورشة عمل 2026', 'ar')).toBe(true);
    expect(isAcceptableForLanguage('ورشة عمل ٢٠٢٦', 'ar')).toBe(true);
  });

  it('P116-VAL-009 — an email address does not make Arabic look English', () => {
    // The email's Latin letters are stripped before counting; without that
    // "تواصل معنا: info@atlas.com" would be rejected as English.
    expect(isAcceptableForLanguage('تواصل معنا: info@atlas.com', 'ar')).toBe(
      true
    );
  });

  it('P116-VAL-010 — a URL does not make Arabic look English', () => {
    expect(
      isAcceptableForLanguage(
        'زوروا موقعنا https://www.example.com للمزيد',
        'ar'
      )
    ).toBe(true);
  });

  it('P116-VAL-011 — a bare domain does not make Arabic look English', () => {
    expect(isAcceptableForLanguage('موقعنا هو atlas-academy.com', 'ar')).toBe(
      true
    );
  });

  it('P116-VAL-012 — currency and punctuation are script-neutral', () => {
    expect(isAcceptableForLanguage('السعر: ١٢٠ ج.م — شامل الضريبة', 'ar')).toBe(
      true
    );
    expect(isAcceptableForLanguage('Price: $120 — tax included', 'en')).toBe(
      true
    );
  });

  it('P116-VAL-013 — a value with no letters at all is accepted in either field', () => {
    for (const value of ['2026', '+20 100 123 4567', '١٢٠', '99.5%']) {
      expect(isAcceptableForLanguage(value, 'ar')).toBe(true);
      expect(isAcceptableForLanguage(value, 'en')).toBe(true);
    }
  });

  it('P116-VAL-014 — empty and whitespace-only values are not a language error', () => {
    // Emptiness is `required`'s job. Reporting "please enter Arabic text"
    // for an empty optional field would be actively misleading.
    for (const value of ['', '   ', '\n\t']) {
      expect(isAcceptableForLanguage(value, 'ar')).toBe(true);
      expect(isAcceptableForLanguage(value, 'en')).toBe(true);
    }
  });

  it('P116-VAL-015 — an Arabic word inside mostly-English text is accepted', () => {
    expect(
      isAcceptableForLanguage('Our "أطلس" programme for beginners', 'en')
    ).toBe(true);
  });

  it('P116-VAL-016 — a tie passes, so a short label with one foreign word is fine', () => {
    // "دورة React" is half and half. Rejecting it would be wrong.
    expect(isAcceptableForLanguage('دورة React', 'ar')).toBe(true);
  });

  it('P116-VAL-017 — mostly-English text still fails an Arabic field', () => {
    // The rule stays useful: a single Arabic word pasted into an otherwise
    // English paragraph does not make it Arabic content.
    expect(
      isAcceptableForLanguage(
        'This is a long English description about our academy programmes ودورات',
        'ar'
      )
    ).toBe(false);
  });

  it('P116-VAL-018 — counting ignores neutral spans', () => {
    const counts = countScripts('تواصل info@atlas.com');
    expect(counts.arabic).toBeGreaterThan(0);
    expect(counts.latin).toBe(0);
  });
});

describe('numeric validation — P116-VAL-019..030', () => {
  it('P116-VAL-019 — a phone number is NOT validated as an integer', () => {
    // The specific mistake called out in the brief: international format
    // carries +, spaces and hyphens, and is a correct phone number.
    for (const phone of [
      '+20 100 123 4567',
      '+1 (555) 010-9999',
      '01001234567',
      '+44-20-7946-0958',
    ]) {
      expect(validateNumericField(phone, 'phone').valid).toBe(true);
    }
  });

  it('P116-VAL-020 — an implausible phone number is rejected', () => {
    expect(validateNumericField('12', 'phone').valid).toBe(false);
    expect(validateNumericField('phone me', 'phone').valid).toBe(false);
  });

  it('P116-VAL-021 — integers reject decimals', () => {
    expect(validateNumericField('12', 'integer').valid).toBe(true);
    expect(validateNumericField('12.5', 'integer').valid).toBe(false);
  });

  it('P116-VAL-022 — counts reject negatives', () => {
    expect(validateNumericField('0', 'count').valid).toBe(true);
    expect(validateNumericField('-1', 'count').valid).toBe(false);
  });

  it('P116-VAL-023 — percentages are bounded to 0..100', () => {
    expect(validateNumericField('0', 'percentage').valid).toBe(true);
    expect(validateNumericField('100', 'percentage').valid).toBe(true);
    expect(validateNumericField('101', 'percentage').valid).toBe(false);
    expect(validateNumericField('-5', 'percentage').valid).toBe(false);
  });

  it('P116-VAL-024 — prices allow at most two decimal places and no negatives', () => {
    expect(validateNumericField('120', 'price').valid).toBe(true);
    expect(validateNumericField('120.50', 'price').valid).toBe(true);
    expect(validateNumericField('120.555', 'price').valid).toBe(false);
    expect(validateNumericField('-10', 'price').valid).toBe(false);
  });

  it('P116-VAL-025 — durations must be positive', () => {
    expect(validateNumericField('45', 'duration').valid).toBe(true);
    expect(validateNumericField('0', 'duration').valid).toBe(false);
  });

  it('P116-VAL-026 — years are bounded to a plausible range', () => {
    const current = new Date().getFullYear();
    expect(validateNumericField(String(current), 'year').valid).toBe(true);
    expect(validateNumericField('1899', 'year').valid).toBe(false);
    expect(validateNumericField('3000', 'year').valid).toBe(false);
    // The common typo this catches: a phone number in a year field.
    expect(validateNumericField('01001234567', 'year').valid).toBe(false);
  });

  it('P116-VAL-027 — Arabic-Indic digits are accepted as numbers', () => {
    // An Arabic-locale user typing naturally must not be rejected.
    expect(validateNumericField('١٢٠', 'integer').valid).toBe(true);
    expect(validateNumericField('٥٠', 'percentage').valid).toBe(true);
  });

  it('P116-VAL-028 — non-numeric input is reported as not a number', () => {
    const result = validateNumericField('twelve', 'integer');
    expect(result.valid).toBe(false);
    expect(result.messageKey).toBe('validation:numeric.notANumber');
  });

  it('P116-VAL-029 — an empty value is not a numeric error', () => {
    for (const kind of ['integer', 'price', 'year', 'phone'] as const) {
      expect(validateNumericField('', kind).valid).toBe(true);
    }
  });

  it('P116-VAL-030 — decimals accept fractional values', () => {
    expect(validateNumericField('12.3456', 'decimal').valid).toBe(true);
  });
});
