/**
 * Website constants.
 *
 * Configuration/validation bounds only — never a business rule scattered
 * as a magic number.
 */
import type { SectionType } from '@types';

export const MAX_PAGE_TITLE_LENGTH = 100;
export const MAX_PAGE_SLUG_LENGTH = 60;
export const MIN_PAGE_SLUG_LENGTH = 2;

/** Same shape as Academy's own slug rule (`SLUG_REGEX` in `academy.schemas.ts`) — lowercase letters, numbers, hyphens. Re-declared locally rather than imported: Academy's regex is a private, unexported constant, and a website page slug is a distinct uniqueness domain (per-Academy, not per-Tenant). */
export const PAGE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Reserved slugs a custom page must not claim — the core pages already own these. */
export const RESERVED_PAGE_SLUGS: readonly string[] = [
  'home',
  'about',
  'courses',
  'faqs',
  'contact',
];

export const MAX_SEO_TITLE_LENGTH = 70;
export const MAX_SEO_DESCRIPTION_LENGTH = 160;

/** A validated HSL triplet, e.g. `"221 83% 53%"` — matches Atlas's own `hsl(var(--x))` token format. Bounds the client to a real color, never an arbitrary CSS value. */
export const HSL_TRIPLET_REGEX = /^\d{1,3} \d{1,3}% \d{1,3}%$/;

/** Every section type, in the order they appear in the "Add section" picker. */
export const SECTION_TYPE_ORDER: readonly SectionType[] = [
  'hero',
  'about',
  'featuredCourses',
  'statistics',
  'features',
  'testimonials',
  'instructors',
  'faq',
  'gallery',
  'contact',
  'cta',
];

/** The bounded icon names a Feature item may reference — a curated subset of `lucide-react`, never an arbitrary asset. */
export const FEATURE_ICON_OPTIONS: readonly string[] = [
  'GraduationCap',
  'BookOpen',
  'Award',
  'Users',
  'Clock',
  'ShieldCheck',
  'Sparkles',
  'Globe',
  'Video',
  'Headphones',
];

export const DEFAULT_FEATURED_COURSES_COUNT = 6;
export const DEFAULT_INSTRUCTORS_COUNT = 4;
export const MAX_SECTION_ITEMS = 12;

/** Same bound Course thumbnails and Academy branding already use for an image asset. */
export const MAX_WEBSITE_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_WEBSITE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
