/**
 * Website Design System context.
 *
 * The ONLY way a section/header/footer renderer component learns which
 * theme is active — never a prop drilled through every intermediate
 * component, never a direct `getWebsiteTheme()` call inside a leaf
 * component (which would make that component untestable/unpreviewable in
 * isolation). Provided once, at the root, by `WebsiteThemeScope`.
 */
import { createContext, useContext } from 'react';
import type { ResolvedWebsiteDesignSystem } from '@types';

export const WebsiteDesignSystemContext =
  createContext<ResolvedWebsiteDesignSystem | undefined>(undefined);

WebsiteDesignSystemContext.displayName = 'WebsiteDesignSystemContext';

/** Reads the active, fully-resolved website design system (theme tokens + Tenant brand). */
export function useWebsiteDesignSystem(): ResolvedWebsiteDesignSystem {
  const context = useContext(WebsiteDesignSystemContext);

  if (!context) {
    throw new Error(
      'useWebsiteDesignSystem must be used within a WebsiteThemeScope'
    );
  }

  return context;
}
