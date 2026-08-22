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

/** Blog post lifecycle status. */
export type BlogPostStatus = 'draft' | 'published' | 'archived';

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
}
