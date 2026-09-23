/**
 * Course review domain types (P64 Phase 4). Mirrors the backend
 * `course-review.contract.ts`: a review is authored by an enrolled learner
 * (one per course+student), moderated by staff, and — once `approved` —
 * shown publicly. The aggregate `CourseRatingSummary` is computed over
 * approved reviews only.
 */

export type CourseReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CourseReview {
  readonly id: string;
  readonly courseId: string;
  readonly studentId: string;
  /** Display name of the author; present on the self, moderation and public views. */
  readonly studentName?: string;
  readonly rating: number;
  readonly body?: string;
  readonly status: CourseReviewStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Per-star histogram, keyed '1'..'5'. */
export type CourseRatingDistribution = Record<
  '1' | '2' | '3' | '4' | '5',
  number
>;

export interface CourseRatingSummary {
  readonly courseId: string;
  /** Mean over approved reviews, one decimal; 0 when there are none. */
  readonly averageRating: number;
  readonly totalReviews: number;
  readonly distribution: CourseRatingDistribution;
}

export interface CreateCourseReviewPayload {
  readonly rating: number;
  readonly body?: string;
}

export interface UpdateCourseReviewPayload {
  readonly rating?: number;
  readonly body?: string;
}

export const COURSE_REVIEW_MIN_RATING = 1;
export const COURSE_REVIEW_MAX_RATING = 5;
export const MAX_COURSE_REVIEW_BODY_LENGTH = 2000;
