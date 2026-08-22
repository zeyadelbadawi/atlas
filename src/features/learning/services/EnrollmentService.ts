/**
 * Enrollment Service.
 *
 * Enrollment is always the current authenticated student's own — nothing in
 * this service accepts a studentId, so there is no code path that could
 * address another student's enrollment. Extends BaseService to keep the
 * same architectural contract as every other Atlas service.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CollectionQuery,
  CreateEnrollmentPayload,
  Enrollment,
  PaginatedResult,
} from '@types';

export class EnrollmentService extends BaseService {
  protected readonly resource = 'enrollments';

  /** Retrieves the current student's enrollments. */
  async getEnrollments(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Enrollment>> {
    return this.fetchCollection<Enrollment>(query, options);
  }

  /** Retrieves the current student's enrollment for a specific course, if any. */
  async getEnrollmentForCourse(
    courseId: string,
    options?: ReadOptions
  ): Promise<Enrollment | null> {
    return this.client.get<Enrollment | null>(
      this.path('by-course', courseId),
      options
    );
  }

  /** Enrolls the current student in a course. */
  async createEnrollment(
    payload: CreateEnrollmentPayload,
    options?: WriteOptions
  ): Promise<Enrollment> {
    return this.createOne<Enrollment, CreateEnrollmentPayload>(
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const enrollmentService = new EnrollmentService();
