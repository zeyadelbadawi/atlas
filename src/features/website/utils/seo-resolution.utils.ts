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
 */
import type { Course } from '@types';
import type { BlogPost } from '@types';
import type {
  ResolvedSeoMetadata,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';

export interface SeoFallback {
  readonly title: string;
  readonly description: string;
}

export function resolvePageSeo(
  page: WebsitePage,
  configuration: WebsiteConfiguration,
  fallback: SeoFallback
): ResolvedSeoMetadata {
  const title = page.seo.metaTitle || configuration.seo.metaTitle || fallback.title;
  const titleSource = page.seo.metaTitle
    ? 'override'
    : configuration.seo.metaTitle
      ? 'global'
      : 'fallback';

  const description =
    page.seo.metaDescription || configuration.seo.metaDescription || fallback.description;
  const descriptionSource = page.seo.metaDescription
    ? 'override'
    : configuration.seo.metaDescription
      ? 'global'
      : 'fallback';

  return {
    title,
    description,
    ogTitle: page.seo.ogTitle || title,
    ogDescription: page.seo.ogDescription || description,
    ogImage: page.seo.ogImage || configuration.seo.ogImage,
    canonicalPath: page.seo.canonicalPath || `/${page.slug}`,
    // A hidden page can never be indexable, regardless of any override.
    indexable: page.visible && (page.seo.indexable ?? configuration.seo.robotsIndexable ?? true),
    titleSource,
    descriptionSource,
  };
}

/** Dynamic SEO for a Course — reads the EXISTING Course domain only, never a duplicated projection stored in the CMS. */
export function resolveCourseSeo(
  course: Course,
  configuration: WebsiteConfiguration,
  fallback: SeoFallback
): ResolvedSeoMetadata {
  const title = course.title || fallback.title;
  const description =
    course.shortDescription || course.description || configuration.seo.metaDescription || fallback.description;

  const publiclyReachable = course.status === 'published' && course.visibility === 'public';

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: course.thumbnail || configuration.seo.ogImage,
    canonicalPath: `/courses/${course.slug}`,
    indexable: publiclyReachable && (configuration.seo.robotsIndexable ?? true),
    titleSource: course.title ? 'override' : 'fallback',
    descriptionSource: course.shortDescription || course.description ? 'override' : 'fallback',
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
 * specified.
 */
export function resolveBlogPostSeo(
  post: BlogPost,
  configuration: WebsiteConfiguration,
  fallback: SeoFallback
): ResolvedSeoMetadata {
  const title = post.title || fallback.title;
  const description = post.excerpt || configuration.seo.metaDescription || fallback.description;

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: post.featuredImage || configuration.seo.ogImage,
    canonicalPath: `/blog/${post.slug}`,
    indexable: post.status === 'published' && (configuration.seo.robotsIndexable ?? true),
    titleSource: post.title ? 'override' : 'fallback',
    descriptionSource: post.excerpt ? 'override' : 'fallback',
  };
}
