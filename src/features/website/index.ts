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

// Phase 1 (Extended Scope, Decision 11, dependency C) — Sign In/Sign Up
// are real public-runtime surfaces that are NOT `WebsitePage` rows (never
// CMS content, never editable through the Page Composer), so they cannot
// render through `WebsiteRenderer` itself (which always requires one).
// `WebsiteChrome` is the exact same Theme/Header/Footer shell
// `WebsiteRenderer` builds, extracted so this one other real consumer can
// reuse it instead of duplicating the wiring — see that component's own
// doc comment.
export { WebsiteChrome } from './renderer/WebsiteChrome';
export type { WebsiteChromeProps } from './renderer/WebsiteChrome';

// Phase P19 — `ProvisioningStartPage`'s theme-selection step needs the
// real theme registry (never a second, invented catalog). Curated export,
// same discipline as this barrel's own header comment: only what a
// consumer outside this feature's dashboard pages genuinely needs.
export { listWebsiteThemes } from './themes/website-theme.registry';
export type { WebsiteThemeDefinition } from '@types';
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
