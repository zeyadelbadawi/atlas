/**
 * Where portalled overlays (dialogs, sheets, popovers, selects, menus)
 * mount.
 *
 * Radix portals render into `document.body` by default, which is outside
 * any themed subtree. On the academy website that is a real defect: the
 * page lives inside `WebsiteThemeScope` (always light, the academy's own
 * brand colour), but a dialog opened from it mounted at the root and took
 * the Atlas dashboard's tokens — dark when the visitor's system prefers
 * dark, teal instead of the academy's blue. The scope now provides a
 * container element inside itself and every wrapper below reads it.
 *
 * Absent a provider the value is `null`, which Radix treats as "use the
 * body", so the dashboard is unchanged.
 */
import { createContext, useContext } from 'react';

const PortalContainerContext = createContext<HTMLElement | null>(null);

export const PortalContainerProvider = PortalContainerContext.Provider;

export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext);
}
