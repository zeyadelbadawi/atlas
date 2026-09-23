/**
 * Course Review Moderation Service (P64 Phase 4) — the staff side of course
 * reviews. The course's reviewer (assigned instructor, or the owning
 * academy's owner/administrator/manager) lists every status of a course's
 * reviews and approves/rejects/removes them. Authorization is enforced
 * server-side (`assertCanReviewCourse` + `course_reviews_*` RLS); this
 * service is a thin transport over those routes.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { toCollectionParams } from '@api';
import type {
  CollectionQuery,
  CourseReview,
  CourseReviewStatus,
  PaginatedResult,
} from '@types';

export interface ModerationReviewQuery extends CollectionQuery {
  readonly status?: CourseReviewStatus;
}

export class CourseReviewModerationService extends BaseService {
  protected readonly resource = 'courses';

  /** Every status of a course's reviews, for its reviewer. */
  async list(
    courseId: string,
    query?: ModerationReviewQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<CourseReview>> {
    return this.client.get<PaginatedResult<CourseReview>>(
      this.path(courseId, 'reviews', 'moderation'),
      {
        ...options,
        params: {
          ...toCollectionParams(query),
          ...(query?.status ? { status: query.status } : {}),
          ...options?.params,
        },
      }
    );
  }

  async approve(
    courseId: string,
    reviewId: string,
    options?: WriteOptions
  ): Promise<CourseReview> {
    return this.client.post<CourseReview, undefined>(
      this.path(courseId, 'reviews', reviewId, 'approve'),
      undefined,
      options
    );
  }

  async reject(
    courseId: string,
    reviewId: string,
    options?: WriteOptions
  ): Promise<CourseReview> {
    return this.client.post<CourseReview, undefined>(
      this.path(courseId, 'reviews', reviewId, 'reject'),
      undefined,
      options
    );
  }

  async remove(
    courseId: string,
    reviewId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(
      this.path(courseId, 'reviews', reviewId),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const courseReviewModerationService =
  new CourseReviewModerationService();
