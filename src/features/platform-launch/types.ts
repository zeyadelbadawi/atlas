/**
 * B3 — Launch & content: the shared API contract (blog, site announcements,
 * launch checklist), field for field. JSON camelCase, ISO-8601 UTC strings.
 * PO-only fields (`createdByName`, `stats`, `notes`, …) never come from the
 * public endpoints.
 */

export type BlogLocale = 'en' | 'ar';
export const BLOG_LOCALES: readonly BlogLocale[] = ['en', 'ar'];

export const BLOG_POST_KINDS = ['pillar', 'cluster', 'article'] as const;
export type BlogPostKind = (typeof BLOG_POST_KINDS)[number];

export const BLOG_TOPICS = [
  'protection',
  'payments',
  'exams',
  'website',
  'season',
  'teaching',
  'news',
] as const;
export type BlogTopic = (typeof BLOG_TOPICS)[number];

export const BLOG_POST_STATUSES = [
  'draft',
  'scheduled',
  'published',
  'archived',
] as const;
export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

export interface BlogCoverImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface BlogTranslation {
  readonly title: string;
  readonly excerpt: string;
  /** Markdown, stored as written; rendering sanitizes. */
  readonly body: string;
  readonly coverAlt: string;
  readonly seoTitle: string;
  readonly seoDescription: string;
}

/**
 * A translation as the API returns it: list rows carry only `{ title,
 * excerpt }`; unset SEO text is `null` (backend notes §3, §5).
 */
export type BlogTranslationResponse = Partial<{
  readonly [K in keyof BlogTranslation]: string | null;
}>;

export interface BlogPost {
  readonly id: string;
  readonly slug: string;
  readonly kind: BlogPostKind;
  readonly topic: BlogTopic;
  readonly status: BlogPostStatus;
  readonly publishAt: string | null;
  readonly featured: boolean;
  readonly coverImage: BlogCoverImage | null;
  readonly authorName: string;
  readonly relatedPostIds: readonly string[];
  readonly translations: {
    readonly en: BlogTranslationResponse | null;
    readonly ar: BlogTranslationResponse | null;
  };
  readonly readingMinutes: {
    readonly en: number | null;
    readonly ar: number | null;
  };
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publishedAt: string | null;
  readonly createdByName: string | null;
  readonly updatedByName: string | null;
  /** Visible on the site right now (status + publishAt); additive backend field. */
  readonly isPublic?: boolean;
}

export interface BlogPostWritePayload {
  readonly slug?: string;
  readonly kind?: BlogPostKind;
  readonly topic?: BlogTopic;
  readonly featured?: boolean;
  readonly coverImage?: BlogCoverImage | null;
  readonly authorName?: string;
  readonly relatedPostIds?: readonly string[];
  readonly translations?: {
    readonly en?: BlogTranslation | null;
    readonly ar?: BlogTranslation | null;
  };
}

export interface UpdateBlogPostPayload extends BlogPostWritePayload {
  readonly version: number;
}

export interface BlogPostListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly status?: BlogPostStatus;
  readonly topic?: BlogTopic;
  readonly kind?: BlogPostKind;
  readonly sort?: 'updatedAt' | 'publishAt' | 'title';
}

/** The public summary shape (`/public/blog/posts`), in one locale. */
export interface PublicBlogPostSummary {
  readonly slug: string;
  readonly kind: BlogPostKind;
  readonly topic: BlogTopic;
  readonly featured: boolean;
  readonly publishAt: string;
  readonly updatedAt: string;
  readonly coverImage: BlogCoverImage | null;
  readonly coverAlt: string;
  readonly title: string;
  readonly excerpt: string;
  readonly readingMinutes: number;
  readonly authorName: string;
}

export interface PublicBlogPost extends PublicBlogPostSummary {
  readonly body: string;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly related: readonly PublicBlogPostSummary[];
  readonly alternateLocaleAvailable: boolean;
}

export interface UploadedImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

// ─── Site announcements ─────────────────────────────────────────────────────

export const ANNOUNCEMENT_SURFACES = [
  'marketing_banner',
  'marketing_popup',
  'dashboard_banner',
] as const;
export type AnnouncementSurface = (typeof ANNOUNCEMENT_SURFACES)[number];

