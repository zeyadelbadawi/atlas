/**
 * Theme-owned system pages for the public runtime (Theme 1 plan Phase 6,
 * §C.0, §C.7): "page not found" inside the theme's own chrome, and Coming
 * Soon wearing the Academy's theme and public colours.
 *
 * A theme without its own versions returns `null` here, and the caller
 * keeps rendering the shared screens exactly as before, so Themes 2–5 are
 * unchanged.
 */
import { getThemePack } from '../theme-packs/theme-pack.registry';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { WebsiteChrome, type WebsiteChromeProps } from './WebsiteChrome';
import { WebsiteThemeScope } from './WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from './PublicWebsiteLocaleContext';
import type { PublicWebsiteLocale } from '../constants/locale.constants';
import { WEBSITE_THEME_KEYS } from '@types';
import type {
  HostnamePresentation,
  WebsiteBrandConfig,
  WebsiteThemeKey,
} from '@types';

/** Whether this theme draws its own "page not found". */
export function hasThemeNotFound(themeKey: WebsiteThemeKey): boolean {
  return !!getThemePack(themeKey).pages?.NotFound;
}

/** The theme's "page not found", inside its chrome; `null` without one. */
export function WebsiteNotFound(
  props: Omit<WebsiteChromeProps, 'children' | 'activePageId'>
): JSX.Element | null {
  const NotFound = getThemePack(props.configuration.themeKey).pages?.NotFound;
  if (!NotFound) return null;
  return (
    <WebsiteChrome {...props}>
      <NotFound pages={props.pages} linkRenderer={props.linkRenderer} />
    </WebsiteChrome>
  );
}

/** The lookup's theme key, when it names a theme this build knows. */
function knownThemeKey(
  presentation: HostnamePresentation | undefined
): WebsiteThemeKey | undefined {
  const key = presentation?.themeKey;
  return (WEBSITE_THEME_KEYS as readonly string[]).includes(key ?? '')
    ? (key as WebsiteThemeKey)
    : undefined;
}

/**
 * Whether the Academy's theme (from the hostname lookup) draws its own
 * Coming Soon. An unknown key keeps the shared page — `getThemePack`'s
 * fallback must not turn it into Theme 1's.
 */
export function hasThemeComingSoon(
  presentation: HostnamePresentation | undefined
): boolean {
  const themeKey = knownThemeKey(presentation);
  return !!themeKey && !!getThemePack(themeKey).pages?.ComingSoon;
}

export interface WebsiteComingSoonProps {
  readonly presentation: HostnamePresentation | undefined;
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly locale: PublicWebsiteLocale;
}

/** The theme's Coming Soon in its colours; `null` when the theme has none. */
export function WebsiteComingSoon({
  presentation,
  academyName,
  academyLogo,
  locale,
}: WebsiteComingSoonProps): JSX.Element | null {
  const themeKey = knownThemeKey(presentation);
  if (!presentation || !themeKey) return null;
  const ComingSoon = getThemePack(themeKey).pages?.ComingSoon;
  if (!ComingSoon) return null;
  const brand = presentation.brand as Pick<
    WebsiteBrandConfig,
    'primaryColor' | 'secondaryColor' | 'accentColor' | 'palette'
  >;
  return (
    <PublicWebsiteLocaleProvider locale={locale} className="min-h-[100dvh]">
      <WebsiteThemeScope
        theme={getWebsiteTheme(themeKey)}
        brand={brand}
        className="min-h-[100dvh]"
      >
        <ComingSoon academyName={academyName} academyLogo={academyLogo} />
      </WebsiteThemeScope>
    </PublicWebsiteLocaleProvider>
  );
}
