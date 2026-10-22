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
  // CMS phase 3d (batch A) — shared by every theme, each with a base renderer.
  'whatsappBar',
  'video',
  'pricing',
  'countdown',
  // CMS phase 3d (batch B) — shared by every theme, each with a renderer.
  'logos',
  'map',
  'schedule',
  'results',
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
  /** CMS phase 3 — a WhatsApp chat with this international number (`+201001234567`). Stored as a number; the renderer builds the `wa.me` link. */
  readonly whatsapp?: string;
  /** The text the WhatsApp chat opens with, in the visitor's language. */
  readonly whatsappMessage?: LocalizedText;
  /** CMS phase 3 — a call to this international number or short hotline (`19999`). */
  readonly phone?: string;
  /** The button's look. Absent = the theme's own look for its position. */
  readonly style?: WebsiteCtaStyle;
}

/** See `CTA_STYLES` (`website.constants.ts`). */
export type WebsiteCtaStyle = 'primary' | 'secondary' | 'link';

/**
 * CMS phase 3 — the button slots of a section that has buttons, in order.
 * Stored as three named slots (not a list) so every page saved before a
 * section could have three buttons reads exactly as it did.
 */
export const SECTION_BUTTON_SLOTS = [
  'cta',
  'secondaryCta',
  'tertiaryCta',
] as const;

export type SectionButtonSlot = (typeof SECTION_BUTTON_SLOTS)[number];

/** A section config's button slots. */
export type SectionButtons = {
  readonly [TSlot in SectionButtonSlot]?: WebsiteCta;
};

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
  readonly tertiaryCta?: WebsiteCta;
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

