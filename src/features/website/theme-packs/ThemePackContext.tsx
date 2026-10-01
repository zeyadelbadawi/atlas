/**
 * The active theme pack, provided by `WebsiteThemeScope` next to the
 * resolved design system, so `SectionRenderer` dispatches through the same
 * theme the scope is styled with. Outside any scope it's the base pack.
 */
import { createContext, useContext } from 'react';
import { createBasePack } from './base-pack';
import type { ThemePack, WebsiteBrandVariables } from './theme-pack.types';

export const ThemePackContext = createContext<ThemePack>(
  createBasePack('modern-education')
);

export function useThemePack(): ThemePack {
  return useContext(ThemePackContext);
}

/** The scope's mapped brand variables (what the active pack emitted), for components that must re-apply them (`WebsiteBrandBridge`). */
export const WebsiteBrandVariablesContext =
  createContext<WebsiteBrandVariables | null>(null);

export function useWebsiteBrandVariables(): WebsiteBrandVariables | null {
  return useContext(WebsiteBrandVariablesContext);
}
