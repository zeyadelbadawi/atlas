/**
 * Sitemaps and robots.txt, generated from the page registry (SPEC §E.5,
 * §E.6): a sitemap index of per-language files, only listed + indexable
 * pages, the full hreflang set only for complete pairs, compact XML with no
 * changefreq/priority; robots.txt never disallows app paths.
 */
import { describe, expect, it } from 'vitest';
import type { MarketingPageDef } from '../types';
import {
  buildLocaleSitemap,
  buildRobotsTxt,
  buildSitemapIndex,
  sitemapLanguages,
  type ResolvedPage,
} from './seo-files';
import { FIXTURE_CTX, FIXTURE_PAGES } from './test-fixtures';

function resolve(pages: readonly MarketingPageDef[]): ResolvedPage[] {
  return pages.map((page) => {
    const head = page.head(FIXTURE_CTX);
    return {
      page,
      title: head.title,
      description: head.description,
      canonicalPath: head.canonicalPath,
      alternates: head.alternates,
      robots: head.robots,
    };
  });
}

const parse = (xml: string) =>
  new DOMParser().parseFromString(xml, 'application/xml');

describe('sitemaps', () => {
  const resolved = resolve(FIXTURE_PAGES);

  it('indexes one sitemap per language with URLs', () => {
    expect(sitemapLanguages(resolved)).toEqual(['en', 'ar']);
    const index = parse(buildSitemapIndex(['en', 'ar'], FIXTURE_CTX));
    expect(index.documentElement.nodeName).toBe('sitemapindex');
    expect(
      Array.from(index.getElementsByTagName('loc')).map((n) => n.textContent)
    ).toEqual([
      'https://atlass.dpdns.org/sitemaps/marketing-en.xml',
      'https://atlass.dpdns.org/sitemaps/marketing-ar.xml',
    ]);
  });

  it('lists only listed, indexable pages of the language, with lastmod and the hreflang trio', () => {
    const xml = buildLocaleSitemap('en', resolved, FIXTURE_CTX);
    expect(xml).not.toMatch(/changefreq|priority|404/);
    expect(xml).not.toMatch(/<loc>\s/);
    const doc = parse(xml);
    expect(
      Array.from(doc.getElementsByTagName('loc')).map((n) => n.textContent)
    ).toEqual([
      'https://atlass.dpdns.org/',
      'https://atlass.dpdns.org/pricing',
    ]);
    expect(doc.getElementsByTagName('lastmod')[0].textContent).toBe(
      '2026-10-20'
    );
    const links = Array.from(doc.getElementsByTagName('xhtml:link')).slice(
      0,
      3
    );
    expect(
      links.map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')])
    ).toEqual([
      ['en', 'https://atlass.dpdns.org/'],
      ['ar', 'https://atlass.dpdns.org/ar'],
      ['x-default', 'https://atlass.dpdns.org/'],
    ]);
    const ar = parse(buildLocaleSitemap('ar', resolved, FIXTURE_CTX));
    expect(
      Array.from(ar.getElementsByTagName('loc')).map((n) => n.textContent)
    ).toEqual([
      'https://atlass.dpdns.org/ar',
      'https://atlass.dpdns.org/ar/pricing',
    ]);
  });

  it('pairs hreflang only when both versions are published', () => {
    const onlyEnglishPricing = resolve(
      FIXTURE_PAGES.filter((page) => page.path !== '/ar/pricing')
    );
    const doc = parse(
      buildLocaleSitemap('en', onlyEnglishPricing, FIXTURE_CTX)
    );
    const urls = Array.from(doc.getElementsByTagName('url'));
    const pricing = urls.find((url) => url.textContent?.includes('/pricing'));
    expect(pricing?.getElementsByTagName('xhtml:link')).toHaveLength(0);
    const home = urls.find((url) => !url.textContent?.includes('/pricing'));
    expect(home?.getElementsByTagName('xhtml:link')).toHaveLength(3);
  });

  it('works with an empty registry', () => {
    expect(sitemapLanguages([])).toEqual([]);
    expect(
      parse(buildSitemapIndex([], FIXTURE_CTX)).documentElement.nodeName
    ).toBe('sitemapindex');
  });
});

describe('robots.txt', () => {
  const robots = buildRobotsTxt(FIXTURE_CTX);

  it('points at the sitemap index on the site origin', () => {
    expect(robots).toContain('Sitemap: https://atlass.dpdns.org/sitemap.xml\n');
    expect(robots.match(/^Sitemap:/gm)).toHaveLength(1);
  });

  it('never disallows app paths or /verify (their noindex header must stay readable)', () => {
    const disallowed = robots
      .split('\n')
      .filter((line) => line.startsWith('Disallow:'))
      .map((line) => line.slice('Disallow:'.length).trim());
    expect(new Set(disallowed)).toEqual(new Set(['/']));
    expect(robots).not.toMatch(/Disallow:\s*\/(verify|dashboard|auth)/);
  });
});
