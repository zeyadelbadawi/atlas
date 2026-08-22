/**
 * Course Forum domain types.
 *
 * A forum belongs to exactly one course (which belongs to exactly one
 * academy). Threads and replies always resolve their scope through the
 * forum/course they belong to — never through a client-supplied id alone.
 */

/** A course's discussion forum. One per course. */
export interface Forum {
  readonly id: string;
  readonly academyId: string;
  readonly courseId: string;
  readonly title: string;
  readonly description?: string;
  readonly status: 'open' | 'locked' | 'archived';
  readonly threadCount: number;
}

/** A discussion thread within a forum. */
export interface ForumThread {
  readonly id: string;
  readonly forumId: string;
  readonly courseId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly title: string;
  readonly body: string;
  readonly pinned: boolean;
  readonly locked: boolean;
  readonly replyCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A reply within a thread. */
export interface ForumReply {
  readonly id: string;
  readonly threadId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly body: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Thread creation payload. */
export interface CreateForumThreadPayload {
  readonly title: string;
  readonly body: string;
}

/** Reply creation payload. */
export interface CreateForumReplyPayload {
  readonly body: string;
}
