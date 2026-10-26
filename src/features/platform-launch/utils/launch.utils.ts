/**
 * B3 — Launch & content: pure helpers shared by the pages (no React).
 * Limits mirror the contract (and the backend DTOs); the server stays the
 * authority, these only let the editor explain a problem before a round trip.
 */
import type { StatusTone } from '@components/data-display';
import type {
  AnnouncementContent,
  AnnouncementContentResponse,
  AnnouncementStatus,
  BlogLocale,
  BlogPost,
  BlogPostStatus,
  BlogTranslation,
  BlogTranslationResponse,
  SiteAnnouncement,
} from '../types';

/** The translation namespace root. */
export const K = 'platformLaunch:';

export const BLOG_LIMITS = {
  titleMin: 3,
  titleMax: 140,
  excerptMin: 20,
  excerptMax: 300,
  bodyMax: 60_000,
  coverAltMax: 200,
  seoTitleMax: 70,
  seoDescriptionMax: 170,
  slugMin: 3,
  slugMax: 80,
  authorMax: 80,
  relatedMax: 3,
  imageMaxBytes: 5 * 1024 * 1024,
} as const;

export const ANNOUNCEMENT_LIMITS = {
  nameMax: 120,
  titleMax: 120,
  bodyMax: 600,
  ctaLabelMax: 40,
  delayMax: 60,
  priorityMax: 100,
} as const;

export const CHECKLIST_LIMITS = {
  titleMax: 160,
  descriptionMax: 1000,
  notesMax: 2000,
} as const;

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const EMPTY_TRANSLATION: BlogTranslation = {
  title: '',
  excerpt: '',
  body: '',
  coverAlt: '',
  seoTitle: '',
  seoDescription: '',
};

export const EMPTY_ANNOUNCEMENT_CONTENT: AnnouncementContent = {
  title: '',
  body: '',
  ctaLabel: '',
};

/** A slug from a title: ASCII letters and digits joined by single hyphens. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, BLOG_LIMITS.slugMax)
    .replace(/-+$/g, '');
}

export function isSlugValid(slug: string): boolean {
  return (
    slug.length >= BLOG_LIMITS.slugMin &&
    slug.length <= BLOG_LIMITS.slugMax &&
    SLUG_PATTERN.test(slug)
  );
}

/** A response translation as editor fields (`null` → `''`). */
export function translationFields(
  value: BlogTranslationResponse | null | undefined
): BlogTranslation {
  return {
    title: value?.title ?? '',
    excerpt: value?.excerpt ?? '',
    body: value?.body ?? '',
    coverAlt: value?.coverAlt ?? '',
    seoTitle: value?.seoTitle ?? '',
    seoDescription: value?.seoDescription ?? '',
  };
}

/** A response announcement message as editor fields (`null` → `''`). */
export function announcementFields(
  value: AnnouncementContentResponse | null | undefined
): AnnouncementContent {
  return {
    title: value?.title ?? '',
    body: value?.body ?? '',
    ctaLabel: value?.ctaLabel ?? '',
  };
}

/**
 * Nothing written in this language (sent as `null`): the API treats a
 * language as present when its title, excerpt or body is set.
 */
export function isTranslationEmpty(
  value: Pick<BlogTranslation, 'title' | 'excerpt' | 'body'> | null
): boolean {
  if (!value) return true;
  return !value.title.trim() && !value.excerpt.trim() && !value.body.trim();
}

export type BlogTranslationField = keyof BlogTranslation;

/**
 * Field → validation message key (without the namespace), for one
 * language. `complete` adds the publish (parity) minimums — title 3,
 * excerpt 20, a body, a cover description — which the API checks on
 * publish/schedule and on any edit of a live post; a draft only has to
 * respect the maximum lengths (backend notes §4).
 */
export function validateTranslation(
  value: BlogTranslation,
  hasCover: boolean,
  complete = true
): Partial<Record<BlogTranslationField, string>> {
  const errors: Partial<Record<BlogTranslationField, string>> = {};
  const title = value.title.trim();
  const excerpt = value.excerpt.trim();
  if (
    title.length > BLOG_LIMITS.titleMax ||
    (complete && title.length < BLOG_LIMITS.titleMin)
  )
    errors.title = 'editor.validation.titleLength';
  if (
    excerpt.length > BLOG_LIMITS.excerptMax ||
    (complete && excerpt.length < BLOG_LIMITS.excerptMin)
  )
    errors.excerpt = 'editor.validation.excerptLength';
  if (value.body.length > BLOG_LIMITS.bodyMax)
    errors.body = 'editor.validation.bodyTooLong';
  else if (complete && !value.body.trim())
    errors.body = 'editor.validation.bodyRequired';
  if (complete && hasCover && !value.coverAlt.trim())
    errors.coverAlt = 'editor.validation.coverAltRequired';
  else if (value.coverAlt.length > BLOG_LIMITS.coverAltMax)
    errors.coverAlt = 'editor.validation.coverAltLength';
  if (value.seoTitle.length > BLOG_LIMITS.seoTitleMax)
    errors.seoTitle = 'editor.validation.seoTitleLength';
  if (value.seoDescription.length > BLOG_LIMITS.seoDescriptionMax)
    errors.seoDescription = 'editor.validation.seoDescriptionLength';
  return errors;
}

