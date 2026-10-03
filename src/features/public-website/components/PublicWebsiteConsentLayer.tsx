/**
 * The cookie consent banner and preferences dialog on an Academy's public
 * website, in that Academy's palette.
 *
 * Rendered once by `PublicWebsiteRouter`, beside its routes, so it stays
 * mounted across every navigation and lazy-route fallback (no flicker) and
 * is never part of a dashboard preview. On the Atlas host the same two
 * components keep rendering from `RootRoute` in Atlas's own styles.
 *
 * The palette is read from the public website queries every page already
 * uses (`usePublicWebsiteData`) — the request's own query client, already
 * filled and dehydrated by the server renderer — never from a module-level
 * value, because one server process renders many Academies at once:
 *  - a published site: its configuration's theme and brand, as its pages;
 *  - an unpublished site whose theme draws its own Coming Soon: the
 *    hostname lookup's `presentation`, as that page does;
 *  - anything else (loading, status pages, the shared Coming Soon): the
 *    neutral website palette.
 *
 * Consent behaviour is untouched: the provider, its storage and the server
 * snapshot are where they were; only where the two surfaces render moved.
 */
import { CookieConsentBanner, CookiePreferencesDialog } from '@features/legal';
import { WebsiteOverlayScope, hasThemeComingSoon } from '@features/website';
import type { WebsiteBrandConfig, WebsiteThemeKey } from '@types';
import {
  usePublicWebsiteData,
  type PublicWebsiteDataState,
} from '../hooks/usePublicWebsiteData';

type OverlayBrand = Pick<
  WebsiteBrandConfig,
  'primaryColor' | 'secondaryColor' | 'accentColor' | 'palette'
>;

/** Which theme and brand the overlay wears for this data state. */
function consentPaletteSource(data: PublicWebsiteDataState): {
  readonly themeKey?: WebsiteThemeKey;
  readonly brand?: OverlayBrand;
} {
  if (data.status === 'ready') {
    return {
      themeKey: data.configuration.themeKey,
      brand: data.configuration.brand,
    };
  }
  const presentation =
    data.status === 'unpublished' ? data.academy.presentation : undefined;
  if (presentation && hasThemeComingSoon(presentation)) {
    return {
      themeKey: presentation.themeKey as WebsiteThemeKey,
      brand: presentation.brand as OverlayBrand,
    };
  }
  return {};
}

export function PublicWebsiteConsentLayer({
  lookupKey,
}: {
  readonly lookupKey: string;
}): JSX.Element {
  const { themeKey, brand } = consentPaletteSource(
    usePublicWebsiteData(lookupKey)
  );
  return (
    <WebsiteOverlayScope themeKey={themeKey} brand={brand}>
      <CookieConsentBanner />
      <CookiePreferencesDialog />
    </WebsiteOverlayScope>
  );
}
