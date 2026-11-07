/**
 * B0-WEB-02 — hreflang reciprocity. Every language version of a page must
 * list the same alternates (itself included), so search engines accept the
 * pair; and the unprefixed URL is the site's default language.
 */
import { describe, expect, it } from 'vitest';
import type { WebsiteConfiguration, WebsitePage } from '@types';
import {
  buildHreflangAlternates,
  buildXDefaultPath,
  localizedPublicPath,
  resolvePageSeo,
} from './seo-resolution.utils';

const about = {
  id: 'p-about',
  pageType: 'core',
  coreType: 'about',
  slug: 'about',
  visible: true,
  sections: [],
  seo: {},
} as unknown as WebsitePage;
const configuration = { seo: {} } as unknown as WebsiteConfiguration;
const fallback = { title: 'Academy', description: 'Academy' };

describe('hreflang alternates', () => {
  it('English-default: exactly the alternates every site had (/about, /ar/about)', () => {
    expect(buildHreflangAlternates('/about')).toEqual([
      { locale: 'en', path: '/about' },
      { locale: 'ar', path: '/ar/about' },
    ]);
    expect(
      resolvePageSeo(about, configuration, fallback, 'ar').hreflangAlternates
    ).toEqual(buildHreflangAlternates('/about', 'en'));
  });

  it('Arabic-default: Arabic unprefixed, English under /en', () => {
    expect(buildHreflangAlternates('/about', 'ar')).toEqual([
      { locale: 'en', path: '/en/about' },
      { locale: 'ar', path: '/about' },
    ]);
  });

  it('is reciprocal: both language versions of a page list the same set', () => {
    for (const defaultLocale of ['en', 'ar'] as const) {
      const fromEnglish = resolvePageSeo(
        about,
        configuration,
        fallback,
        'en',
        defaultLocale
      ).hreflangAlternates;
      const fromArabic = resolvePageSeo(
        about,
        configuration,
        fallback,
        'ar',
        defaultLocale
      ).hreflangAlternates;
      expect(fromArabic).toEqual(fromEnglish);
      expect(fromEnglish.map((a) => a.locale)).toEqual(['en', 'ar']);
      expect(new Set(fromEnglish.map((a) => a.path)).size).toBe(2);
      // The default language's alternate is the unprefixed path.
      expect(fromEnglish.find((a) => a.locale === defaultLocale)?.path).toBe(
        '/about'
      );
    }
  });
});

describe('Home and x-default (SEO/AEO/GEO pass)', () => {
  const home = {
    ...about,
    id: 'p-home',
    coreType: 'home',
    slug: 'home',
  } as unknown as WebsitePage;

  it('Home is `/` and its other language the bare prefix — never `/home`, a duplicate of `/`', () => {
    const seo = resolvePageSeo(home, configuration, fallback, 'en');
    expect(seo.canonicalPath).toBe('/');
    expect(seo.hreflangAlternates).toEqual([
      { locale: 'en', path: '/' },
      { locale: 'ar', path: '/ar' },
    ]);
    expect(seo.xDefaultPath).toBe('/');
    expect(
      resolvePageSeo(home, configuration, fallback, 'en', 'ar')
        .hreflangAlternates
    ).toEqual([
      { locale: 'en', path: '/en' },
      { locale: 'ar', path: '/' },
    ]);
  });

  it('x-default is the default language’s URL of the page', () => {
    expect(buildXDefaultPath('/about')).toBe('/about');
    expect(buildXDefaultPath('/about', 'ar')).toBe('/about');
    expect(
      resolvePageSeo(about, configuration, fallback, 'ar').xDefaultPath
    ).toBe('/about');
  });

  it('a prefixed locale’s home has no trailing slash (the sitemap’s URL)', () => {
    expect(localizedPublicPath('/', 'ar')).toBe('/ar');
    expect(localizedPublicPath('/', 'en')).toBe('/');
    expect(localizedPublicPath('/courses', 'ar')).toBe('/ar/courses');
    expect(localizedPublicPath('/', 'en', 'ar')).toBe('/en');
  });
});