/** Trims every field (the server stores what it is sent). */
export function trimTranslation(value: BlogTranslation): BlogTranslation {
  return {
    title: value.title.trim(),
    excerpt: value.excerpt.trim(),
    body: value.body.replace(/\s+$/, ''),
    coverAlt: value.coverAlt.trim(),
    seoTitle: value.seoTitle.trim(),
    seoDescription: value.seoDescription.trim(),
  };
}

export function blogStatusTone(status: BlogPostStatus): StatusTone {
  switch (status) {
    case 'published':
      return 'success';
    case 'scheduled':
      return 'info';
    case 'archived':
      return 'neutral';
    default:
      return 'warning';
  }
}

/** The post's title in the reading language, falling back to the other one. */
export function postTitle(post: BlogPost, language: string): string {
  const preferred: BlogLocale = language === 'ar' ? 'ar' : 'en';
  const other: BlogLocale = preferred === 'ar' ? 'en' : 'ar';
  return (
    post.translations[preferred]?.title ||
    post.translations[other]?.title ||
    post.slug
  );
}

/** Whether a list row has this language written (rows carry title + excerpt only). */
export function hasTranslation(
  value: BlogTranslationResponse | null | undefined
): boolean {
  return Boolean(value && (value.title?.trim() || value.excerpt?.trim()));
}

// ─── Dates ─────────────────────────────────────────────────────────────────

const pad = (value: number) => String(value).padStart(2, '0');

/** ISO → `YYYY-MM-DDTHH:mm` in the browser's time zone (for datetime-local). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `YYYY-MM-DDTHH:mm` (local) → ISO UTC, or null when empty/invalid. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// ─── Announcements ─────────────────────────────────────────────────────────

export type LiveState = 'live' | 'scheduled' | 'ended' | 'off';

/** live = active AND inside its window (contract §2). */
export function announcementLiveState(
  announcement: Pick<SiteAnnouncement, 'status' | 'startsAt' | 'endsAt'> & {
    readonly live?: boolean;
  },
  now: number = Date.now()
): LiveState {
  if (announcement.status !== 'active') return 'off';
  if (announcement.live === true) return 'live';
  if (announcement.endsAt && Date.parse(announcement.endsAt) <= now)
    return 'ended';
  if (announcement.startsAt && Date.parse(announcement.startsAt) > now)
    return 'scheduled';
  return 'live';
}

export function liveStateTone(state: LiveState): StatusTone {
  switch (state) {
    case 'live':
      return 'success';
    case 'scheduled':
      return 'info';
    case 'ended':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function announcementStatusTone(status: AnnouncementStatus): StatusTone {
  if (status === 'active') return 'success';
  if (status === 'archived') return 'neutral';
  return 'warning';
}

/** A `pages` entry: `/` or lowercase a-z0-9- segments, ≤ 120 chars (backend rule). */
export function isValidPagePath(path: string): boolean {
  return (
    path.length <= 120 && /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(path)
  );
}

/** At most 20 page paths per announcement (backend rule). */
export const MAX_PAGES = 20;

/** Normalizes a typed page path: leading slash, no trailing slash, no locale. */
export function normalizePagePath(input: string): string {
  let path = input.trim().toLowerCase();
  if (!path) return '';
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/+$/, '') || '/';
  if (path === '/ar') return '/';
  if (path.startsWith('/ar/')) path = path.slice(3);
  return path;
}

/** Link targets for checklist items and CTAs: https:// or a site path. */
export function isSafeLink(value: string): boolean {
  const url = value.trim();
  if (url.startsWith('/')) return !/^\/[/\\]/.test(url);
  return /^https:\/\/[^\s/]+/i.test(url);
}

/** A 409 on a versioned write: someone else saved first. */
export function isStaleError(
  error: { status?: number; messageKey?: string } | null | undefined
): boolean {
  if (!error) return false;
  return (
    (error.status === 409 &&
      /stale|version|conflict/i.test(error.messageKey ?? '')) ||
    /\.stale$/.test(error.messageKey ?? '')
  );
}
