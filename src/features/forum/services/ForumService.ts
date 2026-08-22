/**
 * Forum Service.
 *
 * A single service for Forum/Thread/Reply — the domain is small enough
 * that splitting it into three services would only fragment one course
 * conversation across files. Nested under the flat `courses/:courseId/...`
 * tree (the same one `ProgressService`/`QuizService`/`AssignmentService`
 * use), since a forum is always reached through the course it belongs to —
 * a course id from the route, never a client-chosen forum id.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CollectionQuery,
  CreateForumReplyPayload,
  CreateForumThreadPayload,
  Forum,
  ForumReply,
  ForumThread,
  PaginatedResult,
  QueryParams,
} from '@types';

export class ForumService extends BaseService {
  protected readonly resource = 'courses';

  /** Retrieves a course's forum. */
  async getForum(courseId: string, options?: ReadOptions): Promise<Forum> {
    return this.client.get<Forum>(this.path(courseId, 'forum'), options);
  }

  /** Retrieves a forum's threads. */
  async getThreads(
    courseId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ForumThread>> {
    return this.client.get<PaginatedResult<ForumThread>>(
      this.path(courseId, 'forum', 'threads'),
      { ...options, params: query as unknown as QueryParams }
    );
  }

  /** Retrieves a single thread. */
  async getThread(
    courseId: string,
    threadId: string,
    options?: ReadOptions
  ): Promise<ForumThread> {
    return this.client.get<ForumThread>(
      this.path(courseId, 'forum', 'threads', threadId),
      options
    );
  }

  /** Retrieves a thread's replies. */
  async getReplies(
    courseId: string,
    threadId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ForumReply>> {
    return this.client.get<PaginatedResult<ForumReply>>(
      this.path(courseId, 'forum', 'threads', threadId, 'replies'),
      { ...options, params: query as unknown as QueryParams }
    );
  }

  /** Creates a new discussion thread. */
  async createThread(
    courseId: string,
    payload: CreateForumThreadPayload,
    options?: WriteOptions
  ): Promise<ForumThread> {
    return this.client.post<ForumThread, CreateForumThreadPayload>(
      this.path(courseId, 'forum', 'threads'),
      payload,
      options
    );
  }

  /** Replies to a thread. */
  async createReply(
    courseId: string,
    threadId: string,
    payload: CreateForumReplyPayload,
    options?: WriteOptions
  ): Promise<ForumReply> {
    return this.client.post<ForumReply, CreateForumReplyPayload>(
      this.path(courseId, 'forum', 'threads', threadId, 'replies'),
      payload,
      options
    );
  }

  /** Pins a thread. Requires forum moderation authorization. */
  async pinThread(
    courseId: string,
    threadId: string,
    options?: WriteOptions
  ): Promise<ForumThread> {
    return this.client.post<ForumThread, undefined>(
      this.path(courseId, 'forum', 'threads', threadId, 'pin'),
      undefined,
      options
    );
  }

  /** Unpins a thread. Requires forum moderation authorization. */
  async unpinThread(
    courseId: string,
    threadId: string,
    options?: WriteOptions
  ): Promise<ForumThread> {
    return this.client.post<ForumThread, undefined>(
      this.path(courseId, 'forum', 'threads', threadId, 'unpin'),
      undefined,
      options
    );
  }

  /** Locks a thread against further replies. Requires forum moderation authorization. */
  async lockThread(
    courseId: string,
    threadId: string,
    options?: WriteOptions
  ): Promise<ForumThread> {
    return this.client.post<ForumThread, undefined>(
      this.path(courseId, 'forum', 'threads', threadId, 'lock'),
      undefined,
      options
    );
  }

  /** Unlocks a thread. Requires forum moderation authorization. */
  async unlockThread(
    courseId: string,
    threadId: string,
    options?: WriteOptions
  ): Promise<ForumThread> {
    return this.client.post<ForumThread, undefined>(
      this.path(courseId, 'forum', 'threads', threadId, 'unlock'),
      undefined,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const forumService = new ForumService();
