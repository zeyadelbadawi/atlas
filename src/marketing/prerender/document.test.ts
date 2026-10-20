/**
 * The document template: language/direction from the server, canonical +
 * hreflang trio on indexable pages only, robots omitted unless it says
 * something, OG/Twitter with absolute URLs, theme colours, and no inline
 * executable script — only external files and JSON-LD data blocks
 * (CSP `script-src 'self'`).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  ogTitle,
  renderDocument,
  serializeJsonLd,
} from './document';
import { FIXTURE_ASSETS, FIXTURE_CTX, FIXTURE_PAGES } from './test-fixtures';

function documentFor(index: number, markdownAlternate?: string): Document {
  const page = FIXTURE_PAGES[index];
  const html = renderDocument({
    page,
    head: page.head(FIXTURE_CTX),
    ctx: FIXTURE_CTX,
    assets: FIXTURE_ASSETS,
    bodyHtml: renderToStaticMarkup(page.render(FIXTURE_CTX)),
    markdownAlternate,
  });
  expect(html.startsWith('<!doctype html>\n<html lang=')).toBe(true);
  return new DOMParser().parseFromString(html, 'text/html');
}

const attr = (doc: Document, selector: string, name = 'content') =>
  doc.querySelector(selector)?.getAttribute(name) ?? null;

describe('marketing document head', () => {
  it('sets lang/dir from the page (ar → rtl)', () => {
    expect(documentFor(0).documentElement.getAttribute('lang')).toBe('en');
    expect(documentFor(0).documentElement.getAttribute('dir')).toBe('ltr');
    expect(documentFor(1).documentElement.getAttribute('lang')).toBe('ar');
    expect(documentFor(1).documentElement.getAttribute('dir')).toBe('rtl');
    expect(attr(documentFor(1), 'meta[http-equiv="content-language"]')).toBe('ar');
  });

  it('has title, description, an absolute self canonical and the hreflang trio', () => {
    const doc = documentFor(2);
    expect(doc.title).toBe('pricing title en | Atlas');
    expect(attr(doc, 'meta[name="description"]')).toBe('pricing description en');
    expect(attr(doc, 'link[rel="canonical"]', 'href')).toBe('https://atlass.dpdns.org/pricing');
    const alternates = Array.from(doc.querySelectorAll('link[rel="alternate"][hreflang]')).map(
      (link) => [link.getAttribute('hreflang'), link.getAttribute('href')]
    );
    expect(alternates).toEqual([
      ['en', 'https://atlass.dpdns.org/pricing'],
      ['ar', 'https://atlass.dpdns.org/ar/pricing'],
      ['x-default', 'https://atlass.dpdns.org/pricing'],
    ]);
  });

  it('omits the robots meta on indexable pages and keeps 404 noindex without canonical/hreflang', () => {
    expect(documentFor(0).querySelector('meta[name="robots"]')).toBeNull();
    const notFound = documentFor(4);
    expect(attr(notFound, 'meta[name="robots"]')).toBe('noindex, follow');
    expect(notFound.querySelector('link[rel="canonical"]')).toBeNull();
    expect(notFound.querySelector('link[hreflang]')).toBeNull();
    expect(notFound.querySelector('meta[property="og:url"]')).toBeNull();
  });

  it('has Open Graph and Twitter tags with absolute image URLs and no twitter:site', () => {
    const doc = documentFor(1);
    expect(attr(doc, 'meta[property="og:title"]')).toBe('home title ar');
    expect(attr(doc, 'meta[property="og:site_name"]')).toBe('أطلس');
    expect(attr(doc, 'meta[property="og:locale"]')).toBe('ar_EG');
    expect(attr(doc, 'meta[property="og:locale:alternate"]')).toBe('en_US');
    expect(attr(doc, 'meta[property="og:url"]')).toBe('https://atlass.dpdns.org/ar');
    expect(attr(doc, 'meta[property="og:image"]')).toBe(
      'https://atlass.dpdns.org/marketing-assets/og/og-ar.jpg'
    );
    expect(attr(doc, 'meta[property="og:image:alt"]')).toBeTruthy();
    expect(attr(doc, 'meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(attr(doc, 'meta[name="twitter:image"]')).toBe(
      'https://atlass.dpdns.org/marketing-assets/og/og-ar.jpg'
    );
    expect(doc.querySelector('meta[name="twitter:site"]')).toBeNull();
  });

  it('links theme colours, icons, the manifest, fonts, CSS and the module script', () => {
    const doc = documentFor(0);
    expect(
      Array.from(doc.querySelectorAll('meta[name="theme-color"]')).map((m) => [
        m.getAttribute('media'),
        m.getAttribute('content'),
      ])
    ).toEqual([
      ['(prefers-color-scheme: light)', '#1B3A8C'],
      ['(prefers-color-scheme: dark)', '#0A1222'],
    ]);
    expect(attr(doc, 'link[rel="icon"][type="image/svg+xml"]', 'href')).toBe('/favicon.svg');
    expect(attr(doc, 'link[rel="icon"][sizes]', 'href')).toBe('/favicon.ico');
    expect(attr(doc, 'link[rel="apple-touch-icon"]', 'href')).toBe('/apple-touch-icon.png');
    expect(attr(doc, 'link[rel="manifest"]', 'href')).toBe('/site.webmanifest');
    const fonts = Array.from(doc.querySelectorAll('link[rel="preload"][as="font"]'));
    expect(fonts.map((f) => f.getAttribute('href'))).toEqual(FIXTURE_ASSETS.fontPreloads.en);
    expect(fonts.every((f) => f.hasAttribute('crossorigin'))).toBe(true);
    expect(attr(doc, 'link[rel="stylesheet"]', 'href')).toBe('/assets/marketing-abc123.css');
    expect(attr(documentFor(1), 'link[rel="preload"][as="font"]', 'href')).toBe(
      FIXTURE_ASSETS.fontPreloads.ar[0]
    );
  });

  it('has no inline executable script: external files and ld+json data only', () => {
    const doc = documentFor(0);
    const scripts = Array.from(doc.querySelectorAll('script'));
    for (const script of scripts) {
      const type = script.getAttribute('type');
      if (type === 'application/ld+json') {
        expect(() => JSON.parse(script.textContent ?? '')).not.toThrow();
      } else {
        expect(script.getAttribute('src')).toMatch(/^\/assets\//);
        expect(script.textContent).toBe('');
      }
    }
    // The theme script is classic and render-blocking; the app script a module.
    const theme = doc.querySelector('script[src="/assets/marketing-theme-0011aabb.js"]');
    expect(theme?.hasAttribute('type')).toBe(false);
    expect(theme?.hasAttribute('async') || theme?.hasAttribute('defer')).toBe(false);
    const stylesheet = doc.querySelector('link[rel="stylesheet"]');
    expect(theme!.compareDocumentPosition(stylesheet!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(attr(doc, 'script[type="module"]', 'src')).toBe('/assets/marketing-def456.js');
    // No inline event handlers anywhere.
    expect(doc.documentElement.outerHTML).not.toMatch(/\son[a-z]+=/i);
  });

  it('cannot be broken out of by JSON-LD data', () => {
    const serialized = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual({ name: '</script><script>alert(1)</script>' });
    const doc = documentFor(0);
    expect(doc.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
  });

  it('adds the Markdown alternate when asked (the pricing page)', () => {
    expect(
      attr(documentFor(2, '/pricing.md'), 'link[rel="alternate"][type="text/markdown"]', 'href')
    ).toBe('/pricing.md');
    expect(documentFor(0).querySelector('link[type="text/markdown"]')).toBeNull();
  });

  it('renders the page body inside <body class="mk">', () => {
    const doc = documentFor(0);
    expect(doc.body.className).toBe('mk');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
  });
});

describe('document helpers', () => {
  it('joins the origin and path', () => {
    expect(absoluteUrl('https://atlass.dpdns.org/', '/')).toBe('https://atlass.dpdns.org/');
    expect(absoluteUrl('https://atlass.dpdns.org', 'pricing')).toBe(
      'https://atlass.dpdns.org/pricing'
    );
    expect(absoluteUrl('https://x', 'https://y/z')).toBe('https://y/z');
  });

  it('drops the brand suffix for og:title only', () => {
    expect(ogTitle('Privacy Policy | Atlas')).toBe('Privacy Policy');
    expect(ogTitle('سياسة الخصوصية | أطلس')).toBe('سياسة الخصوصية');
    expect(ogTitle('Atlas Pricing: Plans')).toBe('Atlas Pricing: Plans');
  });
});
