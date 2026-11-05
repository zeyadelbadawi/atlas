/**
 * B1 (UX audit) — a validation message keeps its numbers and reads as a
 * sentence without its field's label: customers read "{{field}} must be
 * {{count}} characters or fewer".
 */
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@/localization/i18n';
import { resolveValidationMessage } from './form.utils';
import {
  parseValidationMessage,
  validationMessage,
} from './validation-message';

const en = createI18nInstance('en');
const ar = createI18nInstance('ar');
const tEn = (k: string, v?: Record<string, string | number>) =>
  en.t(k, v) as string;
const tAr = (k: string, v?: Record<string, string | number>) =>
  ar.t(k, v) as string;

describe('validation messages with values', () => {
  it('round-trips the values', () => {
    const packed = validationMessage('validation:maxLength', { count: 100 });
    expect(parseValidationMessage(packed)).toEqual({
      key: 'validation:maxLength',
      values: { count: 100 },
    });
    expect(validationMessage('validation:required')).toBe(
      'validation:required'
    );
  });

  it('renders the number and a field fallback, in English and Arabic', () => {
    const packed = validationMessage('validation:maxLength', { count: 100 });
    const enText = resolveValidationMessage(packed, tEn);
    const arText = resolveValidationMessage(packed, tAr);
    expect(enText).toBe('This field must be 100 characters or fewer');
    expect(arText).toContain('100');
    for (const text of [
      enText,
      arText,
      resolveValidationMessage('validation:required', tEn),
    ]) {
      expect(text).not.toMatch(/\{\{|\}\}/);
    }
  });

  it('prefers the real label when the caller has one', () => {
    expect(
      resolveValidationMessage(
        validationMessage('validation:minLength', { count: 3 }),
        tEn,
        {
          field: 'Academy name',
        }
      )
    ).toBe('Academy name must be at least 3 characters');
  });
});
