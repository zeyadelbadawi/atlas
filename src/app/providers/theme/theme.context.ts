/**
 * Theme context definition.
 *
 * Kept in its own module so the context object and the provider component live
 * apart, which keeps React Fast Refresh boundaries clean and lets hooks import
 * the context without pulling in the provider.
 */
import { createContext } from 'react';
import type { ResolvedTheme, ThemePreference } from '@types';

export interface ThemeContextValue {
  /** The preference the user selected, including `system`. */
  readonly preference: ThemePreference;
  /** The theme actually applied to the document. */
  readonly resolvedTheme: ResolvedTheme;
  /** Persists a new preference and applies it immediately. */
  readonly setPreference: (preference: ThemePreference) => void;
  /** Switches between light and dark, resolving `system` first. */
  readonly toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);