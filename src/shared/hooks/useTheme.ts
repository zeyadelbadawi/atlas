/**
 * Reads the active theme.
 *
 * Throwing when the provider is missing turns a silent styling bug into an
 * immediate, obvious failure during development.
 */
import { useContext } from 'react';
import { ThemeContext } from '@app/providers/theme/theme.context';
import type { ThemeContextValue } from '@app/providers/theme/theme.context';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within AtlasThemeProvider.');
  }

  return context;
}