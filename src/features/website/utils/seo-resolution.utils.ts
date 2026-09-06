/**
 * SEO resolution hierarchy (Prompt 10).
 *
 * Deterministic, pure, and read-only: Page/Entity Override → Website
 * Global Default → Atlas System Fallback (see `Reports/ARCHITECTURE.md`,
 * Prompt 10, "SEO Resolution Rules"). None of these functions call a
 * service or read a theme token — SEO is resolved entirely from data the
 * caller already has, and never depends on which theme is active (see
 * "SEO / Theme Independence").
 *
 * `fallback` is supplied by the caller (a localized string pair, e.g.
 * "{Academy name}" / a generic description) rather than resolved here,
 * so this file stays a pure data function with no i18n/service coupling.
 *
 * Phase 6 (Bilingual Academy Websites) — `WebsitePageSeo`/`WebsiteSeoConfig`
 * title/description fields are `LocalizedText`; every resolver here takes
 * an explicit `locale` and resolves each field to that locale (falling
 * back to English when Arabic is blank) before applying the same
 * Override → Global → Fallback precedence as before. `resolvePageSeo`
 * additionally returns `hreflangAlternates` for the public runtime to
 * emit `<link rel="alternate" hreflang="...">` tags — mirrors the
 * backend's `seo-resolution.util.ts` exactly (see that file's own doc
 * comment for why a backend reproduction also exists).
 */
import type { Course } from '@types';
import type { BlogPost } from '@types';
import type {
  HreflangAlternate,
  ResolvedSeoMetadata,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';
import { PUBLIC_WEBSITE_LOCALES, type PublicWebsiteLocale } from '../constants/locale.constants';
import { resolveLocalizedText } from './localized-text.utils';

export interface SeoFallback {
  readonly title: string;
  readonly description: string;
}

function withLocalePrefix(path: string, locale: PublicWebsiteLocale): string {
  return locale === 'en' ? path : `/${locale}${path}`;
}

function buildHreflangAlternates(canonicalPath: string): readonly HreflangAlternate[] {
  return PUBLIC_WEBSITE_LOCALES.map((locale) => ({
    locale,
    path: withLocalePrefix(canonicalPath, locale),
  }));
}

export function resolvePageSeo(
  page: WebsitePage,
  configuration: WebsiteConfiguration,
  fallback: SeoFallback,
  locale: PublicWebsiteLocale
): ResolvedSeoMetadata {
  const pageMetaTitle = resolveLocalizedText(page.seo.metaTitle, locale);
  const globalMetaTitle = resolveLocalizedText(configuration.seo.metaTitle, locale);
  const title = pageMetaTitle || globalMetaTitle || fallback.title;
  const titleSource = pageMetaTitle ? 'override' : globalMetaTitle ? 'global' : 'fallback';

  const pageMetaDescription = resolveLocalizedText(page.seo.metaDescription, locale);
  const globalMetaDescription = resolveLocalizedText(configuration.seo.metaDescription, locale);
  const description = pageMetaDescription || globalMetaDescription || fallback.description;
  const descriptionSource = pageMetaDescription
    ? 'override'
    : globalMetaDescription
      ? 'global'
      : 'fallback';

  const canonicalPath = page.seo.canonicalPath || `/${page.slug}`;

  return {
    title,
    description,
    ogTitle: resolveLocalizedText(page.seo.ogTitle, locale) || title,
    ogDescription: resolveLocalizedText(page.seo.ogDescription, locale) || description,
    ogImage: page.seo.ogImage || configuration.seo.ogImage,
    canonicalPath,
    // A hidden page can never be indexable, regardless of any override.
    indexable: page.visible && (page.seo.indexable ?? configuration.seo.robotsIndexable ?? true),
    titleSource,
    descriptionSource,
    locale,
    hreflangAlternates: buildHreflangAlternates(canonicalPath),
  };
}

/**
 * Dynamic SEO for a Course — reads the EXISTING Course domain only, never
 * a duplicated projection stored in the CMS. `Course.title`/`description`
 * are not `LocalizedText` (out of this phase's scope — see the completion
 * report's "remaining limitations"), so `locale` only affects the
 * website's own global SEO defaults/hreflang, not the course copy itself.
 */
export function resolveCourseSeo(
  course: Course,
  configuration: WebsiteConfiguration,
  fallback: SeoFallback,
  locale: PublicWebsiteLocale
): ResolvedSeoMetadata {
  const title = course.title || fallback.title;
  const description =
    course.shortDescription ||
    course.description ||
    resolveLocalizedText(configuration.seo.metaDescription, locale) ||
    fallback.description;

  const publiclyReachable = course.status === 'published' && course.visibility === 'public';
  const canonicalPath = `/courses/${course.slug}`;

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: course.thumbnail || configuration.seo.ogImage,
    canonicalPath,
    indexable: publiclyReachable && (configuration.seo.robotsIndexable ?? true),
    titleSource: course.title ? 'override' : 'fallback',
    descriptionSource: course.shortDescription || course.description ? 'override' : 'fallback',
    locale,
    hreflangAlternates: buildHreflangAlternates(canonicalPath),
  };
}

/**
 * Dynamic SEO for a Blog post — reads the EXISTING `@features/blog`
 * domain only.
 *
 * UNRESOLVED (Prompt 13 audit): unlike `resolveCourseSeo`, this function
 * has no live UI consumer. The public website runtime's `WebsitePage`
 * core types (`home`/`about`/`courses`/`courseDetails`/`faqs`/`contact`)
 * include no `blogPostDetails` equivalent, and `resolvePathToPage`
 * (`@features/public-website`) has no blog-post URL pattern — there is
 * no public blog-post page/route/template to wire this into without
 * inventing one, which is out of this prompt's scope ("Do not rebuild
 * the Website/CMS feature"). This function stays a real, correct,
 * tested contract, ready for the day a public blog-post page is
 * specified. Given `locale`/`hreflangAlternates` for the same reason as
 * `resolveCourseSeo`, in case that day comes without another revisit.
 */
export function resolveBlogPostSeo(
  post: BlogPost,
  configuration: WebsiteConfiguration,
  fallback: SeoFallback,
  locale: PublicWebsiteLocale
): ResolvedSeoMetadata {
  const title = post.title || fallback.title;
  const description =
    post.excerpt || resolveLocalizedText(configuration.seo.metaDescription, locale) || fallback.description;
  const canonicalPath = `/blog/${post.slug}`;

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: post.featuredImage || configuration.seo.ogImage,
    canonicalPath,
    indexable: post.status === 'published' && (configuration.seo.robotsIndexable ?? true),
    titleSource: post.title ? 'override' : 'fallback',
    descriptionSource: post.excerpt ? 'override' : 'fallback',
    locale,
    hreflangAlternates: buildHreflangAlternates(canonicalPath),
  };
}
