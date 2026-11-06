/**
 * B2 (UX audit) — a server violation never shows "En must be…", an English
 * API field name on an Arabic page, or a raw "{{count}}".
 */
import { describe, expect, it } from 'vitest';
import {
  hasUnfilledPlaceholder,
  serverFieldLabel,
} from './useServerValidation';

const t = (key: string) =>
  key === 'validation:thisField' ? 'This field' : key;

describe('serverFieldLabel', () => {
  it('drops the language and index segments', () => {
    expect(serverFieldLabel('question.en', 'en', t)).toBe('Question');
    expect(serverFieldLabel('0.label.ar', 'en', t)).toBe('Label');
    expect(serverFieldLabel('en', 'en', t)).toBe('This field');
  });

  it('says "this field" on a non-English page instead of the API name', () => {
    const ar = (key: string) =>
      key === 'validation:thisField' ? 'هذا الحقل' : key;
    expect(serverFieldLabel('outcomes', 'ar', ar)).toBe('هذا الحقل');
  });
});

describe('hasUnfilledPlaceholder', () => {
  it('spots a placeholder the message could not fill', () => {
    expect(
      hasUnfilledPlaceholder('Name must be {{count}} characters or fewer')
    ).toBe(true);
    expect(hasUnfilledPlaceholder('Name must be 100 characters or fewer')).toBe(
      false
    );
  });
});
