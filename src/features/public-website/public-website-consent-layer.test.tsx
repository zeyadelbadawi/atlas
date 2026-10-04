/**
 * The cookie consent banner on an Academy's public website wears that
 * Academy's palette, not the Atlas dashboard's (Workstream 1).
 *
 * THE DEFECT. `RootRoute` mounted the banner and the preferences dialog
 * beside `<AppRouter/>`, outside every per-page `WebsiteThemeScope`, so
 * their `bg-primary`, `bg-background`, `text-muted-foreground`… resolved
 * against Atlas's `:root` (Deep Teal) and flipped with `html.dark` on a
 * visitor whose OS prefers dark. These tests pin the fix: on an Academy
 * host the banner renders once, from the website router, inside a scope
 * carrying the Academy's own `--primary`; on the Atlas host it is where it
 * always was, in Atlas's styles.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  MemoryRouter,
  RouterProvider,
  createMemoryRouter,
} from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { RequestLocationProvider, useRequestLocation } from '@hooks';
import { ENV } from '@config';
import { resolvePublicWebsiteContext } from '@utils';
import { CookieConsentProvider } from '@features/legal';
import type { HostnameResolution, WebsiteConfiguration } from '@types';

const useResolveHostname = vi.fn();
const usePublishedWebsite = vi.fn();
const usePublishedPages = vi.fn();

vi.mock('./hooks/useResolveHostname', () => ({
  useResolveHostname: (key: string) => useResolveHostname(key) as unknown,
}));
vi.mock('./hooks/usePublishedWebsite', () => ({
  usePublishedWebsite: (id?: string) => usePublishedWebsite(id) as unknown,
}));
vi.mock('./hooks/usePublishedPages', () => ({
  usePublishedPages: (id?: string) => usePublishedPages(id) as unknown,
}));

const { PublicWebsiteConsentLayer } =
  await import('./components/PublicWebsiteConsentLayer');

// `AppRouter` stands in for the real route tree: on an Academy host it
// renders what `PublicWebsiteRouter` renders for consent, decided exactly as
// the real one decides.
vi.mock('@app/routes/AppRouter', () => ({
  AppRouter: function StubAppRouter() {
    const { hostname, search } = useRequestLocation();
    const context = resolvePublicWebsiteContext(
      hostname,
      search,
      ENV.platformBaseDomain,
      ENV.isDevelopment
    );
    return context.mode === 'academy-website' ? (
      <PublicWebsiteConsentLayer lookupKey={context.value} />
    ) : (
      <main>Atlas</main>
    );
  },
}));

const { appRoutes } = await import('@/App');

const ACADEMY = {
  academyId: 'academy-1',
  academyName: 'Alpha Academy',
} as HostnameResolution;

/** A confirmed Theme 1 palette: `--primary` must be exactly its `cta`. */
const ROLES = {
  cta: '142 71% 30%',
  ctaForeground: '0 0% 100%',
  link: '143 74% 29%',
  focus: '142 71% 30%',
  primary: '142 71% 30%',
  primaryForeground: '0 0% 100%',
  secondary: '221 83% 40%',
  secondaryForeground: '0 0% 100%',
  accent: '43 96% 56%',
  accentForeground: '131 16% 11%',
  background: '128 61% 99%',
  foreground: '131 16% 11%',
  foregroundMuted: '129 6% 38%',
  surface: '129 25% 96%',
  surfaceMuted: '129 21% 93%',
  border: '129 5% 56%',
  success: '134 100% 19%',
  warning: '45 100% 26%',
  error: '12 72% 41%',
};

function settled(data: unknown) {
  return { data, isLoading: false, isError: false, error: null };
}

function publishedSite(themeKey: string, brand: Record<string, unknown>): void {
  useResolveHostname.mockReturnValue(settled(ACADEMY));
  usePublishedWebsite.mockReturnValue(
    settled({
      status: 'published',
      themeKey,
      brand,
    } as unknown as WebsiteConfiguration)
  );
  usePublishedPages.mockReturnValue(settled([]));
}

const LOCATION = (search: string) => ({
  hostname: 'localhost',
  origin: 'http://localhost',
  search,
});
const ACADEMY_HOST = LOCATION('?__atlas_academy_preview=alpha');
const ATLAS_HOST = LOCATION('');

function renderApp(location: ReturnType<typeof LOCATION>) {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <RequestLocationProvider value={location}>
        <RouterProvider router={createMemoryRouter(appRoutes)} />
      </RequestLocationProvider>
    </I18nextProvider>
  );
}

function layer(locale: 'en' | 'ar' = 'en') {
  return (
    <I18nextProvider i18n={i18nFor(locale)}>
      <MemoryRouter>
        <CookieConsentProvider>
          <PublicWebsiteConsentLayer lookupKey="alpha" />
        </CookieConsentProvider>
      </MemoryRouter>
    </I18nextProvider>
  );
}

const i18nInstances = {
  en: createI18nInstance('en'),
  ar: createI18nInstance('ar'),
};
const i18nFor = (locale: 'en' | 'ar') => i18nInstances[locale];
const renderLayer = (locale: 'en' | 'ar' = 'en') => render(layer(locale));

