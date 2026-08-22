/**
 * Localization context definition.
 *
 * Exposes the active language together with its direction and locale, so no
 * component needs to derive them or hardcode a direction check.
 */
import { createContext } from 'react';
import type { LanguageCode, LanguageDefinition, TextDirection } from '@types';

export interface LocalizationContextValue {
  readonly language: LanguageCode;
  readonly languageDefinition: LanguageDefinition;
  readonly direction: TextDirection;
  readonly isRtl: boolean;
  /** BCP-47 locale tag for `Intl` formatting. */
  readonly locale: string;
  /** Every language available in the switcher. */
  readonly availableLanguages: readonly LanguageDefinition[];
  /** Persists a new language and applies it immediately. */
  readonly setLanguage: (language: LanguageCode) => void;
}

export const LocalizationContext = createContext<
  LocalizationContextValue | undefined
>(undefined);