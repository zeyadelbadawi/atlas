/**
 * B1 (DL-50) — the marketing pages are the static site; inside the app
 * they hand off to it, and the kept app pages still render.
 *
 * The real `AtlasAppRoutes` table is rendered (lazy pages included) inside
 * the real providers, at each address a visitor may still follow:
 *   - `/`, `/ar`, `/features`, `/pricing`, `/security`, `/about` and their
 *     `/ar/` twins render `StaticMarketingRedirect` (one document reload to
 *     the static page; here the loop guard has already fired, so its
 *     fallback shows), never a forward to another page;
 *   - any other `/ar/...` → `/ar`; a kept page's `/ar/` address → that page;
 *   - `/contact`, `/privacy-policy`, `/terms`, `/auth/sign-in` and
 *     `/auth/forgot-password` render their pages, `/auth/sign-up` still
 *     reaches sign-up, and the public header links no marketing page.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppProviders } from '@app/providers';
import { CookieConsentProvider } from '@features/legal';
import AtlasAppRoutes from './AtlasAppRoutes';
import { PUBLIC_ROUTES, STATIC_MARKETING_ROUTES } from './route-paths';
import {
  platformUrlLanguage,
  resolveArabicPlatformTarget,
} from './retired-marketing-routes';
import {
  STATIC_MARKETING_RELOAD_KEY,
  reloadGuardPath,
  resetStaticMarketingReloadForTests,
} from './static-marketing-reload';

function Where(): JSX.Element {
  const location = useLocation();
  return (
    <output data-testid="where">{`${location.pathname}${location.search}${location.hash}`}</output>
  );
}

/**
 * As if the document had just reloaded for `path` and come back to the app
 * (the static site off): the guard refuses a second reload, so jsdom is
 * never asked to navigate and the fallback renders.
 */
function seedReloadedFor(path: string): void {
  window.sessionStorage.setItem(
    STATIC_MARKETING_RELOAD_KEY,
    JSON.stringify({ path: reloadGuardPath(path), at: Date.now() })
  );
}

function renderAt(path: string, reloadedFor = path.split(/[?#]/)[0]) {
  seedReloadedFor(reloadedFor);
  return render(
    <AppProviders initialLanguage="en">
      <CookieConsentProvider>
        <MemoryRouter initialEntries={[path]}>
          <AtlasAppRoutes />
          <Where />
        </MemoryRouter>
      </CookieConsentProvider>
    </AppProviders>
  );
}

const where = () => screen.getByTestId('where').textContent;

/** Lazy route chunks load from source here; allow for a slow machine. */
const SLOW = { timeout: 15_000 };

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetStaticMarketingReloadForTests();
});
afterEach(() => cleanup());

describe('marketing routes (pure)', () => {
  it('lists exactly the static marketing pages the app hands off', () => {
    expect([...STATIC_MARKETING_ROUTES]).toEqual([
      '/',
      '/features',
      '/pricing',
      '/security',
      '/about',
      '/ar',
      '/ar/features',
      '/ar/pricing',
      '/ar/security',
      '/ar/about',
    ]);
    expect(PUBLIC_ROUTES).not.toHaveProperty('features');
    expect(PUBLIC_ROUTES).not.toHaveProperty('pricing');
  });

  it('sends a kept page’s /ar/ address to the page, anything else to /ar', () => {
    expect(resolveArabicPlatformTarget('/ar/contact')).toBe('/contact');
    expect(resolveArabicPlatformTarget('/ar/privacy-policy/')).toBe(
      '/privacy-policy'
    );
    expect(resolveArabicPlatformTarget('/ar/terms')).toBe('/terms');
    expect(resolveArabicPlatformTarget('/ar/pricing')).toBe('/ar');
    expect(resolveArabicPlatformTarget('/ar/features')).toBe('/ar');
    expect(resolveArabicPlatformTarget('/ar/dashboard')).toBe('/ar');
    expect(resolveArabicPlatformTarget('/ar/')).toBe('/ar');
  });

  it('names Arabic for /ar addresses only; elsewhere the preference decides', () => {
    expect(platformUrlLanguage('/ar')).toBe('ar');
    expect(platformUrlLanguage('/ar/')).toBe('ar');
    expect(platformUrlLanguage('/ar/contact')).toBe('ar');
    expect(platformUrlLanguage('/ar/pricing')).toBe('ar');
    expect(platformUrlLanguage('/')).toBeUndefined();
    expect(platformUrlLanguage('/features')).toBeUndefined();
    expect(platformUrlLanguage('/arts')).toBeUndefined();
    expect(platformUrlLanguage('/contact')).toBeUndefined();
    expect(platformUrlLanguage('/dashboard')).toBeUndefined();
    expect(platformUrlLanguage('/auth/sign-in')).toBeUndefined();
  });
});

