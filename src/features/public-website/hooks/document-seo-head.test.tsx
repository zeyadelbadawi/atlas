/**
 * SEO/AEO/GEO pass — the head every public page gets: one tag list for the
 * server-rendered head and the browser, hreflang with x-default, Open Graph
 * locale and image, verification tokens, and nothing indexable about a
 * page that does not exist.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import type { ResolvedSeoMetadata } from '@types';

// The <html lang/dir> half of the hook (and its i18n) is covered elsewhere.
vi.mock('@features/website', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePublicWebsiteDocumentDirection: () => undefined,
}));
import {
  buildSeoHeadTags,
  renderSeoHeadHtml,
  useDocumentSeo,
  type UseDocumentSeoOptions,
} from './useDocumentSeo';

const seo: ResolvedSeoMetadata = {
  title: 'About',
  description: 'Who we are.',
  ogTitle: 'About · Horizon',
  ogDescription: 'Who we are.',
  ogImage: 'https://horizon.example/api/v1/public/websites/a1/og-image.png?v=1',
  canonicalPath: '/about',
  indexable: true,
  titleSource: 'fallback',
  descriptionSource: 'fallback',
  locale: 'ar',
  hreflangAlternates: [
    { locale: 'en', path: '/about' },
    { locale: 'ar', path: '/ar/about' },
  ],
  xDefaultPath: '/about',
};

const options: UseDocumentSeoOptions = {
  seo,
  siteTitle: 'Horizon',
  siteName: 'Horizon',
  canonicalUrl: 'https://horizon.example/ar/about',
  locale: 'ar',
  themeColor: '#2563eb',
  appleTouchIconHref: '/api/v1/public/websites/a1/icon.png?size=180&v=1',
  structuredData: [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [],
    },
  ],
};

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
});

describe('the server-rendered head', () => {
  const html = renderSeoHeadHtml(options);

  it('lists every language version and x-default, absolute, after a self-referencing canonical', () => {
    expect(html).toContain(
      '<link rel="canonical" href="https://horizon.example/ar/about" data-atlas-seo="true">'
    );
    expect(html).toContain(
      '<link rel="alternate" hreflang="en" href="https://horizon.example/about" data-atlas-seo="true">'
    );
    expect(html).toContain(
      '<link rel="alternate" hreflang="ar" href="https://horizon.example/ar/about" data-atlas-seo="true">'
    );
    expect(html).toContain(
      '<link rel="alternate" hreflang="x-default" href="https://horizon.example/about" data-atlas-seo="true">'
    );
  });

  it('carries Open Graph site name, locale (with the other language), image, and the large Twitter card', () => {
    expect(html).toContain('<meta property="og:site_name" content="Horizon"');
    expect(html).toContain('<meta property="og:locale" content="ar_AR"');
    expect(html).toContain(
      '<meta property="og:locale:alternate" content="en_US"'
    );
    expect(html).toContain(
      '<meta property="og:image" content="https://horizon.example/api/v1/public/websites/a1/og-image.png?v=1"'
    );
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image"'
    );
    expect(html).toContain('<meta name="theme-color" content="#2563eb"');
    expect(html).toContain(
      '<link rel="apple-touch-icon" href="/api/v1/public/websites/a1/icon.png?size=180&amp;v=1"'
    );
    expect(html).toContain(
      '<meta name="robots" content="index,follow,max-image-preview:large"'
    );
  });

  it('renders verification tokens only when they are plain tokens', () => {
    const tags = buildSeoHeadTags({
      ...options,
      verification: { google: 'abc_123-XYZ', bing: '"><script>' },
    });
    expect(tags).toContainEqual({
      tag: 'meta',
      attr: 'name',
      key: 'google-site-verification',
      content: 'abc_123-XYZ',
    });
    expect(
      tags.some((tag) => tag.tag === 'meta' && tag.key === 'msvalidate.01')
    ).toBe(false);
  });

  it('a page that does not exist: noindex, and no canonical, alternates, og:url or tokens', () => {
    const notFound = renderSeoHeadHtml({
      ...options,
      notFound: true,
      verification: { google: 'abc' },
    });
    expect(notFound).toContain(
      '<meta name="robots" content="noindex,nofollow"'
    );
    expect(notFound).not.toMatch(
      /rel="canonical"|hreflang=|og:url|og:locale:alternate|google-site-verification/
    );
  });

  it('JSON-LD cannot close its script element', () => {
    const hostile = renderSeoHeadHtml({
      ...options,
      structuredData: [{ name: '</script><script>alert(1)</script>' }],
    });
    expect(hostile).not.toContain('</script><script>');
    expect(hostile).toContain('\\u003c/script\\u003e');
  });
});

describe('useDocumentSeo in the browser', () => {
  it('replaces a server-rendered head with the same tags, never a second copy', () => {
    document.head.innerHTML = renderSeoHeadHtml(options);
    renderHook(() => useDocumentSeo(options));
    expect(
      document.head.querySelectorAll('link[rel="canonical"]')
    ).toHaveLength(1);
    expect(document.head.querySelectorAll('link[hreflang]')).toHaveLength(3);
    expect(
      document.head.querySelectorAll('script[type="application/ld+json"]')
    ).toHaveLength(1);
    expect(
      document.head.querySelectorAll('meta[name="description"]')
    ).toHaveLength(1);
    expect(document.title).toBe('About · Horizon');
  });

  it('removes its tags when the page goes away', () => {
    const { unmount } = renderHook(() => useDocumentSeo(options));
    expect(
      document.head.querySelectorAll('[data-atlas-seo]').length
    ).toBeGreaterThan(5);
    unmount();
    expect(document.head.querySelectorAll('[data-atlas-seo]')).toHaveLength(0);
  });
});
