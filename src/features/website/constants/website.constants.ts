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
  // B0-WEB-02 — the language prefixes (`/ar/...`, and `/en/...` on an
  // Arabic-default site): a page at either slug would be shadowed.
  'ar',
  'en',
];

export const MAX_SEO_TITLE_LENGTH = 70;
export const MAX_SEO_DESCRIPTION_LENGTH = 160;

/** A validated HSL triplet, e.g. `"221 83% 53%"` — matches Atlas's own `hsl(var(--x))` token format. Bounds the client to a real color, never an arbitrary CSS value. */
export const HSL_TRIPLET_REGEX = /^\d{1,3} \d{1,3}% \d{1,3}%$/;

/**
 * The section types the "Add section" picker offers, in its order.
 *
 * B0-LRN-04 — `courseCategories` is not offered: academies cannot create
 * categories, so the section never renders on the public site. Pages that
 * already contain one keep loading and rendering it (hidden) as before;
 * only adding a new one is gone.
 */
export const SECTION_TYPE_ORDER: readonly SectionType[] = [
  'hero',
  'pageHeader',
  'about',
  'featuredCourses',
  'courseCatalog',
  'statistics',
  'features',
  'featureSplit',
  'courseSpotlight',
  'steps',
  'schedule',
  'testimonials',
  'results',
  'logos',
  'instructors',
  'faq',
  'gallery',
  'contact',
  'map',
  'cta',
  // CMS phase 3d (batch A).
  'whatsappBar',
  'video',
  'pricing',
  'countdown',
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
/** `courseSpotlight`: how many syllabus sections it may list — mirrors the backend `MIN/MAX_SPOTLIGHT_MODULES`. */
export const MIN_SPOTLIGHT_MODULES = 1;
export const MAX_SPOTLIGHT_MODULES = 12;
/** The backend generator's default (`SECTION_BASE_DEFAULTS.courseSpotlight`). */
export const DEFAULT_SPOTLIGHT_MODULES = 6;
/*
 * CMS phase 3d (batch A) — the "Talk to us" bar, the click-to-play video,
 * pricing plans and the registration countdown. Characters per language;
 * mirrors the backend's `website.constants.ts` exactly (the parity cases
 * prove both schemas agree at every boundary).
 */
export const MAX_WHATSAPP_BAR_TITLE_LENGTH = 80;
export const MAX_WHATSAPP_BAR_DESCRIPTION_LENGTH = 200;
export const MAX_VIDEO_DESCRIPTION_LENGTH = 280;
export const MAX_VIDEO_CAPTION_LENGTH = 200;
/** A YouTube video id: exactly 11 characters of YouTube's own alphabet. */
export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
export const MIN_PRICING_PLANS = 1;
export const MAX_PRICING_PLANS = 4;
export const MAX_PRICING_FEATURES = 10;
export const MAX_PRICING_DESCRIPTION_LENGTH = 280;
export const MAX_PRICING_PLAN_NAME_LENGTH = 40;
/** Free text, e.g. "450 ج.م" or "Free". */
export const MAX_PRICING_PRICE_LENGTH = 24;
export const MAX_PRICING_PERIOD_LENGTH = 30;
export const MAX_PRICING_PLAN_DESCRIPTION_LENGTH = 160;
export const MAX_PRICING_FEATURE_LENGTH = 80;
export const MAX_PRICING_BADGE_LENGTH = 24;
export const MAX_COUNTDOWN_TITLE_LENGTH = 80;
export const MAX_COUNTDOWN_DESCRIPTION_LENGTH = 240;
export const MAX_COUNTDOWN_ENDED_MESSAGE_LENGTH = 160;
/** An ISO 8601 date and time WITH its offset (`2026-11-05T23:59:00+02:00`). */
export const COUNTDOWN_DEADLINE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/;
/** An IANA time zone name (`Africa/Cairo`, `UTC`) — the academy's, for showing the deadline. */
export const TIME_ZONE_PATTERN =
  /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+){0,2}$/;
export const MAX_TIME_ZONE_LENGTH = 64;
export const MAX_HERO_HIGHLIGHTS = 4;
export const MAX_CHIP_TEXT = 40;
export const MIN_COURSE_CATEGORIES = 2;

/* -------------------------------------------------------------------- */
/* Section content limits                                               */
/* -------------------------------------------------------------------- */

