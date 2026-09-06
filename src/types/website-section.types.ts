/**
 * Website Section domain types (Prompt 9).
 *
 * A section is DATA — a typed, validated configuration object — never
 * markup or code. The client picks a `SectionType`, fills in its typed
 * `config`, and the registered renderer component (see
 * `SectionRegistry`) is what turns that data into UI, branching only on
 * `ResolvedWebsiteDesignSystem` tokens, never on tenant-supplied strings
 * treated as code (see `Reports/ARCHITECTURE.md`, Prompt 9, "Security
 * Audit" — no `dangerouslySetInnerHTML`, no `eval`, no arbitrary
 * HTML/CSS/JS anywhere in this domain).
 *
 * Course/instructor references are ids into the EXISTING Course domain
 * (`@features/course`) — this file never redeclares `Course` or an
 * instructor shape of its own.
 *
 * Phase 6 (Bilingual Academy Websites) — every field a website VISITOR
 * reads as copy is `LocalizedText`, not `string` (see that type's own doc
 * comment in `website-content.types.ts`). References/enums/technical
 * values (`id`, `mode`, `layout`, `courseIds`, `url`, `email`, `phone`,
 * `image` src, `icon`) and the one proper name (`authorName`) are
 * unaffected — matches the backend's `section-config.schemas.ts` exactly,
 * field for field, including which fields were widened and which were
 * deliberately left alone.
 */
import type { LocalizedText } from './website-content.types';