const banners = () =>
  document.querySelectorAll<HTMLElement>(
    '[data-testid="cookie-consent-banner"]'
  );
const scopeOf = (element: Element) =>
  element.closest<HTMLElement>('.website-theme-scope');

beforeEach(() => {
  window.localStorage.clear();
  document.cookie = 'atlas_consent=; max-age=0; path=/';
});
afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark');
});

describe('RootRoute — which surface owns the banner', () => {
  it('Atlas host: one banner, in Atlas styles (no website scope)', () => {
    renderApp(ATLAS_HOST);
    expect(banners()).toHaveLength(1);
    expect(scopeOf(banners()[0]!)).toBeNull();
  });

  it('Academy host: one banner, inside a scope with the Academy primary', () => {
    publishedSite('modern-education', {
      primaryColor: ROLES.cta,
      palette: { roles: ROLES },
    });
    renderApp(ACADEMY_HOST);
    expect(banners()).toHaveLength(1);
    const scope = scopeOf(banners()[0]!);
    expect(scope).not.toBeNull();
    expect(scope!.hasAttribute('data-website-overlay-scope')).toBe(true);
    expect(scope!.style.getPropertyValue('--primary')).toBe(ROLES.cta);
    expect(scope!.style.getPropertyValue('--primary-foreground')).toBe(
      ROLES.ctaForeground
    );
  });
});

describe('PublicWebsiteConsentLayer', () => {
  it('a retired theme’s light brand gets dark text on the Accept button', () => {
    publishedSite('bold-creative', {
      primaryColor: '55 100% 50%',
      secondaryColor: '55 100% 50%',
      accentColor: '55 100% 50%',
    });
    renderLayer();
    const scope = scopeOf(banners()[0]!)!;
    expect(scope.style.getPropertyValue('--primary')).toBe('55 100% 50%');
    expect(scope.style.getPropertyValue('--primary-foreground')).toBe(
      '222 22% 12%'
    );
  });

  it('an invalid stored colour falls back to the theme default', () => {
    publishedSite('premium-academy', { primaryColor: '#123456' });
    renderLayer();
    const scope = scopeOf(banners()[0]!)!;
    expect(scope.style.getPropertyValue('--primary')).toBe('222 47% 25%');
    expect(scope.style.getPropertyValue('--primary-foreground')).toBe(
      '0 0% 100%'
    );
  });

  it('is neutral while the site is loading, then wears the palette without remounting', () => {
    useResolveHostname.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    usePublishedWebsite.mockReturnValue(settled(undefined));
    usePublishedPages.mockReturnValue(settled(undefined));
    const view = renderLayer();
    const before = banners()[0]!;
    expect(scopeOf(before)!.style.getPropertyValue('--primary')).toBe(
      '222 22% 12%'
    );

    publishedSite('premium-academy', { primaryColor: '200 80% 35%' });
    view.rerender(layer());
    const after = banners()[0]!;
    expect(scopeOf(after)!.style.getPropertyValue('--primary')).toBe(
      '200 80% 35%'
    );
    // The same DOM node: the palette arriving does not remount the banner.
    expect(after).toBe(before);
  });

  it('OS dark mode does not change the palette the banner reads', () => {
    publishedSite('modern-education', {
      primaryColor: ROLES.cta,
      palette: { roles: ROLES },
    });
    renderLayer();
    const light = scopeOf(banners()[0]!)!.getAttribute('style');
    cleanup();
    document.documentElement.classList.add('dark');
    renderLayer();
    const scope = scopeOf(banners()[0]!)!;
    expect(scope.getAttribute('style')).toBe(light);
    expect(scope.style.getPropertyValue('--background')).toBe(ROLES.background);
    expect(scope.style.colorScheme).toBe('light');
    expect(scope.classList.contains('text-foreground')).toBe(true);
  });

  it('opens the preferences dialog inside the themed scope, in Arabic too', async () => {
    publishedSite('modern-education', {
      primaryColor: ROLES.cta,
      palette: { roles: ROLES },
    });
    renderLayer('ar');
    const banner = banners()[0]!;
    const manage = banner.querySelectorAll('button')[0]!;
    await act(async () => {
      fireEvent.click(manage);
    });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const portalRoot = dialog!.closest('[data-website-overlay-portal-root]');
    expect(portalRoot).not.toBeNull();
    expect(scopeOf(dialog!)!.style.getPropertyValue('--primary')).toBe(
      ROLES.cta
    );
  });

  it('accepting hides the banner (consent behaviour unchanged)', async () => {
    publishedSite('modern-education', {
      primaryColor: ROLES.cta,
      palette: { roles: ROLES },
    });
    renderLayer();
    const buttons = banners()[0]!.querySelectorAll('button');
    await act(async () => {
      fireEvent.click(buttons[buttons.length - 1]!);
    });
    expect(banners()).toHaveLength(0);
    expect(window.localStorage.getItem('atlas:cookie-consent')).toContain(
      '"preferences":true'
    );
  });
});
