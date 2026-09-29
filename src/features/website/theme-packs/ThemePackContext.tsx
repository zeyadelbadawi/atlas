/**
 * The active theme pack, provided by `WebsiteThemeScope` next to the
 * resolved design system, so `SectionRenderer` dispatches through the same
 * theme the scope is styled with. Outside any scope it's the base pack.
 */
import { createContext, useContext } from 'react';
import { createBasePack } from './base-pack';
import type { ThemePack } from './theme-pack.types';

export const ThemePackContext = createContext<ThemePack>(
  createBasePack('modern-education')
);

export function useThemePack(): ThemePack {
  return useContext(ThemePackContext);
}
