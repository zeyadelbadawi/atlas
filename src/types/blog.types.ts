/**
 * Blog (Knowledge Content) domain types.
 *
 * Distinct from the repository's existing static, unauthenticated marketing
 * blog (`src/lib/blog.ts`, prerendered Markdown under `seo/content/`) — this
 * is a dynamic, permission-gated, academy-scoped knowledge feature rendered
 * inside the authenticated dashboard, backed by a real service contract.
 * No rich-text editor exists in the project, so `content` is authored as
 * plain text; a future backend/editor can replace that without changing
 * this contract.
 */

/** Blog post lifecycle status. Phase 6 adds `scheduled` — a future-dated post between `draft` and `published`, flipped to `published` by the Phase 2 sweep tick once `scheduledAt` is due. */
export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

/** Blog post entity. */
export interface BlogPost {
  readonly id: string;
  /** Absent for platform-level posts. */
  readonly academyId?: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly title: string;
  readonly slug: string;
  readonly excerpt?: string;
  readonly content: string;
  readonly featuredImage?: string;
  readonly category?: string;
  readonly tags: readonly string[];
  readonly status: BlogPostStatus;
  /** Phase 6 — set only when `status === 'scheduled'`. */
  readonly scheduledAt?: string;
  /** Phase 6 — real, persisted SEO metadata; each falls back to `title`/`excerpt`/`featuredImage` when unset. */
  readonly metaTitle?: string;
  readonly metaDescription?: string;
  readonly ogImage?: string;
  readonly publishedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Blog post creation payload. */
export interface CreateBlogPostPayload {
  readonly title: string;
  readonly slug: string;
  readonly excerpt?: string;
  readonly content: string;
  readonly featuredImage?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
  /** Phase 6 — a future ISO-8601 instant; the post is created as `scheduled` instead of `draft`. Omit to save a plain draft. */
  readonly scheduledAt?: string;
  readonly metaTitle?: string;
  readonly metaDescription?: string;
  readonly ogImage?: string;
}

/** Blog post update payload. */
export interface UpdateBlogPostPayload {
  readonly title?: string;
  readonly slug?: string;
  readonly excerpt?: string;
  readonly content?: string;
  readonly featuredImage?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly scheduledAt?: string;
  readonly metaTitle?: string;
  readonly metaDescription?: string;
  readonly ogImage?: string;
}
