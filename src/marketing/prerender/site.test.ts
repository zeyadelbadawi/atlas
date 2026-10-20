/**
 * The whole site from a registry: every page file, the root files, and the
 * registry checks the edge relies on. Runs with fixture pages, with an
 * empty registry, and with the real registry (catalog from the snapshot).
 */
import { describe, expect, it } from 'vitest';
import snapshot from '../data/plans.snapshot.json';
import type { Plan } from '@/types/plan.types';
import { MARKETING_PAGES } from '../registry';
import { marketingLlmsCopy } from './entry';
import { buildMarketingSite, validatePages } from './site';
import { FIXTURE_ASSETS, FIXTURE_CTX, FIXTURE_PAGES } from './test-fixtures';

const paths = (files: readonly { path: string }[]) =>
  files.map((file) => file.path).sort();

describe('buildMarketingSite', () => {
  it('writes every page and the root files', () => {
    const site = buildMarketingSite({
      pages: FIXTURE_PAGES,
      ctx: FIXTURE_CTX,
      assets: FIXTURE_ASSETS,
    });
    expect(paths(site.files)).toEqual(
      [
        '404.html',
        'ar/404.html',
        'ar/index.html',
        'ar/pricing/index.html',
        'index.html',
        'llms-full.txt',
        'llms.txt',
        'pricing.md',
        'pricing/index.html',
        'robots.txt',
        'sitemap.xml',
        'sitemaps/marketing-ar.xml',
        'sitemaps/marketing-en.xml',
      ].sort()
    );
    const pricing = site.files.find(
      (file) => file.path === 'pricing/index.html'
    )!.contents;
    expect(pricing).toContain(
      '<link rel="alternate" type="text/markdown" href="/pricing.md">'
    );
    expect(site.warnings).toEqual([]);
  });

  it('does not fail on an empty registry (warns, still writes the root files)', () => {
    const site = buildMarketingSite({
      pages: [],
      ctx: FIXTURE_CTX,
      assets: FIXTURE_ASSETS,
    });
    expect(site.warnings.join('\n')).toMatch(/MARKETING_PAGES is empty/);
    expect(paths(site.files)).toEqual(
      [
        'llms-full.txt',
        'llms.txt',
        'pricing.md',
        'robots.txt',
        'sitemap.xml',
      ].sort()
    );
  });

  it('warns about unfilled copy tokens', () => {
    const [home] = FIXTURE_PAGES;
    const site = buildMarketingSite({
      pages: [
        {
          ...home,
          head: (ctx) => ({
            ...home.head(ctx),
            description: 'Try {brand} now',
          }),
        },
      ],
      ctx: FIXTURE_CTX,
      assets: FIXTURE_ASSETS,
    });
    expect(site.warnings.join('\n')).toMatch(
      /index\.html: unfilled copy token\(s\) \{brand\}/
    );
  });

  it('rejects a registry the edge could not serve', () => {
    const [home, , pricing] = FIXTURE_PAGES;
    expect(validatePages([{ ...pricing, file: 'pricing.html' }])).toEqual([
      'pricing/en: file pricing.html must be pricing/index.html for path /pricing',
    ]);
    expect(validatePages([{ ...pricing, path: '/pricing/' }]).join()).toMatch(
      /trailing slash/
    );
    expect(validatePages([{ ...pricing, lang: 'ar' }]).join()).toMatch(
      /does not match lang/
    );
    expect(validatePages([home, home]).join()).toMatch(/duplicate/);
    expect(() =>
      buildMarketingSite({
        pages: [{ ...pricing, file: 'x.html' }],
        ctx: FIXTURE_CTX,
        assets: FIXTURE_ASSETS,
      })
    ).toThrow(/registry is invalid/);
  });
});

describe('the real registry', () => {
  const plans = snapshot as unknown as Plan[];

  it('is valid for the edge', () => {
    expect(validatePages(MARKETING_PAGES)).toEqual([]);
  });

  it('builds, with one H1 per page and the 404 pages noindex', () => {
    if (MARKETING_PAGES.length === 0) return;
    const site = buildMarketingSite({
      pages: MARKETING_PAGES,
      ctx: { ...FIXTURE_CTX, plans },
      assets: FIXTURE_ASSETS,
      llms: marketingLlmsCopy(plans),
    });
    for (const file of site.files.filter((f) => f.path.endsWith('.html'))) {
      const doc = new DOMParser().parseFromString(file.contents, 'text/html');
      expect(doc.querySelectorAll('h1').length, file.path).toBe(1);
      const noindex =
        doc.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
      expect(/noindex/.test(noindex), file.path).toBe(
        file.path.endsWith('404.html')
      );
    }
  });
});
