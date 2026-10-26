/**
 * B3 — the new static pages and chrome links: /resources and
 * /solutions/multi-academy in both languages (in the sitemap and llms.txt),
 * academy limits from the catalog (never typed), the demo academy link, no
 * link to the link-only founding page, Blog and Resources in the header and
 * footer, and the empty banner slot every page carries.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Plan } from '@/types/plan.types';
import snapshot from '../data/plans.snapshot.json';
import { MARKETING_PAGES } from '../registry';
import { buildMarketingSite } from '../prerender/site';
import { marketingLlmsCopy } from '../prerender/entry';
import type { MarketingRenderContext } from '../types';

const plans = snapshot as unknown as Plan[];
const ctx: MarketingRenderContext = {
  plans,
  siteUrl: 'https://atlass.dpdns.org',
  buildDate: '2026-10-26',
};
const html = (id: string, lang: 'en' | 'ar') => {
  const page = MARKETING_PAGES.find((p) => p.id === id && p.lang === lang);
  if (!page) throw new Error(`${id}/${lang} missing`);
  return {
    html: renderToStaticMarkup(page.render(ctx)),
    head: page.head(ctx),
    page,
  };
};

describe('B3 marketing pages', () => {
  it('registers /resources and /solutions/multi-academy in both languages', () => {
    for (const [id, path] of [
      ['resources', '/resources'],
      ['multi-academy', '/solutions/multi-academy'],
    ] as const) {
      expect(html(id, 'en').page.path).toBe(path);
      expect(html(id, 'ar').page.path).toBe(`/ar${path}`);
      expect(html(id, 'en').head.alternates).toEqual({
        en: path,
        ar: `/ar${path}`,
      });
    }
  });

  it('lists them in the sitemaps and llms.txt', () => {
    const site = buildMarketingSite({
      pages: MARKETING_PAGES,
      ctx,
      assets: {
        stylesheets: [],
        moduleScripts: [],
        modulePreloads: [],
        themeScript: '/assets/t.js',
        fontPreloads: { en: [], ar: [] },
      },
      llms: marketingLlmsCopy(plans),
    });
    const files = Object.fromEntries(
      site.files.map((file) => [file.path, file.contents])
    );
    for (const path of [
      '/resources',
      '/solutions/multi-academy',
      '/ar/resources',
      '/ar/solutions/multi-academy',
    ]) {
      expect(
        files['sitemaps/marketing-en.xml'] + files['sitemaps/marketing-ar.xml']
      ).toContain(`https://atlass.dpdns.org${path}</loc>`);
      expect(files['llms.txt']).toContain(`https://atlass.dpdns.org${path})`);
    }
    expect(files['sitemap.xml']).toContain(
      'https://atlass.dpdns.org/sitemaps/blog.xml'
    );
  });

  it('shows the academies per plan from the catalog, in each language', () => {
    const en = html('multi-academy', 'en').html;
    for (const plan of plans) {
      expect(en).toContain(`data-plan="${plan.key}"`);
    }
    expect(en).toMatch(/5 academies/);
    expect(en).toMatch(/1 academy/);
    const ar = html('multi-academy', 'ar').html;
    expect(ar).toContain('٥');
    expect(
      html('multi-academy', 'en').head.jsonLd?.some(
        (block) => (block as { '@type'?: string })['@type'] === 'FAQPage'
      )
    ).toBe(true);
  });

  it('links the demo academy and the help center from /resources, never /founding', () => {
    for (const lang of ['en', 'ar'] as const) {
      const page = html('resources', lang).html;
      expect(page).toContain('href="https://al-nour.atlass.dpdns.org"');
      expect(page).toMatch(
        /href="https:\/\/docs\.atlass\.dpdns\.org(\/ar)?\/getting-started"/
      );
      expect(page).toContain('data-blog-latest');
      expect(page).not.toMatch(/href="(\/ar)?\/founding/);
    }
  });

  it('adds Blog and Resources to the header and footer, and the banner slot, on every page', () => {
    for (const page of MARKETING_PAGES) {
      const out = renderToStaticMarkup(page.render(ctx));
      const prefix = page.lang === 'ar' ? '/ar' : '';
      expect(out, page.file).toContain(`href="${prefix}/blog"`);
      expect(out, page.file).toContain(`href="${prefix}/resources"`);
      expect(out, page.file).toMatch(
        /<div data-mk-announcements="true" data-label-region="[^"]+" data-label-dismiss="[^"]+" data-label-close="[^"]+"><\/div>/
      );
    }
  });
});
