/**
 * Website feature — public entry point (Prompt 11).
 *
 * The `website` feature had no root barrel before this prompt (every
 * consumer was internal, or the dashboard's own lazy route imports,
 * which bypass `no-restricted-imports` as dynamic `import()` calls).
 * Prompt 11's public runtime (`@features/public-website`) is the first
 * genuinely external, cross-feature consumer, so this barrel now exists
 * — the same `@features/<name>` pattern every other feature already
 * uses for cross-feature imports.
 *
 * Deliberately curated (not a blanket `export *` of every internal
 * file): only the renderer and the pure utilities a consumer outside
 * this feature's own dashboard pages genuinely needs. The Page Composer/
 * CMS/editor surface remains internal.
 */
export { WebsiteRenderer } from './renderer/WebsiteRenderer';
export type { WebsiteRendererProps } from './renderer/WebsiteRenderer';
export type {
  WebsiteLinkRenderer,
  WebsiteLinkRendererProps,
} from './renderer/website-link-renderer.types';

export { resolvePagePath, resolveWebsiteCtaHref, isExternalHref } from './utils/link-resolution.utils';
export { resolvePageSeo, resolveCourseSeo, resolveBlogPostSeo } from './utils/seo-resolution.utils';
export type { SeoFallback } from './utils/seo-resolution.utils';
export {
  buildOrganizationJsonLd,
  buildCourseJsonLd,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
} from './utils/structured-data.utils';
export { buildSitemapEntries } from './utils/sitemap.utils';
export type { BuildSitemapEntriesInput } from './utils/sitemap.utils';
