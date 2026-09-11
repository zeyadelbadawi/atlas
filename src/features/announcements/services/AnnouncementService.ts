/**
 * Announcement Service.
 *
 * Reading is always "my visible feed" (the backend determines platform +
 * academy + course scope from the authenticated session) — no id a caller
 * supplies can widen that. Authoring is course-scoped: a course-owned
 * announcement is created, edited and published through that course's own
 * path, the same nesting `ProgressService`/`QuizService`/`AssignmentService`
 * already use, so a course-scoped announcement can never be mistaken for an
 * academy- or platform-scoped one.
 *
 * ACADEMY-SCOPED AUTHORING is the parallel tree below it. The backend has
 * had `academies/:academyId/announcements` since Phase 6 — create, update,
 * publish and archive, authorised against the caller's own
 * `academy_members` row — but this service only ever implemented the course
 * tree, so an Organization Owner or Manager had a real permission and a
 * real endpoint with no way to reach either. The two trees are kept
 * separate here for the same reason the backend keeps them separate: an
 * academy-wide announcement is a different thing from a course
 * announcement, and neither should be reachable by editing an id.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { resourcePath, toCollectionParams } from '@api';
import type {
  Announcement,
  CollectionQuery,
  CreateAnnouncementPayload,
  PaginatedResult,
  UpdateAnnouncementPayload,
} from '@types';

export class AnnouncementService extends BaseService {
  protected readonly resource = 'announcements';

  /** Retrieves the current user's visible announcement feed. */
  async getFeed(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Announcement>> {
    return this.fetchCollection<Announcement>(query, options);
  }

  /** Retrieves a single announcement, if visible to the current user. */
  async getAnnouncement(
    id: string,
    options?: ReadOptions
  ): Promise<Announcement> {
    return this.fetchOne<Announcement>(id, options);
  }

  /** Retrieves the announcements owned by a specific course. */
  async getCourseAnnouncements(
    courseId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Announcement>> {
    return this.client.get<PaginatedResult<Announcement>>(
      resourcePath('courses', courseId, 'announcements'),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
  }

  /** Creates a course-scoped announcement (starts as a draft). */
  async createAnnouncement(
    courseId: string,
    payload: CreateAnnouncementPayload,
    options?: WriteOptions
  ): Promise<Announcement> {
    return this.client.post<Announcement, CreateAnnouncementPayload>(
      resourcePath('courses', courseId, 'announcements'),
      payload,
      options
    );
  }

  /** Updates a course-scoped announcement. */
  async updateAnnouncement(
    courseId: string,
    announcementId: string,
    payload: UpdateAnnouncementPayload,
    options?: WriteOptions
  ): Promise<Announcement> {
    return this.client.patch<Announcement, UpdateAnnouncementPayload>(
      resourcePath('courses', courseId, 'announcements', announcementId),
      payload,
      options
    );
  }

  /** Publishes a course-scoped announcement. */
  async publishAnnouncement(
    courseId: string,
    announcementId: string,
    options?: WriteOptions
  ): Promise<Announcement> {
    return this.client.post<Announcement, undefined>(
      resourcePath(
        'courses',
        courseId,
        'announcements',
        announcementId,
        'publish'
      ),
      undefined,
      options
    );
  }

  /** Archives a course-scoped announcement. */
  async archiveAnnouncement(
    courseId: string,
    announcementId: string,
    options?: WriteOptions
  ): Promise<Announcement> {
    return this.client.post<Announcement, undefined>(
      resourcePath(
        'courses',
        courseId,
        'announcements',
        announcementId,
        'archive'
      ),
      undefined,
      options
    );
  }

  /** Academy-wide announcements, newest first — the authoring list, not the reader's feed. */
  async getAcademyAnnouncements(
    academyId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Announcement>> {
    return this.client.get<PaginatedResult<Announcement>>(
      resourcePath('academies', academyId, 'announcements'),
      { ...options, params: toCollectionParams(query) }
    );
  }

  /** Creates an academy-wide announcement. */
  async createAcademyAnnouncement(
    academyId: string,
    payload: CreateAnnouncementPayload,
    options?: WriteOptions
  ): Promise<Announcement> {
    return this.client.post<Announcement, CreateAnnouncementPayload>(
      resourcePath('academies', academyId, 'announcements'),
      payload,
      options
    );
  }

  /** Updates an academy-wide announcement. */
  async updateAcademyAnnouncement(
    academyId: string,
    announcementId: string,
    payload: UpdateAnnouncementPayload,
    options?: WriteOptions
  ): Promise<Announcement> {
    return this.client.patch<Announcement, UpdateAnnouncementPayload>(
      resourcePath('academies', academyId, 'announcements', announcementId),
      payload,
      options
    );
  }

  /** Publishes an academy-wide announcement. */
  async publishAcademyAnnouncement(
    academyId: string,
    announcementId: string,
    options?: WriteOptions
  ): Promise<Announcement> {
    return this.client.post<Announcement, undefined>(
      resourcePath(
        'academies',
        academyId,
        'announcements',
        announcementId,
        'publish'
      ),
      undefined,
      options
    );
  }

  /** Archives an academy-wide announcement. */
  async archiveAcademyAnnouncement(
    academyId: string,
    announcementId: string,
    options?: WriteOptions
  ): Promise<Announcement> {
    return this.client.post<Announcement, undefined>(
      resourcePath(
        'academies',
        academyId,
        'announcements',
        announcementId,
        'archive'
      ),
      undefined,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const announcementService = new AnnouncementService();
