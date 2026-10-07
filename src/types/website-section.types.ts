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
  'courseCatalog',
  // Theme 1 plan §D.2 — shared by every theme, each with a base renderer.
  'pageHeader',
  'courseCategories',
  'steps',
  'featureSplit',
  // Theme 4 plan §6 (Reports/THEME_4_RIWAQ_PLAN.md) — shared by every theme, with a base renderer.
  'courseSpotlight',
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
  /** Theme 1 plan §D.2 — the one title phrase a theme may emphasise (ignored if no longer in the title). */
  readonly highlight?: LocalizedText;
  /** Short value chips under the hero (≤ 4). */
  readonly highlights?: readonly HeroHighlight[];
  /** Inline course search that submits to the catalog. */
  readonly showSearch?: boolean;
}

export interface HeroHighlight {
  readonly id: string;
  readonly label: LocalizedText;
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

/**
 * P64 Phase 4 §E.1 — the sort orders `CourseCatalogSection` offers. A
 * closed list (not a free `sortBy`/`sortDirection` pair) so the section
 * can only ever ask the public catalog for a sort it actually supports —
 * see `COURSE_CATALOG_SORT_DESCRIPTORS` in the section for the mapping.
 */
export const COURSE_CATALOG_SORT_VALUES = [
  'newest',
  'title',
  'priceAsc',
  'priceDesc',
] as const;

export type CourseCatalogSort = (typeof COURSE_CATALOG_SORT_VALUES)[number];

/**
 * The full, filterable, server-paginated public catalog an Owner places
 * on the `/courses` core page (P64 Phase 4 §E.1). `FeaturedCoursesSection`
 * stays the small fixed teaser; this section is the real listing. Same
 * rule as every other section: references the EXISTING Course domain via
 * `usePublicCourses`, never a duplicate course projection. The `show*`
 * booleans only hide a control — a hidden filter is simply not applied.
 */
export interface CourseCatalogSectionConfig {
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  /** Courses per page — bounded by `MIN/MAX_COURSE_CATALOG_PAGE_SIZE` (`website.constants.ts`). */
  readonly pageSize: number;
  readonly defaultSort: CourseCatalogSort;
  readonly showSearch: boolean;
  readonly showLevelFilter: boolean;
  readonly showPricingFilter: boolean;
  readonly showSort: boolean;
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
  /** Theme 1 plan §D.2 — `strip` is a compact highlights band; absent means the usual cards. */
  readonly layout?: 'cards' | 'strip';
}

export interface TestimonialItem {
  readonly id: string;
  readonly quote: LocalizedText;
  /** A proper name — not translated, matches `WebsiteTestimonialEntry.authorName` (`website-content.types.ts`). */
  readonly authorName: string;
  readonly authorRole?: LocalizedText;
  readonly avatar?: string;
  readonly avatarAlt?: LocalizedText;
  /** 1–5. */
  readonly rating?: number;
  /**
   * Theme 1 plan §D.4 — starter content for preview only: never public
   * (the API strips it, the renderer filters it), shown with a "Sample"
   * label in previews, cleared only by the Owner's explicit "This is a
   * real testimonial".
   */
  readonly sample?: boolean;
}

/**
 * A testimonial library entry as the PUBLIC pages payload carries it
 * (`TestimonialsSectionConfig.libraryEntries`): public fields only.
 */
export interface PublicTestimonialLibraryEntry {
  readonly id: string;
  readonly quote: LocalizedText;
  readonly authorName: string;
  readonly authorRole?: LocalizedText;
  readonly avatar?: string;
}

export interface TestimonialsSectionConfig {
  readonly title?: LocalizedText;
  readonly items: readonly TestimonialItem[];
  /**
   * Optional references into the Academy's reusable Testimonial content
   * library (Prompt 10, `WebsiteTestimonialEntry`), in the order the
   * Owner picked them, shown ADDITIVELY before `items` — never a
   * migration or replacement of existing inline data, so every page
   * saved before Prompt 10 renders identically (empty/absent list).
   */
  readonly libraryEntryIds?: readonly string[];
  /**
   * Server-supplied, read-only: the referenced entries resolved by the
   * public pages API — published, visible and this Academy's only, in
   * `libraryEntryIds` order. Present on the public site; absent in
   * dashboard reads (the preview resolves them itself). Never saved.
   */
  readonly libraryEntries?: readonly PublicTestimonialLibraryEntry[];
}

export interface FaqItem {
  readonly id: string;
  readonly question: LocalizedText;
  readonly answer: LocalizedText;
}

/** A FAQ library entry as the PUBLIC pages payload carries it — see `PublicTestimonialLibraryEntry`. */
export interface PublicFaqLibraryEntry {
  readonly id: string;
  readonly question: LocalizedText;
  readonly answer: LocalizedText;
}

export interface FaqSectionConfig {
  readonly title?: LocalizedText;
  readonly items: readonly FaqItem[];
  /** Same additive library-reference mechanism as `TestimonialsSectionConfig.libraryEntryIds` — see that field's doc comment. References `WebsiteFaqEntry` (Prompt 10). */
  readonly libraryEntryIds?: readonly string[];
  /** Server-supplied, read-only — see `TestimonialsSectionConfig.libraryEntries`. */
  readonly libraryEntries?: readonly PublicFaqLibraryEntry[];
  /** Theme 1 plan §D.2 — show only the first N (a teaser). */
  readonly maxItems?: number;
  /** A link to the rest (e.g. the FAQs page). */
  readonly cta?: WebsiteCta;
}

export interface CtaSectionConfig {
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly cta: WebsiteCta;
  readonly secondaryCta?: WebsiteCta;
  readonly image?: string;
  readonly imageAlt?: LocalizedText;
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

/** Theme 1 plan §D.2 — an inner page's title band, optionally with that page's search. */
export interface PageHeaderSectionConfig {
  readonly eyebrow?: LocalizedText;
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly image?: string;
  readonly imageAlt?: LocalizedText;
  readonly search?: 'none' | 'courses' | 'faq';
}

/** Theme 1 plan §C.1 #3 — the Academy's real categories (live); hidden publicly with fewer than two. */
export interface CourseCategoriesSectionConfig {
  readonly title?: LocalizedText;
  readonly description?: LocalizedText;
  readonly maxItems: number;
  readonly showCounts: boolean;
}

export interface StepItem {
  readonly id: string;
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
}

/** Theme 1 plan §C.1 #6 — "How it works": an ordered, numbered sequence (≤ 6). */
export interface StepsSectionConfig {
  readonly title?: LocalizedText;
  readonly description?: LocalizedText;
  /**
   * Optional plate beside the steps. Drawn by themes that support it
   * (Atelier's Method scene); the builder offers it only for those themes.
   */
  readonly image?: string;
  readonly imageAlt?: LocalizedText;
  readonly items: readonly StepItem[];
}

export interface FeatureSplitItem {
  readonly id: string;
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
}

/** Theme 1 plan §C.1 #5 — an image beside a title, lead and numbered benefits (≤ 6). */
export interface FeatureSplitSectionConfig {
  readonly eyebrow?: LocalizedText;
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly image?: string;
  readonly imageAlt?: LocalizedText;
  /** Logical side: `start` is left in English, right in Arabic. */
  readonly imagePosition: 'start' | 'end';
  readonly items: readonly FeatureSplitItem[];
  readonly cta?: WebsiteCta;
}

/**
 * Theme 4 plan §6 — one real course's outcomes and syllabus. `courseId`
 * references the Academy's own Course domain (absent → the newest published
 * course); every fact the section shows is read live from the public course
 * and its curriculum, so the config carries no course copy of its own.
 */
export interface CourseSpotlightSectionConfig {
  readonly eyebrow?: LocalizedText;
  /** Absent → the course's own title. */
  readonly title?: LocalizedText;
  readonly description?: LocalizedText;
  readonly courseId?: string;
  readonly showOutcomes: boolean;
  readonly showSyllabus: boolean;
  /** How many syllabus sections to list (1–12); the rest are summarised. */
  readonly maxModules: number;
  /** Absent → a link to the course itself. */
  readonly cta?: WebsiteCta;
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
  readonly courseCatalog: CourseCatalogSectionConfig;
  readonly pageHeader: PageHeaderSectionConfig;
  readonly courseCategories: CourseCategoriesSectionConfig;
  readonly steps: StepsSectionConfig;
  readonly featureSplit: FeatureSplitSectionConfig;
  readonly courseSpotlight: CourseSpotlightSectionConfig;
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

export const DEFAULT_RESPONSIVE_VISIBILITY: ResponsiveVisibility =
  Object.freeze({
    desktop: true,
    tablet: true,
    mobile: true,
  });
