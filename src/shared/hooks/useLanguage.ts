/**
 * Reads the active language, its direction and its locale.
 */
import { useContext } from 'react';
import { LocalizationContext } from '@app/providers/localization/localization.context';
import type { LocalizationContextValue } from '@app/providers/localization/localization.context';

export function useLanguage(): LocalizationContextValue {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error('useLanguage must be used within AtlasLocalizationProvider.');
  }

  return context;
}