/**
 * Content limits — characters per language (`en` and `ar` each), the same
 * numbers as the backend's `website.constants.ts` (the shared parity cases
 * prove both schemas agree at every boundary).
 *
 * They live on the shared section contract, not per theme: a section's
 * config survives a theme switch, so a value valid in one theme must be
 * valid in every theme. The tighter caps keep the cinematic scenes
 * (Atelier's opening hero, Method and Ink) inside their layout budget.
 *
 * | Field                                  | Limit |
 * | -------------------------------------- | ----- |
 * | hero eyebrow                           | 60    |
 * | hero title / emphasised highlight      | 70    |
 * | hero subtitle                          | 140   |
 * | hero description                       | 280   |
 * | hero highlight chip label              | 40    |
 * | every section CTA label                | 40    |
 * | steps title                            | 80    |
 * | steps description                      | 240   |
 * | step title                             | 60    |
 * | step description                       | 240   |
 * | statistics title                       | 80    |
 * | statistic label                        | 40    |
 * | other short text (titles, alt text)    | 100   |
 * | other long text (descriptions, bodies) | 2000  |
 *
 * Counted the way zod counts (`string.length`, UTF-16 code units): every
 * Arabic diacritic (tashkeel) is a character of its own. Enforced on every
 * write (editor Save and the API); reads never re-validate, so content
 * saved under an older, looser limit keeps rendering until it is edited.
 */
export const MAX_SHORT_TEXT = 100;
export const MAX_LONG_TEXT = 2000;
export const MAX_HERO_EYEBROW_LENGTH = 60;
export const MAX_HERO_TITLE_LENGTH = 70;
export const MAX_HERO_SUBTITLE_LENGTH = 140;
export const MAX_HERO_DESCRIPTION_LENGTH = 280;
export const MAX_CTA_LABEL_LENGTH = 40;
/** The text a WhatsApp button pre-fills in the visitor's chat. */
export const MAX_CTA_WHATSAPP_MESSAGE_LENGTH = 300;
/**
 * The looks an Owner can give a section button. Absent means the theme's
 * own look for that position (first button bold, second quieter, third a
 * text link) — what every button saved before this choice existed shows.
 */
export const CTA_STYLES = ['primary', 'secondary', 'link'] as const;
/** A WhatsApp number, international (E.164): `+`, country code, number — 8 to 15 digits. */
export const CTA_WHATSAPP_NUMBER_PATTERN = /^\+[1-9]\d{7,14}$/;
/** A number to call: international (E.164) or a short hotline (3–6 digits, e.g. 19999). */
export const CTA_PHONE_NUMBER_PATTERN = /^(?:\+[1-9]\d{7,14}|\d{3,6})$/;

/*
 * CMS phase 3 — a section's design ("Design" in the visual editor): named
 * choices, never colours or numbers. Each theme draws them with its own,
 * contrast-checked grounds and rhythm, so a brand colour change still
 * restyles every section. Absent = the theme's own choice for that section.
 */
/** The ground a section sits on: the theme's lightest, its soft band, its brand band, its dark band. */
export const SECTION_BACKGROUNDS = ['light', 'soft', 'brand', 'dark'] as const;
/** The space above and below a section, relative to the theme's rhythm. */
export const SECTION_SPACINGS = ['compact', 'default', 'spacious'] as const;
export const SECTION_ALIGNMENTS = ['start', 'center'] as const;
export const SECTION_WIDTHS = ['default', 'wide'] as const;
export const MAX_STEPS_TITLE_LENGTH = 80;
export const MAX_STEPS_DESCRIPTION_LENGTH = 240;
export const MAX_STEP_TITLE_LENGTH = 60;
export const MAX_STEP_DESCRIPTION_LENGTH = 240;
export const MAX_STATISTICS_TITLE_LENGTH = 80;
export const MAX_STATISTIC_LABEL_LENGTH = 40;
/** A statistic's authored value ("500+", "٥٠٠+"). */
export const MAX_STATISTIC_VALUE_LENGTH = 20;

/**
 * CMS phase 3d (batch B) limits — the backend's `website.constants.ts`
 * values exactly (the parity cases prove both schemas agree).
 *
 * | Field                          | Limit |
 * | ------------------------------ | ----- |
 * | logos per section              | 12    |
 * | map address (multi-line)       | 300   |
 * | map note                       | 140   |
 * | map query (address or lat,lng) | 200   |
 * | schedule rows                  | 30    |
 * | schedule row title             | 80    |
 * | schedule teacher / location    | 60    |
 * | results per section            | 24    |
 * | a result ("98%", "الأول …")    | 40    |
 */
export const MAX_LOGOS = 12;
export const MAX_MAP_ADDRESS_LENGTH = 300;
export const MAX_MAP_NOTE_LENGTH = 140;
export const MAX_MAP_QUERY_LENGTH = 200;
export const MAX_SCHEDULE_ROWS = 30;
export const MAX_SCHEDULE_ROW_TITLE_LENGTH = 80;
export const MAX_SCHEDULE_ROW_DETAIL_LENGTH = 60;
export const MAX_RESULTS = 24;
export const MAX_RESULT_VALUE_LENGTH = 40;
/** A 24-hour clock time, `HH:MM` (what `<input type="time">` gives). */
export const SCHEDULE_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

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