export interface AboutSectionConfig extends SectionButtons {
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
  readonly tertiaryCta?: WebsiteCta;
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
  readonly secondaryCta?: WebsiteCta;
  readonly tertiaryCta?: WebsiteCta;
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

/** CMS phase 3d — one partner / accreditation logo. */
export interface LogoItem {
  readonly id: string;
  /** Required — any image value (`WebsiteImageField`, media library). */
  readonly image: string;
  /** The partner's name, announced by screen readers (the link's name when linked). */
  readonly alt: LocalizedText;
  /** Optional web address the logo links to (new tab). Empty = no link. */
  readonly url?: string;
}

/** CMS phase 3d — up to 12 logos in a calm wrapping grid (never a marquee). */
export interface LogosSectionConfig {
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly items: readonly LogoItem[];
}

/**
 * CMS phase 3d — where the academy is: the address card, a "Get directions"
 * link and a map that loads only when the visitor asks for it.
 */
export interface MapSectionConfig {
  readonly title: LocalizedText;
  /** Multi-line; each line break is kept. */
  readonly address: LocalizedText;
  /** A landmark hint ("Next to Dokki metro"). */
  readonly note?: LocalizedText;
  /** An address or `lat,lng` for the map and directions; empty → the address. Never an `href` itself. */
  readonly query?: string;
}

/** The days of a schedule row, in the order an Egyptian week runs (Saturday first). */
export const SCHEDULE_DAYS = [
  'sat',
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
] as const;

export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

export interface ScheduleRow {
  readonly id: string;
  readonly day: ScheduleDay;
  /** `HH:MM`, 24-hour; shown in the visitor's locale. */
  readonly start: string;
  readonly end: string;
  /** The course or group meeting at that time. */
  readonly title: LocalizedText;
  readonly teacher?: LocalizedText;
  readonly location?: LocalizedText;
  /** Starter row for preview only — never public, labelled "Sample" in previews. */
  readonly sample?: boolean;
}

/** CMS phase 3d — a weekly timetable (≤ 30 rows), shown by day. */
export interface ScheduleSectionConfig {
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly items: readonly ScheduleRow[];
}

export interface ResultItem {
  readonly id: string;
  /** A proper name — not translated (like `TestimonialItem.authorName`). */
  readonly studentName: string;
  /** The achievement ("98%", "الأول على الجمهورية"). */
  readonly result: LocalizedText;
  /** Grade, year or exam. */
  readonly detail?: LocalizedText;
  readonly photo?: string;
  readonly photoAlt?: LocalizedText;
  /** A top achiever: drawn with a labelled badge. */
  readonly top?: boolean;
  /**
   * Starter content for preview only — exactly `TestimonialItem.sample`:
   * never public (the API strips it, the renderer filters it), labelled
   * "Sample" in previews, cleared only by the Owner's "This is a real result".
   */
  readonly sample?: boolean;
}

/** CMS phase 3d — student results and achievements ("أوائل"), ≤ 24. */
export interface ResultsSectionConfig {
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly items: readonly ResultItem[];
}

/**
 * CMS phase 3d — a "Talk to us" strip: a short line and up to three buttons
 * (WhatsApp, a call, a page). It always keeps its first button.
 */
export interface WhatsappBarSectionConfig extends SectionButtons {
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly cta: WebsiteCta;
}

/**
 * CMS phase 3d — a YouTube video that loads only when the visitor presses
 * play. `videoId` is the 11-character id (a pasted link is reduced to it on
 * save); empty means no video chosen yet, and the public site leaves the
 * section out until there is one.
 */
export interface VideoSectionConfig {
  readonly title?: LocalizedText;
  readonly description?: LocalizedText;
  readonly videoId: string;
  /** An uploaded poster; absent → YouTube's own thumbnail. */
  readonly poster?: string;
  readonly caption?: LocalizedText;
}

export interface PricingPlanFeature {
  readonly id: string;
  readonly text: LocalizedText;
  /** ✓ included, ✗ not included. */
  readonly included: boolean;
}

export interface PricingPlan {
  readonly id: string;
  readonly name: LocalizedText;
  /** Free text per language ("450 ج.م", "Free"), never a number the site formats. */
  readonly price: LocalizedText;
  /** "per month", "per term". */
  readonly period?: LocalizedText;
  readonly description?: LocalizedText;
  readonly features: readonly PricingPlanFeature[];
  /** The "most popular" plan (the editor keeps it to one). */
  readonly highlighted?: boolean;
  /** The highlighted plan's badge; empty → "Most popular". */
  readonly badge?: LocalizedText;
  readonly cta?: WebsiteCta;
}

/** CMS phase 3d — plans or packages (monthly, per term): one to four. */
export interface PricingSectionConfig {
  readonly title?: LocalizedText;
  readonly description?: LocalizedText;
  readonly plans: readonly PricingPlan[];
}

/**
 * CMS phase 3d — a countdown to a registration deadline. `deadline` is an
 * ISO date and time with its offset (`2026-11-05T23:59:00+02:00`), empty
 * until one is chosen (the public site leaves the section out until then);
 * `timeZone` is the academy's IANA zone it was chosen in, which the site
 * names the deadline in.
 */
export interface CountdownSectionConfig extends SectionButtons {
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly deadline: string;
  readonly timeZone?: string;
  /** Shown instead of the countdown once the deadline has passed. */
  readonly endedMessage?: LocalizedText;
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
  readonly whatsappBar: WhatsappBarSectionConfig;
  readonly video: VideoSectionConfig;
  readonly pricing: PricingSectionConfig;
  readonly countdown: CountdownSectionConfig;
  readonly logos: LogosSectionConfig;
  readonly map: MapSectionConfig;
  readonly schedule: ScheduleSectionConfig;
  readonly results: ResultsSectionConfig;
}

/** CMS phase 3 — the ground a section sits on (see `SECTION_BACKGROUNDS`). */
export type SectionBackground = 'light' | 'soft' | 'brand' | 'dark';
export type SectionSpacing = 'compact' | 'default' | 'spacious';

/**
 * CMS phase 3 — a section's design: named choices only, drawn by each
 * theme with its own grounds and rhythm. Every key is optional; absent is
 * the theme's own choice for that section.
 */
export interface SectionDesign {
  readonly background?: SectionBackground;
  readonly spacing?: SectionSpacing;
  /** Phones only; absent = the same as `spacing`. */
  readonly spacingMobile?: SectionSpacing;
  readonly align?: 'start' | 'center';
  readonly width?: 'default' | 'wide';
  /** Phones only: a two-column section stacks its second column first. */
  readonly reverseOnMobile?: boolean;
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
    readonly design?: SectionDesign;
  };
}[SectionType];

export const DEFAULT_RESPONSIVE_VISIBILITY: ResponsiveVisibility =
  Object.freeze({
    desktop: true,
    tablet: true,
    mobile: true,
  });
