/**
 * The Academy's own favicon on its public website (2 Oct 2026): the
 * uploaded favicon never replaced the platform's `/favicon.svg`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import {
  ACADEMY_FAVICON_ATTR,
  academyFaviconHref,
  useAcademyFavicon,
} from './useAcademyFavicon';
import { renderSeoHeadHtml } from './useDocumentSeo';
import { buildSsrDocument } from '@/ssr/ssr-document';

const DEFAULT_ICON =
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg">';
const icons = () =>
  Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  );

beforeEach(() => {
  document.head.innerHTML = DEFAULT_ICON;
});
afterEach(cleanup);

describe('academyFaviconHref', () => {
  it('is the versioned favicon URL when the Academy has one, else nothing', () => {
    expect(
      academyFaviconHref(
        { academyId: 'a1', faviconVersion: '0123abcd' },
        '/api/v1/'
      )
    ).toBe('/api/v1/public/websites/a1/favicon?v=0123abcd');
    expect(academyFaviconHref({ academyId: 'a1' }, '/api/v1')).toBeUndefined();
    expect(academyFaviconHref(undefined, '/api/v1')).toBeUndefined();
  });
});

describe('useAcademyFavicon', () => {
  it("replaces the platform icon with the Academy's and puts it back on unmount", () => {
    const { unmount } = renderHook(() =>
      useAcademyFavicon('/api/v1/public/websites/a1/favicon?v=1')
    );
    expect(icons().map((link) => link.getAttribute('href'))).toEqual([
      '/api/v1/public/websites/a1/favicon?v=1',
    ]);
    unmount();
    expect(icons().map((link) => link.getAttribute('href'))).toEqual([
      '/favicon.svg',
    ]);
  });

  it('follows a new version (a new upload) without leaving the old one', () => {
    const { rerender } = renderHook(({ href }) => useAcademyFavicon(href), {
      initialProps: { href: '/api/v1/public/websites/a1/favicon?v=1' },
    });
    rerender({ href: '/api/v1/public/websites/a1/favicon?v=2' });
    expect(icons().map((link) => link.getAttribute('href'))).toEqual([
      '/api/v1/public/websites/a1/favicon?v=2',
    ]);
  });

  it('leaves the head alone when the Academy has no favicon', () => {
    renderHook(() => useAcademyFavicon(undefined));
    expect(icons().map((link) => link.getAttribute('href'))).toEqual([
      '/favicon.svg',
    ]);
  });

  it('adopts a server-rendered favicon tag instead of adding a second one', () => {
    document.head.innerHTML = `<link rel="icon" href="/api/v1/public/websites/a1/favicon?v=1" ${ACADEMY_FAVICON_ATTR}="true">`;
    renderHook(() =>
      useAcademyFavicon('/api/v1/public/websites/a1/favicon?v=1')
    );
    expect(icons()).toHaveLength(1);
  });
});

describe('server-rendered head', () => {
  const seo = {
    title: 'Home',
    description: 'd',
    indexable: true,
    hreflangAlternates: [],
  } as unknown as Parameters<typeof renderSeoHeadHtml>[0]['seo'];

  it('carries the Academy favicon, escaped, and the document drops the platform icon', () => {
    const headHtml = renderSeoHeadHtml({
      seo,
      locale: 'en',
      faviconHref: '/api/v1/public/websites/a1/favicon?v=1&x="y"',
    });
    expect(headHtml).toContain(
      `<link rel="icon" href="/api/v1/public/websites/a1/favicon?v=1&amp;x=&quot;y&quot;" ${ACADEMY_FAVICON_ATTR}="true">`
    );
    const template = `<!doctype html><html><head><title>Atlas</title>${DEFAULT_ICON}</head><body><div id="root"></div></body></html>`;
    const html = buildSsrDocument(template, {
      locale: 'en',
      direction: 'ltr',
      headHtml,
      preloadHtml: '',
      appHtml: '',
      payloadJson: '{}',
    });
    expect(html).not.toContain('/favicon.svg');
    expect(html.match(/rel="icon"/g)).toHaveLength(1);
  });

  it('keeps the platform icon when the Academy has none', () => {
    const headHtml = renderSeoHeadHtml({ seo, locale: 'en' });
    expect(headHtml).not.toContain('rel="icon"');
    const html = buildSsrDocument(
      `<html><head>${DEFAULT_ICON}</head><body><div id="root"></div></body></html>`,
      {
        locale: 'en',
        direction: 'ltr',
        headHtml,
        preloadHtml: '',
        appHtml: '',
        payloadJson: '{}',
      }
    );
    expect(html).toContain('/favicon.svg');
  });
});
