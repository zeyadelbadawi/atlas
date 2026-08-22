/**
 * Application-level configuration.
 *
 * Product identity and default behaviour live here so they can be changed for a
 * white-label deployment without touching component code.
 */
import { DEFAULT_PAGE_SIZE } from '@constants';
import type { LanguageCode, ThemePreference } from '@types';

interface AppConfig {
  /** Product name. Used for the document title and the application shell. */
  readonly name: string;
  /** Language applied when the user has expressed no preference. */
  readonly defaultLanguage: LanguageCode;
  /** Theme applied when the user has expressed no preference. */
  readonly defaultTheme: ThemePreference;
  /** Default page size for every paginated surface. */
  readonly defaultPageSize: number;
  /** Debounce applied to search inputs, in milliseconds. */
  readonly searchDebounceMs: number;
  /** How long a success toast remains visible, in milliseconds. */
  readonly toastDurationMs: number;
}

export const APP_CONFIG: AppConfig = Object.freeze({
  name: 'Atlas',
  defaultLanguage: 'en',
  defaultTheme: 'system',
  defaultPageSize: DEFAULT_PAGE_SIZE,
  searchDebounceMs: 300,
  toastDurationMs: 4_000,
});