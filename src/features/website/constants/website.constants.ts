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
  // Phase 1 (Extended Scope, Decision 11, dependency C) — real public
  // routes (`PublicWebsiteRouter`), not CMS content; a Custom Page must
  // never claim either slug.
  'sign-in',
  'sign-up',
];

export const MAX_SEO_TITLE_LENGTH = 70;
export const MAX_SEO_DESCRIPTION_LENGTH = 160;

/** A validated HSL triplet, e.g. `"221 83% 53%"` — matches Atlas's own `hsl(var(--x))` token format. Bounds the client to a real color, never an arbitrary CSS value. */
export const HSL_TRIPLET_REGEX = /^\d{1,3} \d{1,3}% \d{1,3}%$/;

/** Every section type, in the order they appear in the "Add section" picker. */
export const SECTION_TYPE_ORDER: readonly SectionType[] = [
  'hero',
  'pageHeader',
  'about',
  'featuredCourses',
  'courseCatalog',
  'courseCategories',
  'statistics',
  'features',
  'featureSplit',
  'steps',
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
/**
 * Featured Courses "selected" mode: how many courses an Owner can pick —
 * the most the section can show (`count` ≤ `MAX_SECTION_ITEMS`), and well
 * inside the public courses endpoint's 50-id bound.
 */
export const MAX_SELECTED_COURSES = MAX_SECTION_ITEMS;

/**
 * P64 Phase 4 §E.1 — `CourseCatalogSection` page-size bounds. The catalog
 * is server-paginated, so unlike `MAX_SECTION_ITEMS` this caps ONE
 * request's size, never how many courses the section can reach.
 */
export const DEFAULT_COURSE_CATALOG_PAGE_SIZE = 12;
export const MIN_COURSE_CATALOG_PAGE_SIZE = 6;
export const MAX_COURSE_CATALOG_PAGE_SIZE = 48;

/** Same bound Course thumbnails and Academy branding already use for an image asset. */
export const MAX_WEBSITE_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
/** Theme 1 plan §B density (one idea per section, 3–6 items) — mirrors the backend constants exactly. */
export const MAX_SECTION_STEPS = 6;
export const MAX_FEATURE_SPLIT_ITEMS = 6;
export const MAX_HERO_HIGHLIGHTS = 4;
export const MAX_CHIP_TEXT = 40;
export const MIN_COURSE_CATEGORIES = 2;
/** The public Contact form's field limits — the backend's `SubmitContactMessageDto` bounds exactly. */
export const CONTACT_NAME_MAX_LENGTH = 200;
export const CONTACT_EMAIL_MAX_LENGTH = 320;
export const CONTACT_MESSAGE_MAX_LENGTH = 5000;
export const DEFAULT_COURSE_CATEGORIES_COUNT = 8;

/** See `image-value.utils.ts` — mirrors the backend patterns exactly. */
export const THEME_ASSET_REFERENCE_PATTERN =
  /^theme-asset:[a-z0-9-]+\/[a-z0-9-]+$/;
export const LEGACY_DATA_IMAGE_PATTERN =
  /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
/** An Atlas MediaAsset URL — relative on purpose (see the backend's `toMediaAssetUrl`). No `.` before the extension, so no `..` segment. */
export const MEDIA_ASSET_PATH_PATTERN =
  /^\/api\/v1\/public\/media\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.[a-z0-9]+$/;

export const ALLOWED_WEBSITE_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

/* -------------------------------------------------------------------- */
/* CMS content (Prompt 10)                                              */
/* -------------------------------------------------------------------- */

export const MAX_FAQ_QUESTION_LENGTH = 200;
export const MAX_FAQ_ANSWER_LENGTH = 2000;
export const MAX_TESTIMONIAL_QUOTE_LENGTH = 500;
export const MAX_TESTIMONIAL_AUTHOR_NAME_LENGTH = 100;
export const MAX_TESTIMONIAL_AUTHOR_ROLE_LENGTH = 100;
export const CONTENT_LIST_PAGE_SIZE = 50;

/* -------------------------------------------------------------------- */
/* SEO (Prompt 10)                                                      */
/* -------------------------------------------------------------------- */

export const MAX_SITE_TITLE_LENGTH = 70;
export const MAX_OG_TITLE_LENGTH = 70;
export const MAX_OG_DESCRIPTION_LENGTH = 200;

/** A site-relative path only — enforced so a canonical value can never smuggle a full origin/protocol (that remains a future public-runtime concern, never client configuration). */
export const CANONICAL_PATH_REGEX = /^\/[a-z0-9/-]*$/;
export const MAX_CANONICAL_PATH_LENGTH = 200;