describe('marketing routes (router)', { timeout: 30_000 }, () => {
  it.each(STATIC_MARKETING_ROUTES.map((path) => [path]))(
    '%s hands off to the static page (no in-app forward)',
    async (path) => {
      renderAt(path);
      const fallback = await screen.findByTestId(
        'static-marketing-fallback',
        {},
        SLOW
      );
      expect(fallback.getAttribute('lang')).toBe(
        path === '/ar' || path.startsWith('/ar/') ? 'ar' : 'en'
      );
      expect(where()).toBe(path);
      // The retry link: a full load of the same address, which the edge
      // answers with the static page whenever it is on.
      expect(fallback.querySelector(`a[href="${path}"]`)).not.toBeNull();
    }
  );

  it('sends any other /ar/ address to /ar', async () => {
    renderAt('/ar/anything-else', '/ar');
    await waitFor(() => expect(where()).toBe('/ar'), SLOW);
    expect(
      await screen.findByTestId('static-marketing-fallback', {}, SLOW)
    ).toBeTruthy();
  });

  it.each([
    ['/ar/contact?topic=sales', '/contact?topic=sales'],
    ['/ar/privacy-policy', '/privacy-policy'],
    ['/ar/terms', '/terms'],
  ])('%s forwards to the kept page %s', async (from, to) => {
    renderAt(from);
    await waitFor(() => expect(where()).toBe(to), SLOW);
    expect(screen.queryByTestId('static-marketing-fallback')).toBeNull();
  });

  it('sends the old /#contact anchor to the contact form', async () => {
    renderAt('/#contact');
    await waitFor(() => expect(where()).toBe('/contact'), SLOW);
    await waitFor(
      () =>
        expect(document.querySelector('section#contact form')).not.toBeNull(),
      SLOW
    );
  });
});

describe('kept platform pages still render', { timeout: 30_000 }, () => {
  it('/contact renders the contact form, and the header links no marketing page', async () => {
    const { container } = renderAt('/contact');
    await waitFor(
      () =>
        expect(container.querySelector('section#contact form')).not.toBeNull(),
      SLOW
    );
    const hrefs = Array.from(
      container.querySelectorAll('header a, footer a')
    ).map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/contact');
    expect(hrefs).toContain('/auth/sign-in');
    expect(hrefs).toContain('/privacy-policy');
    expect(hrefs).toContain('/terms');
    for (const retired of [
      '/features',
      '/pricing',
      '/#contact',
      '/auth/register',
    ]) {
      expect(hrefs).not.toContain(retired);
    }
  });

  it.each([
    ['/privacy-policy', 'Privacy Policy'],
    ['/terms', 'Terms of Service'],
  ])('%s renders the legal document', async (path, title) => {
    renderAt(path);
    const heading = await screen.findByRole('heading', { level: 1 }, SLOW);
    expect(heading.textContent).toContain(title);
    expect(where()).toBe(path);
  });

  it.each(['/auth/sign-in', '/auth/forgot-password'])(
    '%s renders the auth page',
    async (path) => {
      const { container } = renderAt(path);
      await waitFor(
        () =>
          expect(container.querySelector('input[type="email"]')).not.toBeNull(),
        SLOW
      );
      expect(where()).toBe(path);
    }
  );

  it('keeps the sign-up address (people and old links use /auth/sign-up)', async () => {
    renderAt('/auth/sign-up');
    await waitFor(() => expect(where()).toBe('/auth/register'), SLOW);
  });
});