export const ANNOUNCEMENT_STATUSES = ['draft', 'active', 'archived'] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_TONES = [
  'info',
  'promo',
  'success',
  'warning',
] as const;
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];

export const POPUP_FREQUENCIES = ['once', 'session', 'always'] as const;
export type PopupFrequency = (typeof POPUP_FREQUENCIES)[number];

export const DASHBOARD_AUDIENCES = [
  'all',
  'organization_owners',
  'academy_staff',
] as const;
export type DashboardAudience = (typeof DASHBOARD_AUDIENCES)[number];

export interface AnnouncementContent {
  readonly title: string;
  readonly body: string;
  readonly ctaLabel: string;
}

/** As the API returns it: unset title/CTA label are `null`. */
export interface AnnouncementContentResponse {
  readonly title: string | null;
  readonly body: string;
  readonly ctaLabel: string | null;
}

export interface SiteAnnouncement {
  readonly id: string;
  readonly name: string;
  readonly surface: AnnouncementSurface;
  readonly status: AnnouncementStatus;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly tone: AnnouncementTone;
  readonly content: {
    readonly en: AnnouncementContentResponse | null;
    readonly ar: AnnouncementContentResponse | null;
  };
  readonly ctaUrl: string | null;
  readonly imageUrl: string | null;
  readonly pages: readonly string[];
  readonly dismissible: boolean;
  readonly popupDelaySeconds: number;
  readonly popupFrequency: PopupFrequency;
  readonly audience: DashboardAudience;
  readonly priority: number;
  readonly version: number;
  readonly stats: {
    readonly views: number;
    readonly clicks: number;
    readonly dismissals: number;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdByName: string | null;
  readonly updatedByName: string | null;
  /** Showing right now (active + inside its window); additive backend field. */
  readonly live?: boolean;
}

export interface AnnouncementWritePayload {
  readonly name?: string;
  readonly surface?: AnnouncementSurface;
  readonly startsAt?: string | null;
  readonly endsAt?: string | null;
  readonly tone?: AnnouncementTone;
  readonly content?: {
    readonly en: AnnouncementContent | null;
    readonly ar: AnnouncementContent | null;
  };
  readonly ctaUrl?: string | null;
  readonly imageUrl?: string | null;
  readonly pages?: readonly string[];
  readonly dismissible?: boolean;
  readonly popupDelaySeconds?: number;
  readonly popupFrequency?: PopupFrequency;
  readonly audience?: DashboardAudience;
  readonly priority?: number;
}

export interface AnnouncementListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly surface?: AnnouncementSurface;
  readonly status?: AnnouncementStatus;
}

/** A locale-resolved announcement, as the public and dashboard endpoints return it. */
export interface PublicAnnouncement {
  readonly id: string;
  readonly surface: AnnouncementSurface;
  readonly tone: AnnouncementTone;
  readonly title: string;
  readonly body: string;
  readonly ctaLabel: string;
  readonly ctaUrl: string | null;
  readonly imageUrl: string | null;
  readonly dismissible: boolean;
  readonly popupDelaySeconds: number;
  readonly popupFrequency: PopupFrequency;
  readonly updatedAt: string;
}

// ─── Launch checklist ───────────────────────────────────────────────────────

export const CHECKLIST_SECTIONS = [
  'product',
  'content',
  'marketing',
  'communication',
  'operations',
] as const;
export type ChecklistSection = (typeof CHECKLIST_SECTIONS)[number];

export interface LaunchChecklistItem {
  readonly id: string;
  readonly section: ChecklistSection;
  readonly title: string;
  readonly description: string;
  readonly linkUrl: string | null;
  readonly done: boolean;
  readonly doneAt: string | null;
  readonly doneByName: string | null;
  readonly notes: string;
  readonly position: number;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LaunchChecklist {
  readonly items: readonly LaunchChecklistItem[];
  readonly progress: { readonly done: number; readonly total: number };
}

export interface ChecklistItemWritePayload {
  readonly section?: ChecklistSection;
  readonly title?: string;
  readonly description?: string;
  readonly linkUrl?: string | null;
  readonly done?: boolean;
  readonly notes?: string;
}
