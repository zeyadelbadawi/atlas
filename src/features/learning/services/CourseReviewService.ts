/**
 * Course Review Service (P64 Phase 4) — the authenticated learner's own
 * review of a course. Every method addresses the CALLER's single review
 * (`.../reviews/mine`); nothing accepts a studentId, so there is no path
 * to another learner's review. The backend requires an active enrollment
 * to create and re-enters moderation (`pending`) on every write.
 */
import { BaseService } from '@services';
import type { WriteOptions, ReadOptions } from '@services';
import type {
  CourseReview,
  CreateCourseReviewPayload,
  UpdateCourseReviewPayload,
} from '@types';

export class CourseReviewService extends BaseService {
  protected readonly resource = 'courses';

  /** The caller's own review for a course, or `null` if they have none. */
  async getMyReview(
    courseId: string,
    options?: ReadOptions
  ): Promise<CourseReview | null> {
    return this.client.get<CourseReview | null>(
      this.path(courseId, 'reviews', 'mine'),
      options
    );
  }

  /** Create (or replace) the caller's review; requires an active enrollment. */
  async createMyReview(
    courseId: string,
    payload: CreateCourseReviewPayload,
    options?: WriteOptions
  ): Promise<CourseReview> {
    return this.client.post<CourseReview, CreateCourseReviewPayload>(
      this.path(courseId, 'reviews'),
      payload,
      options
    );
  }

  /** Edit the caller's own review; resets it to pending for re-moderation. */
  async updateMyReview(
    courseId: string,
    payload: UpdateCourseReviewPayload,
    options?: WriteOptions
  ): Promise<CourseReview> {
    return this.client.patch<CourseReview, UpdateCourseReviewPayload>(
      this.path(courseId, 'reviews', 'mine'),
      payload,
      options
    );
  }

  /** Delete the caller's own review. */
  async deleteMyReview(
    courseId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(
      this.path(courseId, 'reviews', 'mine'),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const courseReviewService = new CourseReviewService();
