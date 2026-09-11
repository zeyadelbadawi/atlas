/**
 * Regression tests for "an unpublished Academy looked like an Atlas
 * outage", and for the Coming Soon page that replaces it.
 *
 * THE ORIGINAL DEFECT. `GET /public/websites/:academyId` deliberately 404s
 * for a site that is not published — the publication condition is part of
 * the query, so a draft row is indistinguishable from a missing one. That
 * is the correct security posture and is unchanged. But the hook treated
 * EVERY query error as `unavailable`, so its `unpublished` branch was
 * unreachable and an Academy that had simply not launched yet told its
 * visitors that the platform was broken.
 *
 * The distinction these tests pin down is the whole point of the fix and is
 * the thing most at risk of being undone by a future "simplify the error
 * handling" change: a 404 on the configuration of an Academy WHOSE HOSTNAME
 * RESOLVED means "not published yet"; a 500, a network failure or a timeout
 * means Atlas is failing. Conflating them in either direction is a defect —
 * calling an outage "coming soon" hides a real incident just as badly as
 * calling a deliberate draft an outage libels the customer.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { HostnameResolution } from '@types';

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

const { usePublicWebsiteData } = await import('./hooks/usePublicWebsiteData');
const { AcademyComingSoon } = await import('./components/AcademyComingSoon');

afterEach(cleanup);

const ACADEMY: HostnameResolution = {
  academyId: 'academy-1',
  academyName: 'Elzozo Academy',
  academyLogo: undefined,
} as HostnameResolution;

/** A settled react-query result in the shape the hook reads. */
function settled(data: unknown) {
  return { data, isLoading: false, isError: false, error: null };
}
function failed(error: unknown) {
  return { data: undefined, isLoading: false, isError: true, error };
}

function resolvedHostname() {
  useResolveHostname.mockReturnValue(settled(ACADEMY));
}

describe('usePublicWebsiteData — unpublished is not an outage', () => {
  it('reports `unpublished` when the published configuration 404s', () => {
    resolvedHostname();
    usePublishedWebsite.mockReturnValue(failed({ kind: 'notFound', status: 404 }));
    usePublishedPages.mockReturnValue(settled([]));

    const { result } = renderHook(() => usePublicWebsiteData('elzozo.example'));

    expect(result.current.status).toBe('unpublished');
  });

  it('carries the resolved Academy identity so the page can be branded', () => {
    resolvedHostname();
    usePublishedWebsite.mockReturnValue(failed({ kind: 'notFound', status: 404 }));
    usePublishedPages.mockReturnValue(settled([]));

    const { result } = renderHook(() => usePublicWebsiteData('elzozo.example'));

    expect(
      result.current.status === 'unpublished' && result.current.academy,
    ).toEqual(ACADEMY);
  });

  it('reports `unavailable` — not `unpublished` — on a server error', () => {
    resolvedHostname();
    usePublishedWebsite.mockReturnValue(
      failed({ kind: 'server', status: 500 }),
    );
    usePublishedPages.mockReturnValue(settled([]));

    const { result } = renderHook(() => usePublicWebsiteData('elzozo.example'));

    expect(result.current.status).toBe('unavailable');
  });

  /*
   * A transport failure has NO HTTP status at all. Reading a missing status
   * as "not 404, therefore an outage" is correct; reading it as a 404 would
   * dress a real incident up as a launch announcement.
   */
  it('reports `unavailable` on a network failure with no HTTP status', () => {
    resolvedHostname();
    usePublishedWebsite.mockReturnValue(failed({ kind: 'network' }));
    usePublishedPages.mockReturnValue(settled([]));

    const { result } = renderHook(() => usePublicWebsiteData('elzozo.example'));

    expect(result.current.status).toBe('unavailable');
  });

  it('reports `unavailable` when the hostname lookup itself fails', () => {
    useResolveHostname.mockReturnValue(failed({ kind: 'server', status: 500 }));
    usePublishedWebsite.mockReturnValue(settled(undefined));
    usePublishedPages.mockReturnValue(settled([]));

    const { result } = renderHook(() => usePublicWebsiteData('elzozo.example'));

    expect(result.current.status).toBe('unavailable');
  });

  it('reports `not-found` for a hostname that belongs to no Academy', () => {
    // `resolveHostname` converts its own 404 to `null` rather than throwing.
    useResolveHostname.mockReturnValue(settled(null));
    usePublishedWebsite.mockReturnValue(settled(undefined));
    usePublishedPages.mockReturnValue(settled([]));

    const { result } = renderHook(() => usePublicWebsiteData('nobody.example'));

    expect(result.current.status).toBe('not-found');
  });

  it('reports `unpublished` when the configuration loads but is still a draft', () => {
    resolvedHostname();
    usePublishedWebsite.mockReturnValue(settled({ status: 'draft' }));
    usePublishedPages.mockReturnValue(settled([]));

    const { result } = renderHook(() => usePublicWebsiteData('elzozo.example'));

    expect(result.current.status).toBe('unpublished');
  });

  it('reports `ready` for a published site', () => {
    resolvedHostname();
    usePublishedWebsite.mockReturnValue(settled({ status: 'published' }));
    usePublishedPages.mockReturnValue(settled([]));

    const { result } = renderHook(() => usePublicWebsiteData('elzozo.example'));

    expect(result.current.status).toBe('ready');
  });
});

