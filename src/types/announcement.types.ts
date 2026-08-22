/**
 * Announcement domain types.
 *
 * An announcement always has exactly one scope: platform-wide, one academy,
 * or one course. Ownership is never ambiguous — `audience` and the presence
 * of `academyId`/`courseId` always agree.
 */

/** Announcement lifecycle status. */
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';

/** Who an announcement is addressed to. */
export type AnnouncementAudience = 'platform' | 'academy' | 'course';

/** Announcement entity. */
export interface Announcement {
  readonly id: string;
  readonly audience: AnnouncementAudience;
  /** Present only when `audience` is 'academy' or 'course'. */
  readonly academyId?: string;
  /** Present only when `audience` is 'course'. */
  readonly courseId?: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly title: string;
  readonly body: string;
  readonly status: AnnouncementStatus;
  readonly scheduledAt?: string;
  readonly publishedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Announcement creation payload. Scope is fixed by the route it's created from. */
export interface CreateAnnouncementPayload {
  readonly title: string;
  readonly body: string;
  readonly scheduledAt?: string;
}

/** Announcement update payload. */
export interface UpdateAnnouncementPayload {
  readonly title?: string;
  readonly body?: string;
  readonly scheduledAt?: string;
}
