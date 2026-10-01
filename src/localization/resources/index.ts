/**
 * Translation resource bundles, both languages at once.
 *
 * The application never imports this module: it loads one language's
 * bundle on demand (`language-resources.ts`), so a visitor downloads only
 * the language they read. Tests and tooling that need every language
 * synchronously import it from here.
 */
import type { LanguageCode } from '@types';
import en from './bundle-en';
import ar from './bundle-ar';

/** One language's resources, keyed by namespace. */
export type NamespaceBundle = Record<string, Record<string, unknown>>;

export const TRANSLATION_RESOURCES: Readonly<
  Record<LanguageCode, NamespaceBundle>
> = Object.freeze({ en, ar });
