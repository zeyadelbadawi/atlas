/**
 * B1 (UX audit) — the backend's generic `errors.rateLimited` names an object
 * in the catalogue; it must render its description, never i18next's
 * "returned an object instead of string" text.
 */
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@/localization/i18n';
import { displayableErrorKey, isTranslatedString } from './error-key.utils';

const i18n = createI18nInstance('en');
const isString = (key: string) => isTranslatedString(i18n, key);

describe('error key helpers', () => {
  it('treats an object key as not a string', () => {
    expect(isString('errors:rateLimited')).toBe(false);
    expect(isString('errors:rateLimited.description')).toBe(true);
  });

  it('turns an object key into its description', () => {
    expect(displayableErrorKey('errors:rateLimited', isString)).toBe(
      'errors:rateLimited.description'
    );
  });

  it('keeps a string key and drops an unknown one', () => {
    expect(displayableErrorKey('errors:domain.hostnameTaken', isString)).toBe(
      'errors:domain.hostnameTaken'
    );
    expect(displayableErrorKey('errors:never.translated', isString)).toBeNull();
  });

  it('is false without an i18n instance', () => {
    expect(
      isTranslatedString(undefined, 'errors:rateLimited.description')
    ).toBe(false);
  });
});