describe('AcademyComingSoon', () => {
  function renderComingSoon(
    locale: 'en' | 'ar',
    academy: HostnameResolution = ACADEMY,
  ) {
    const i18n = createI18nInstance(locale);
    return render(
      <I18nextProvider i18n={i18n}>
        <AcademyComingSoon academy={academy} locale={locale} />
      </I18nextProvider>,
    );
  }

  it('shows the Academy name', () => {
    renderComingSoon('en');
    expect(screen.getByText('Elzozo Academy')).toBeTruthy();
  });

  it('fills the viewport, so no surrounding app background shows through', () => {
    renderComingSoon('en');
    const root = screen.getByTestId('academy-coming-soon');

    expect(root.className).toContain('min-h-[100dvh]');
    expect(root.className).not.toMatch(/h-\[\d+px\]/);
  });

  it('renders right-to-left in Arabic', () => {
    renderComingSoon('ar');
    const root = screen.getByTestId('academy-coming-soon');

    expect(root.getAttribute('dir')).toBe('rtl');
    expect(root.getAttribute('lang')).toBe('ar');
  });

  it('renders left-to-right in English', () => {
    renderComingSoon('en');
    const root = screen.getByTestId('academy-coming-soon');

    expect(root.getAttribute('dir')).toBe('ltr');
    expect(root.getAttribute('lang')).toBe('en');
  });

  it('shows different copy per language rather than falling back to English', () => {
    const { container: en } = renderComingSoon('en');
    const english = en.textContent ?? '';
    cleanup();
    const { container: ar } = renderComingSoon('ar');
    const arabic = ar.textContent ?? '';

    expect(english.trim().length).toBeGreaterThan(0);
    expect(arabic.trim().length).toBeGreaterThan(0);
    expect(arabic).not.toBe(english);
    // Real Arabic script, not a romanised placeholder.
    expect(arabic).toMatch(/[ء-ي]/);
  });

  it('uses the Academy logo when one has been uploaded', () => {
    renderComingSoon('en', {
      ...ACADEMY,
      academyLogo: 'https://cdn.example/logo.png',
    } as HostnameResolution);

    const logo = screen.getByAltText('Elzozo Academy');
    expect(logo.getAttribute('src')).toBe('https://cdn.example/logo.png');
  });

  it("falls back to the Academy's own initial, never a stock mark", () => {
    renderComingSoon('en');
    expect(screen.queryByAltText('Elzozo Academy')).toBeNull();
    expect(screen.getByText('E')).toBeTruthy();
  });

  /*
   * The page is rendered from a hostname resolution alone — no draft
   * content is fetched or reachable. Anything resembling a launch date,
   * contact details or marketing copy would be invented, so the page must
   * not contain such a thing.
   */
  it('invents no business data it was never given', () => {
    const { container } = renderComingSoon('en');
    const text = container.textContent ?? '';

    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/); // no launch date
    expect(text).not.toMatch(/@[\w.-]+\.\w+/); // no email address
    expect(text).not.toMatch(/\+?\d[\d\s()-]{7,}/); // no phone number
  });
});
