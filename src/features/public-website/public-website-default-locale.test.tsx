/**
 * B0-WEB-02 — the public router follows the site's default language: on an
 * Arabic-default site Arabic is served at `/` and English under `/en`, old
 * `/ar/...` links land on their unprefixed page, and an English-default
 * site routes exactly as before (with `/en/...` links from an
 * Arabic-default period landing back on the unprefixed page).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { RequestLocationProvider } from '@hooks';
import type { HostnameResolution, WebsitePage } from '@types';

const configuration = vi.fn();

vi.mock('./hooks/useResolveHostname', () => ({
  useResolveHostname: () => settled(ACADEMY),
}));
vi.mock('./hooks/usePublishedWebsite', () => ({
  usePublishedWebsite: () => settled(configuration() as unknown),
}));
vi.mock('./hooks/usePublishedPages', () => ({
  usePublishedPages: () => settled(PAGES),
}));
vi.mock('./components/PublicWebsitePage', () => ({
  PublicWebsitePage: function PageStub({ locale }: { locale: string }) {
    const location = useLocation();
    return (
      <p data-testid="page">
        {locale} {location.pathname}
      </p>
    );
  },
}));
vi.mock('./components/PublicWebsiteConsentLayer', () => ({
  PublicWebsiteConsentLayer: () => null,
}));

const { PublicWebsiteRouter } = await import('./PublicWebsiteRouter');

const ACADEMY = {
  academyId: 'academy-1',
  academyName: 'Alpha Academy',
} as HostnameResolution;
const PAGES = [
  {
    id: 'home',
    pageType: 'core',
    coreType: 'home',
    slug: 'home',
    visible: true,
  },
  {
    id: 'about',
    pageType: 'core',
    coreType: 'about',
    slug: 'about',
    visible: true,
  },
] as unknown as WebsitePage[];

function settled(data: unknown) {
  return { data, isLoading: false, isError: false, error: null };
}

function site(defaultLocale?: 'ar') {
  configuration.mockReturnValue({
    status: 'published',
    themeKey: 'modern-education',
    brand: {},
    seo: {},
    ...(defaultLocale ? { defaultLocale } : {}),
  });
}

function visit(path: string) {
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <RequestLocationProvider
        value={{
          hostname: 'alpha.example',
          origin: 'https://alpha.example',
          search: '',
        }}
      >
        <MemoryRouter initialEntries={[path]}>
          <PublicWebsiteRouter
            context={
              {
                mode: 'academy-website',
                lookupType: 'custom-domain',
                value: 'alpha.example',
              } as never
            }
          />
        </MemoryRouter>
      </RequestLocationProvider>
    </I18nextProvider>
  );
  return screen.getByTestId('page').textContent;
}

afterEach(cleanup);

describe('public routing — English-default site (unchanged)', () => {
  it.each([
    ['/', 'en /'],
    ['/about', 'en /about'],
    ['/ar', 'ar /ar'],
    ['/ar/about', 'ar /ar/about'],
    // A link from while the site was Arabic-default: one hop home.
    ['/en/about', 'en /about'],
    ['/en', 'en /'],
  ])('%s → %s', (path, expected) => {
    site();
    expect(visit(path)).toBe(expected);
  });
});

describe('public routing — Arabic-default site', () => {
  it.each([
    ['/', 'ar /'],
    ['/about', 'ar /about'],
    ['/en', 'en /en'],
    ['/en/about', 'en /en/about'],
    // Old Arabic links land on the unprefixed Arabic page.
    ['/ar', 'ar /'],
    ['/ar/about', 'ar /about'],
  ])('%s → %s', (path, expected) => {
    site('ar');
    expect(visit(path)).toBe(expected);
  });

  it('an unpublished site routes English-default whatever its draft says', () => {
    configuration.mockReturnValue({ status: 'draft', defaultLocale: 'ar' });
    // Not ready: the shell is the Coming Soon/status page, never a redirect.
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <RequestLocationProvider
          value={{
            hostname: 'alpha.example',
            origin: 'https://alpha.example',
            search: '',
          }}
        >
          <MemoryRouter initialEntries={['/ar/about']}>
            <PublicWebsiteRouter
              context={
                {
                  mode: 'academy-website',
                  lookupType: 'custom-domain',
                  value: 'alpha.example',
                } as never
              }
            />
          </MemoryRouter>
        </RequestLocationProvider>
      </I18nextProvider>
    );
    expect(screen.queryByTestId('page')).toBeNull();
  });
});
