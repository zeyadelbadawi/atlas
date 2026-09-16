/**
 * Platform Course Service (P60).
 *
 * The Platform Owner's cross-tenant course console, on the deliberately
 * distinct resource `platform-courses` rather than the tenant-scoped
 * `courses` resource `CourseService` already owns — the same separation
 * `PlatformAcademyService` makes, and for the same reason: an unfiltered
 * cross-tenant list and an organization-scoped one must not be
 * indistinguishable by path.
 *
 * Read-only. The backend defines no platform-side course mutation.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  CollectionQuery,
  PaginatedResult,
  PlatformCourseDetail,
  PlatformCourseFilters,
  PlatformCourseSummary,
} from '@types';

export class PlatformCourseService extends BaseService {
  protected readonly resource = 'platform-courses';

  /**
   * Courses across every academy and organization.
   *
   * Filters travel as query parameters and are applied by Postgres, not by
   * the browser — the list is platform-wide, so client-side filtering would
   * only ever narrow the current page rather than the real result set.
   */
  async getCourses(
    query?: CollectionQuery & PlatformCourseFilters,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformCourseSummary>> {
    return this.fetchCollection<PlatformCourseSummary>(query, options);
  }

  /** One course's full cross-tenant detail view. */
  async getCourse(
    courseId: string,
    options?: ReadOptions
  ): Promise<PlatformCourseDetail> {
    return this.fetchOne<PlatformCourseDetail>(courseId, options);
  }
}

export const platformCourseService = new PlatformCourseService();
