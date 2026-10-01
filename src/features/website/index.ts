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
export type { WebsiteHeaderAuthState } from './renderer/WebsiteHeader';

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
// Theme 1 plan Phase 6 — theme-owned "page not found" and Coming Soon (a
// theme without its own renders `null`, and the caller keeps the shared
// screen).
export {
  WebsiteComingSoon,
  WebsiteNotFound,
  hasThemeComingSoon,
  hasThemeNotFound,
} from './renderer/WebsiteSystemPages';

// The Academy-website-embedded Student Learning experience (`@features/
// learning`'s `WebsiteLearningRoute`) needs the resolved theme's brand
// color to alias onto Atlas's own generic `--primary`/`--ring` tokens —
// see that file's own doc comment for why this is a CSS-variable bridge,
// not a per-component retheme.
export { useWebsiteDesignSystem } from './renderer/WebsiteDesignSystemContext';
export { WebsiteBrandBridge } from './renderer/WebsiteBrandBridge';
export { WebsiteAuthFrame } from './renderer/WebsiteAuthFrame';

// Phase P19 — `ProvisioningStartPage`'s theme-selection step needs the
// real theme registry (never a second, invented catalog). Curated export,
// same discipline as this barrel's own header comment: only what a
// consumer outside this feature's dashboard pages genuinely needs.
export { listWebsiteThemes } from './themes/website-theme.registry';

// New Customer Onboarding — the Website step publishes through the SAME
// mutation `WebsitePublishBar` uses, and reads the same configuration, so
// "published" means exactly what it means in the Website Builder.
export { usePublishWebsite } from './hooks/usePublishWebsite';
export type { WebsiteThemeDefinition } from '@types';
export type {
  WebsiteLinkRenderer,
  WebsiteLinkRendererProps,
} from './renderer/website-link-renderer.types';

export {
  resolvePagePath,
  resolveWebsiteCtaHref,
  isExternalHref,
} from './utils/link-resolution.utils';
export {
  resolvePageSeo,
  resolveCourseSeo,
  resolveBlogPostSeo,
} from './utils/seo-resolution.utils';
export type { SeoFallback } from './utils/seo-resolution.utils';
export {
  buildOrganizationJsonLd,
  buildCourseJsonLd,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
} from './utils/structured-data.utils';
export { buildSitemapEntries } from './utils/sitemap.utils';
export type { BuildSitemapEntriesInput } from './utils/sitemap.utils';

// Phase 6 (Bilingual Academy Websites) — `@features/public-website`'s
// router/pages need these to derive locale from the URL, resolve
// `LocalizedText` fields, and apply `dir`/`lang` — the same curated-export
// discipline as everything else in this barrel.
export {
  resolveLocalizedText,
  isLocalizedTextComplete,
} from './utils/localized-text.utils';
export { usePublicWebsiteDocumentDirection } from './renderer/usePublicWebsiteDocumentDirection';
export { usePublicWebsiteLocale } from './renderer/PublicWebsiteLocaleContext';
export {
  PUBLIC_WEBSITE_LOCALES,
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  PUBLIC_WEBSITE_LOCALE_PATH_PREFIX,
  isPublicWebsiteLocale,
} from './constants/locale.constants';
export type { PublicWebsiteLocale } from './constants/locale.constants';

// Theme 1 plan Phase 4 — Brand Studio: the setup form's "Logo & colours"
// block and the deferred save that follows provisioning.
export { SetupBrandStudio } from './brand-studio/SetupBrandStudio';
export { FinishBrandingCard } from './brand-studio/FinishBrandingCard';
export { pendingBrandingStore } from './brand-studio/pending-branding';
export type { PendingBranding } from './brand-studio/pending-branding';
