/**
 * Slug change — an Academy's OLD address answers with the backend's
 * `redirectHost`: the public router moves the browser there at once (same
 * path, query and hash, `location.replace`) and renders nothing of the
 * site meanwhile, on every route (pages, sign-in, the learner area). The
 * live address renders normally.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { RequestLocationProvider } from '@hooks';
import type { HostnameResolution } from '@types';
import type * as ConfigModule from '@config';

const resolution = vi.fn<() => HostnameResolution>();

vi.mock('@config', async (importOriginal) => {
  const actual = await importOriginal<typeof ConfigModule>();
  // A production build: local development never moves hosts.
  return { ...actual, ENV: { ...actual.ENV, isDevelopment: false } };
});
vi.mock('./hooks/useResolveHostname', () => ({
  useResolveHostname: () => settled(resolution()),
}));
vi.mock('./hooks/usePublishedWebsite', () => ({
  usePublishedWebsite: () =>
    settled({ status: 'published', themeKey: 'modern-education', brand: {}, seo: {} }),
}));
vi.mock('./hooks/usePublishedPages', () => ({
  usePublishedPages: () =>
    settled([
      { id: 'home', pageType: 'core', coreType: 'home', slug: 'home', visible: true },
    ]),
}));
vi.mock('./components/PublicWebsitePage', () => ({
  PublicWebsitePage: () => <p data-testid="page">site</p>,
}));
vi.mock('./components/PublicWebsiteConsentLayer', () => ({
  PublicWebsiteConsentLayer: () => null,
}));

const { PublicWebsiteRouter } = await import('./PublicWebsiteRouter');

const OLD = 'nour-old.atlass.dpdns.org';
const NEW = 'nour-new.atlass.dpdns.org';

function settled(data: unknown) {
  return { data, isLoading: false, isError: false, error: null };
}

const replace = vi.fn();
const realLocation = window.location;

function visit(hostname: string, path: string, search = '') {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      hostname,
      pathname: path,
      search,
      hash: '#top',
      origin: `https://${hostname}`,
      replace,
    },
  });
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <RequestLocationProvider
        value={{ hostname, origin: `https://${hostname}`, search }}
      >
        <MemoryRouter initialEntries={[`${path}${search}`]}>
          <PublicWebsiteRouter
            context={
              {
                mode: 'academy-website',
                lookupType: 'subdomain',
                value: hostname.split('.')[0],
              } as never
            }
          />
        </MemoryRouter>
      </RequestLocationProvider>
    </I18nextProvider>
  );
}

beforeEach(() => {
  replace.mockReset();
  // `probeHostAnswers` (the canonical-host move) must never be what moves us.
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: realLocation,
  });
});

describe('public website — an old address after a slug change', () => {
  it('moves to the new address at once, keeping path, query and hash, and shows no page', () => {
    resolution.mockReturnValue({
      academyId: 'academy-1',
      academyName: 'Nour Academy',
      academySlug: 'nour-new',
      canonicalHost: NEW,
      redirectHost: NEW,
    });

    visit(OLD, '/courses', '?level=1');

    expect(replace).toHaveBeenCalledWith(`https://${NEW}/courses?level=1#top`);
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it('also moves the sign-in page and the learner area', () => {
    resolution.mockReturnValue({
      academyId: 'academy-1',
      academyName: 'Nour Academy',
      academySlug: 'nour-new',
      canonicalHost: NEW,
      redirectHost: NEW,
    });

    visit(OLD, '/sign-in');
    expect(replace).toHaveBeenLastCalledWith(`https://${NEW}/sign-in#top`);
    cleanup();
    visit(OLD, '/my/courses');
    expect(replace).toHaveBeenLastCalledWith(`https://${NEW}/my/courses#top`);
  });

  it('renders the site on the live address', () => {
    resolution.mockReturnValue({
      academyId: 'academy-1',
      academyName: 'Nour Academy',
      academySlug: 'nour-new',
      canonicalHost: NEW,
    });

    visit(NEW, '/');

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('page').textContent).toBe('site');
  });
});
