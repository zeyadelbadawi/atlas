/**
 * The palette scope for site-wide overlays on an Academy's public website
 * — the cookie consent banner and its preferences dialog.
 *
 * Those are mounted ONCE for the whole site rather than inside each
 * page's `WebsiteThemeScope`, so they persist across route changes without
 * remounting. Outside a scope they used to resolve `--primary`,
 * `--background`, `--muted-foreground`… against the Atlas dashboard's
 * `:root` (Deep Teal) and flip with its `html.dark` class, so a light
 * Academy site showed an Atlas-teal banner that turned dark on a visitor
 * whose operating system prefers dark mode.
 *
 * This element is that scope, for overlays:
 *  - `.website-theme-scope` brings the website's static light tokens, and
 *    the inline style the Academy's mapped palette (the same variables the
 *    page's scope gets, `mapWebsiteBrandVariables`) plus contrast-safe
 *    `--primary`/`--primary-foreground`/`--ring`. Without an Academy
 *    palette (loading, status pages) it stays neutral.
 *  - `text-foreground` and `color-scheme: light` re-anchor the inherited
 *    text colour and native controls, which would otherwise keep the
 *    body's dark-mode values. Public websites are always light: no theme
 *    offers a dark surface, so the dashboard's dark mode never applies.
 *  - It owns a portal container inside itself, so a dialog opened from
 *    here mounts within the palette instead of on `<body>`.
 *  - `display: contents`, so it adds no box: the banner's `position:
 *    fixed` stays anchored to the viewport.
 *
 * The element structure never changes with the data, so the overlay is
 * not remounted when the palette arrives.
 */
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { WebsiteThemeKey } from '@types';
import { PortalContainerProvider } from '@/components/ui/portal-container';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { useLoadedThemePack } from '../theme-packs/ThemePackGate';
import {
  mapWebsiteBrandVariables,
  resolveContrastSafePrimary,
  type WebsiteOverlayBrand,
} from './website-overlay-palette';

export interface WebsiteOverlayScopeProps {
  /** The Academy's theme; absent for a neutral scope (no palette known). */
  readonly themeKey?: WebsiteThemeKey;
  readonly brand?: WebsiteOverlayBrand;
  readonly children: ReactNode;
}

export function WebsiteOverlayScope({
  themeKey,
  brand,
  children,
}: WebsiteOverlayScopeProps): JSX.Element {
  const theme = themeKey ? getWebsiteTheme(themeKey) : undefined;
  // The palette needs the theme's pack (its brand mapping). On a
  // server-rendered page it has loaded before the first render; otherwise
  // the overlay stays neutral until it arrives, as it does while the
  // site's data loads.
  const pack = useLoadedThemePack(theme?.key);

  const style = useMemo<CSSProperties>(() => {
    const variables =
      theme && pack ? mapWebsiteBrandVariables(theme, brand) : null;
    return {
      ...variables,
      ...resolveContrastSafePrimary(variables, theme?.tokens.defaultPrimary),
      colorScheme: 'light',
    } as CSSProperties;
  }, [theme, pack, brand]);

  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null
  );

  return (
    <div
      className="website-theme-scope contents text-foreground"
      data-website-overlay-scope=""
      data-theme-pack={theme?.key}
      style={style}
    >
      <PortalContainerProvider value={portalContainer}>
        {children}
      </PortalContainerProvider>
      <div
        ref={setPortalContainer}
        data-website-overlay-portal-root=""
        className="text-foreground"
      />
    </div>
  );
}