/** The initial section catalog — enough distinct building blocks to make five themes feel genuinely different. Adding a 12th section is adding one new config type + one new registry entry, never touching an existing section. */
export const SECTION_TYPES = [
  'hero',
  'about',
  'featuredCourses',
  'statistics',
  'features',
  'testimonials',
  'faq',
  'cta',
  'instructors',
  'gallery',
  'contact',
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/** Per-breakpoint visibility. Hiding a breakpoint never deletes the section's configuration — see `Reports/ARCHITECTURE.md`, Prompt 9, "Content vs. Presentation". */
export interface ResponsiveVisibility {
  readonly desktop: boolean;
  readonly tablet: boolean;
  readonly mobile: boolean;
}

/**
 * A generic call-to-action: a label plus a typed target — never raw
 * markup/script. Exactly one of `pageId`/`courseId`/`url` is meaningful
 * at a time (the editor's Link Type selector enforces this; the
 * resolver in `link-resolution.utils.ts` checks them in that precedence
 * order regardless, so a malformed record degrades safely rather than
 * throwing). `courseId` references the EXISTING Course domain by id —
 * never a duplicated course projection (Prompt 11 — "Link / Redirect
 * System"). A Blog post/Announcement target was deliberately NOT added:
 * neither has a public rendering surface today (Blog/Announcements are
 * authenticated dashboard content, Prompt 5), so offering them as a
 * public website link target would be a dead or fake reference — see
 * `Reports/ARCHITECTURE.md`, Prompt 11, "Link Target Scope".
 */
export interface WebsiteCta {
  readonly label: LocalizedText;
  readonly pageId?: string;
  readonly courseId?: string;
  readonly url?: string;
  /** Phase 1 (Extended Scope, Decision 11, dependency C) — targets this Academy's own public Sign In/Sign Up page, preserving Academy context. Takes precedence over `pageId`/`courseId`/`url` when set — see `resolveWebsiteCtaHref`. */
  readonly authAction?: 'signIn' | 'signUp';
}

export interface HeroSectionConfig {
  /** A short label shown above the title (e.g. "New Cohort Open") — real tenant-authored content, not a translation key. */
  readonly eyebrow?: LocalizedText;
  readonly title: LocalizedText;
  readonly subtitle?: LocalizedText;
  readonly description?: LocalizedText;
  readonly image?: string;
  /** Accessible alternative text for `image`. Empty/absent renders the image as decorative (`alt=""`), matching standard accessibility guidance for purely illustrative imagery. Localized because screen readers announce it in the visitor's own language. */
  readonly imageAlt?: LocalizedText;
  readonly cta?: WebsiteCta;
  readonly secondaryCta?: WebsiteCta;
}

export interface AboutSectionConfig {
  readonly title: LocalizedText;
  readonly body: LocalizedText;
  readonly image?: string;
  readonly imageAlt?: LocalizedText;
}

/** References the existing Academy-scoped Course catalog — never a duplicate course projection. */
export interface FeaturedCoursesSectionConfig {
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly mode: 'latest' | 'selected';
  /** Only meaningful when `mode === 'selected'`. */
  readonly courseIds?: readonly string[];
  readonly layout: 'grid' | 'carousel';
  readonly count: number;
  readonly showPrice: boolean;
  readonly showInstructor: boolean;
}

/** A real, live-data metric `StatisticsSection` can resolve from `GET public/websites/:academyId/statistics` instead of the freely-typed `value`. */
export type StatisticMetric = 'courses' | 'students' | 'instructors';

export interface StatisticItem {
  readonly id: string;
  /**
   * Phase 6 — when set, the displayed number is resolved LIVE from real
   * Academy data (`metric` wins over `value`, which is ignored). Absent
   * on already-persisted pages authored before this phase — `value`
   * remains a valid, freely-typed fallback so no existing `WebsitePage`
   * needs a forced migration.
   */
  readonly metric?: StatisticMetric;
  /** Localized, not just a number — an Owner may want different copy per language (e.g. a differently worded suffix), not merely a numeral-format conversion of one authored value. */
  readonly value: LocalizedText;
  readonly label: LocalizedText;
}

export interface StatisticsSectionConfig {
  readonly title?: LocalizedText;
  readonly items: readonly StatisticItem[];
}

export interface FeatureItem {
  readonly id: string;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  /** A name from Atlas's existing bounded icon set (lucide-react) — never an arbitrary asset or markup. */
  readonly icon: string;
}

export interface FeaturesSectionConfig {
  readonly title?: LocalizedText;
  readonly description?: LocalizedText;
  readonly items: readonly FeatureItem[];
}

export interface TestimonialItem {
  readonly id: string;
  readonly quote: LocalizedText;
  /** A proper name — not translated, matches `WebsiteTestimonialEntry.authorName` (`website-content.types.ts`). */
  readonly authorName: string;
  readonly authorRole?: LocalizedText;
  readonly avatar?: string;
  readonly avatarAlt?: LocalizedText;
}

export interface TestimonialsSectionConfig {
  readonly title?: LocalizedText;
  readonly items: readonly TestimonialItem[];
  /**
   * Optional references into the Academy's reusable Testimonial content
   * library (Prompt 10, `WebsiteTestimonialEntry`). Resolved live at
   * render time and shown ADDITIVELY alongside `items` — never a
   * migration or replacement of existing inline data, so every page
   * saved before Prompt 10 renders identically (empty/absent list).
   */
  readonly libraryEntryIds?: readonly string[];
}

export interface FaqItem {
  readonly id: string;
  readonly question: LocalizedText;
  readonly answer: LocalizedText;
}

export interface FaqSectionConfig {
  readonly title?: LocalizedText;
  readonly items: readonly FaqItem[];
  /** Same additive library-reference mechanism as `TestimonialsSectionConfig.libraryEntryIds` — see that field's doc comment. References `WebsiteFaqEntry` (Prompt 10). */
  readonly libraryEntryIds?: readonly string[];
}

export interface CtaSectionConfig {
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly cta: WebsiteCta;
}

/** References the existing Course domain's instructor summaries — derived, never a parallel Instructor model. */
export interface InstructorsSectionConfig {
  readonly title?: LocalizedText;
  readonly description?: LocalizedText;
  readonly count: number;
}

export interface GalleryImage {
  readonly id: string;
  readonly image: string;
  readonly caption?: LocalizedText;
  readonly imageAlt?: LocalizedText;
}

export interface GallerySectionConfig {
  readonly title?: LocalizedText;
  readonly images: readonly GalleryImage[];
}

/**
 * `email`/`phone`/`address` stay plain scalars — factual reference data
 * (and usually left blank so this section falls back to the Academy's own
 * real `contactEmail`/`contactPhone`/`address`, themselves plain scalars
 * on the `Academy` model), not authored copy a translator would rewrite.
 */
export interface ContactSectionConfig {
  readonly title?: LocalizedText;
  readonly description?: LocalizedText;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly showForm: boolean;
}

/** Every section's config, keyed by its `SectionType`. */
export interface SectionConfigMap {
  readonly hero: HeroSectionConfig;
  readonly about: AboutSectionConfig;
  readonly featuredCourses: FeaturedCoursesSectionConfig;
  readonly statistics: StatisticsSectionConfig;
  readonly features: FeaturesSectionConfig;
  readonly testimonials: TestimonialsSectionConfig;
  readonly faq: FaqSectionConfig;
  readonly cta: CtaSectionConfig;
  readonly instructors: InstructorsSectionConfig;
  readonly gallery: GallerySectionConfig;
  readonly contact: ContactSectionConfig;
}

/**
 * One section placed on a page. A discriminated union on `type` — `config`
 * is always the exact shape that `type` promises, so the Section Editor
 * and every renderer get full type narrowing with no casting.
 */
export type SectionInstance = {
  [TType in SectionType]: {
    readonly id: string;
    readonly type: TType;
    readonly enabled: boolean;
    readonly visibility: ResponsiveVisibility;
    readonly config: SectionConfigMap[TType];
  };
}[SectionType];

export const DEFAULT_RESPONSIVE_VISIBILITY: ResponsiveVisibility = Object.freeze({
  desktop: true,
  tablet: true,
  mobile: true,
});
