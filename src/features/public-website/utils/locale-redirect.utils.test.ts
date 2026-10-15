/**
 * B0-WEB-02 — URL rules for both default languages: which locale a path is
 * in, how a path is prefixed and stripped, and which old links redirect.
 */
import { describe, expect, it } from 'vitest';
import {
  publicWebsiteLocaleForPath,
  publicWebsiteLocalePrefix,
  resolveDefaultLocale,
  stripPublicWebsiteLocalePrefix,
} from '@features/website';
import { unprefixedPath } from '@/ssr/ssr-paths';
import type { WebsitePage } from '@types';
import { resolveLocalePrefixRedirect } from './locale-redirect.utils';

const page = (over: Partial<WebsitePage>): WebsitePage =>
  ({
    id: over.slug ?? 'p',
    pageType: 'core',
    slug: 'x',
    visible: true,
    sections: [],
    seo: {},
    ...over,
  }) as WebsitePage;

const PAGES = [
  page({ coreType: 'home', slug: 'home' }),
  page({ coreType: 'about', slug: 'about' }),
  page({ coreType: 'courseDetails', slug: 'course-details' }),
];

describe('locale of a path', () => {
  it('English-default (unchanged): /ar… is Arabic, everything else English', () => {
    for (const [path, locale] of [
      ['/', 'en'],
      ['/about', 'en'],
      ['/en', 'en'],
      ['/en/about', 'en'],
      ['/ar', 'ar'],
      ['/ar/about', 'ar'],
      ['/arabic-course', 'en'],
    ] as const) {
      expect(publicWebsiteLocaleForPath(path)).toBe(locale);
      expect(publicWebsiteLocaleForPath(path, 'en')).toBe(locale);
    }
  });

  it('Arabic-default: /en… is English, everything else Arabic', () => {
    for (const [path, locale] of [
      ['/', 'ar'],
      ['/about', 'ar'],
      ['/ar', 'ar'],
      ['/ar/about', 'ar'],
      ['/en', 'en'],
      ['/en/about', 'en'],
      ['/english-course', 'ar'],
    ] as const) {
      expect(publicWebsiteLocaleForPath(path, 'ar')).toBe(locale);
    }
  });

  it('reads an absent or unknown default as English', () => {
    expect(resolveDefaultLocale(undefined)).toBe('en');
    expect(resolveDefaultLocale('fr')).toBe('en');
    expect(resolveDefaultLocale('ar')).toBe('ar');
  });
});

describe('prefixing and stripping', () => {
  it('prefixes only the non-default locale', () => {
    expect(publicWebsiteLocalePrefix('en')).toBe('');
    expect(publicWebsiteLocalePrefix('ar')).toBe('/ar');
    expect(publicWebsiteLocalePrefix('ar', 'ar')).toBe('');
    expect(publicWebsiteLocalePrefix('en', 'ar')).toBe('/en');
  });

  it('strips the current locale’s prefix exactly as before on English-default sites', () => {
    expect(stripPublicWebsiteLocalePrefix('/ar/about', 'ar')).toBe('/about');
    expect(stripPublicWebsiteLocalePrefix('/ar', 'ar')).toBe('/');
    expect(stripPublicWebsiteLocalePrefix('/about', 'en')).toBe('/about');
    expect(stripPublicWebsiteLocalePrefix('/en/about', 'en', 'ar')).toBe(
      '/about'
    );
    expect(stripPublicWebsiteLocalePrefix('/about', 'ar', 'ar')).toBe('/about');
  });

  it('the server renderer recognises account paths under either prefix', () => {
    expect(unprefixedPath('/ar/sign-in')).toBe('/sign-in');
    expect(unprefixedPath('/en/my/courses')).toBe('/my/courses');
    expect(unprefixedPath('/en')).toBe('/');
    expect(unprefixedPath('/about')).toBe('/about');
  });
});

describe('resolveLocalePrefixRedirect', () => {
  it('Arabic-default: old /ar links move to the unprefixed path, query kept', () => {
    expect(resolveLocalePrefixRedirect('/ar', '', 'ar', PAGES)).toBe('/');
    expect(resolveLocalePrefixRedirect('/ar/', '', 'ar', PAGES)).toBe('/');
    expect(resolveLocalePrefixRedirect('/ar/about', '?x=1', 'ar', PAGES)).toBe(
      '/about?x=1'
    );
    expect(resolveLocalePrefixRedirect('/ar/courses/c1', '', 'ar', PAGES)).toBe(
      '/courses/c1'
    );
    expect(resolveLocalePrefixRedirect('/ar/my/courses', '', 'ar', PAGES)).toBe(
      '/my/courses'
    );
  });

  it('English-default (switched back): /en links move to the unprefixed path', () => {
    expect(resolveLocalePrefixRedirect('/en', '', 'en', PAGES)).toBe('/');
    expect(resolveLocalePrefixRedirect('/en/about', '', 'en', PAGES)).toBe(
      '/about'
    );
  });

  it('never redirects an unprefixed path or the other language (no loops)', () => {
    for (const defaultLocale of ['en', 'ar'] as const) {
      for (const path of [
        '/',
        '/about',
        '/courses/c1',
        '/arabic',
        '/english',
      ]) {
        expect(
          resolveLocalePrefixRedirect(path, '', defaultLocale, PAGES)
        ).toBeNull();
        // The target of any redirect is itself never redirected again.
        const target = resolveLocalePrefixRedirect(
          `/${defaultLocale}${path === '/' ? '' : path}`,
          '',
          defaultLocale,
          PAGES
        );
        if (target) {
          expect(
            resolveLocalePrefixRedirect(target, '', defaultLocale, PAGES)
          ).toBeNull();
        }
      }
    }
    expect(
      resolveLocalePrefixRedirect('/ar/about', '', 'en', PAGES)
    ).toBeNull();
    expect(
      resolveLocalePrefixRedirect('/en/about', '', 'ar', PAGES)
    ).toBeNull();
  });

  it('keeps an existing custom page whose slug is the prefix', () => {
    const withEnPage = [...PAGES, page({ pageType: 'custom', slug: 'en' })];
    expect(resolveLocalePrefixRedirect('/en', '', 'en', withEnPage)).toBeNull();
    expect(resolveLocalePrefixRedirect('/en/about', '', 'en', withEnPage)).toBe(
      '/about'
    );
  });
});
