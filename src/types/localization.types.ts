/**
 * Localization contracts.
 *
 * Atlas is bilingual by architecture. Adding a language means adding an entry
 * to the language registry plus its resource bundle — never restructuring code.
 */

/** Text direction of a language. */
export type TextDirection = 'ltr' | 'rtl';

/** Language codes currently shipped by Atlas. */
export const SUPPORTED_LANGUAGE_CODES = ['en', 'ar'] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

/** Everything the platform needs to know about one language. */
export interface LanguageDefinition {
  readonly code: LanguageCode;
  /** Endonym, shown in the language switcher in its own script. */
  readonly nativeName: string;
  /** Translation key for the language name in the active language. */
  readonly labelKey: string;
  readonly direction: TextDirection;
  /** BCP-47 tag used for `Intl` formatting. */
  readonly locale: string;
  /** First day of the week: 0 = Sunday, 6 = Saturday. */
  readonly weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** Translation namespaces. One namespace per bounded area of the product. */
export const TRANSLATION_NAMESPACES = [
  'common',
  'navigation',
  'validation',
  'errors',
  'layout',
  'home',
  'dashboard',
  'auth',
  'profile',
  'settings',
  'notifications',
  'billing',
  'analytics',
  'platform',
  'search',
  'academy',
  'course',
  'learning',
  'instructor',
  'announcements',
  'blog',
  'forum',
  'organization',
  'tenant',
  'payments',
  'provisioning',
  'website',
  'auditLog',
  'support',
  'media',
] as const;

export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];