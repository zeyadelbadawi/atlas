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
 */

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

/** A generic call-to-action: a label plus a target — either another Website page, or an external URL, never raw markup/script. */
export interface WebsiteCta {
  readonly label: string;
  readonly pageId?: string;
  readonly url?: string;
}

export interface HeroSectionConfig {
  readonly title: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly image?: string;
  readonly cta?: WebsiteCta;
  readonly secondaryCta?: WebsiteCta;
}

export interface AboutSectionConfig {
  readonly title: string;
  readonly body: string;
  readonly image?: string;
}

/** References the existing Academy-scoped Course catalog — never a duplicate course projection. */
export interface FeaturedCoursesSectionConfig {
  readonly title: string;
  readonly description?: string;
  readonly mode: 'latest' | 'selected';
  /** Only meaningful when `mode === 'selected'`. */
  readonly courseIds?: readonly string[];
  readonly layout: 'grid' | 'carousel';
  readonly count: number;
  readonly showPrice: boolean;
  readonly showInstructor: boolean;
}

export interface StatisticItem {
  readonly id: string;
  readonly value: string;
  readonly label: string;
}

export interface StatisticsSectionConfig {
  readonly title?: string;
  readonly items: readonly StatisticItem[];
}

export interface FeatureItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** A name from Atlas's existing bounded icon set (lucide-react) — never an arbitrary asset or markup. */
  readonly icon: string;
}

export interface FeaturesSectionConfig {
  readonly title?: string;
  readonly description?: string;
  readonly items: readonly FeatureItem[];
}

export interface TestimonialItem {
  readonly id: string;
  readonly quote: string;
  readonly authorName: string;
  readonly authorRole?: string;
  readonly avatar?: string;
}

export interface TestimonialsSectionConfig {
  readonly title?: string;
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
  readonly question: string;
  readonly answer: string;
}

export interface FaqSectionConfig {
  readonly title?: string;
  readonly items: readonly FaqItem[];
  /** Same additive library-reference mechanism as `TestimonialsSectionConfig.libraryEntryIds` — see that field's doc comment. References `WebsiteFaqEntry` (Prompt 10). */
  readonly libraryEntryIds?: readonly string[];
}

export interface CtaSectionConfig {
  readonly title: string;
  readonly description?: string;
  readonly cta: WebsiteCta;
}

/** References the existing Course domain's instructor summaries — derived, never a parallel Instructor model. */
export interface InstructorsSectionConfig {
  readonly title?: string;
  readonly description?: string;
  readonly count: number;
}

export interface GalleryImage {
  readonly id: string;
  readonly image: string;
  readonly caption?: string;
}

export interface GallerySectionConfig {
  readonly title?: string;
  readonly images: readonly GalleryImage[];
}

export interface ContactSectionConfig {
  readonly title?: string;
  readonly description?: string;
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
