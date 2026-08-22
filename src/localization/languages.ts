/**
 * Language registry.
 *
 * Adding a language means adding one definition here plus its resource bundle.
 * No layout, component or utility needs to change — direction, locale and week
 * start are all read from this registry at runtime.
 */
import { SUPPORTED_LANGUAGE_CODES } from '@types';
import type { LanguageCode, LanguageDefinition, TextDirection } from '@types';

export const LANGUAGES: Readonly<Record<LanguageCode, LanguageDefinition>> =
  Object.freeze({
    en: {
      code: 'en',
      nativeName: 'English',
      labelKey: 'common:languages.en',
      direction: 'ltr',
      locale: 'en-US',
      weekStartsOn: 0,
    },
    ar: {
      code: 'ar',
      nativeName: 'العربية',
      labelKey: 'common:languages.ar',
      direction: 'rtl',
      locale: 'ar-EG',
      weekStartsOn: 6,
    },
  });

/** Every language definition, in the order shown by the language switcher. */
export const LANGUAGE_LIST: readonly LanguageDefinition[] =
  SUPPORTED_LANGUAGE_CODES.map((code) => LANGUAGES[code]);

/** Narrows an arbitrary string to a supported language code. */
export function isSupportedLanguage(value: string): value is LanguageCode {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(value);
}

/** Returns the definition of a language code. */
export function getLanguage(code: LanguageCode): LanguageDefinition {
  return LANGUAGES[code];
}

/** Returns the text direction of a language code. */
export function getDirection(code: LanguageCode): TextDirection {
  return LANGUAGES[code].direction;
}