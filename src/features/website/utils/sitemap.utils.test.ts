/**
 * The website overview's sitemap preview lists what the academy's served
 * `/sitemap.xml` lists (backend `public-website/utils/seo-files.util.ts`):
 * the same paths, the same "nothing unless published, indexable and the
 * sitemap is on" rule — and its help text says the file is served, not
 * that "a future public website" might list it one day.
 */
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@/localization/i18n';
import type { WebsiteConfiguration, WebsitePage } from '@types';
import { buildSitemapEntries } from './sitemap.utils';

function page(overrides: Partial<WebsitePage>): WebsitePage {
  return {
    id: overrides.slug ?? 'p',
    academyId: 'a1',
    pageType: overrides.coreType ? 'core' : 'custom',
    title: 'Page',
    slug: 'page',
    visible: true,
    seo: {},
    sections: [],
    version: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
    ...overrides,
  } as WebsitePage;
}

function configuration(
  seo: Partial<WebsiteConfiguration['seo']> = {},
  status: WebsiteConfiguration['status'] = 'published'
): WebsiteConfiguration {
  return { status, seo } as unknown as WebsiteConfiguration;
}

const pages = [
  page({ coreType: 'home', slug: 'home' }),
  page({ coreType: 'about', slug: 'about-us' }),
  page({ coreType: 'courseDetails', slug: 'course-details' }),
  page({ slug: 'summer-camp' }),
  page({ slug: 'hidden', visible: false }),
  page({ slug: 'noindex', seo: { indexable: false } }),
];

describe('buildSitemapEntries', () => {
  it('lists visible, indexable pages at their public path, like the served sitemap', () => {
    expect(
      buildSitemapEntries({ configuration: configuration(), pages }).map(
        (entry) => [entry.path, entry.priority]
      )
    ).toEqual([
      ['/', 1],
      ['/about', 0.6],
      ['/summer-camp', 0.6],
    ]);
  });

  it('lists nothing while unpublished, when search engines are blocked, or with the sitemap off', () => {
    expect(
      buildSitemapEntries({
        configuration: configuration({}, 'draft'),
        pages,
      })
    ).toEqual([]);
    expect(
      buildSitemapEntries({
        configuration: configuration({ robotsIndexable: false }),
        pages,
      })
    ).toEqual([]);
    expect(
      buildSitemapEntries({
        configuration: configuration({ sitemapEnabled: false }),
        pages,
      })
    ).toEqual([]);
  });
});

describe('sitemap and structured data help text', () => {
  it('describes what is served now, in English and Arabic', () => {
    const en = createI18nInstance('en');
    const ar = createI18nInstance('ar');
    for (const key of [
      'website:overview.sitemapPreview.help',
      'website:seo.structuredDataPreviewHelp',
    ]) {
      expect(en.t(key)).not.toMatch(
        /future|nothing here is (served|published)/i
      );
      expect(ar.t(key)).not.toMatch(/مستقبلي|لم يتم نشر أي شيء هنا بعد/);
    }
    expect(en.t('website:overview.sitemapPreview.help')).toContain(
      '/sitemap.xml'
    );
    expect(ar.t('website:overview.sitemapPreview.help')).toContain(
      '/sitemap.xml'
    );
  });
});
