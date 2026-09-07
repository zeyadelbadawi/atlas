/**
 * Course Content Service.
 *
 * The student-facing curriculum read (`courses/:courseId/sections`) —
 * the sibling of `ProgressService`/`QuizService` on this same flat
 * `courses/:courseId/...` tree, reached by course id alone (never an
 * academy id). Added because `LessonPage`/`CourseLearnRedirectPage`
 * previously (mis)reused `CourseService.getCourseSections`
 * (`academies/:academyId/courses/:courseId/sections`, the owner/
 * instructor-authoring tree, `@features/course`) — a real, enrolled
 * student is never an organization member of the Academy, so that call
 * 403'd every genuine student the moment they opened a lesson. This
 * service is the correct, enrollment-gated counterpart; `CourseService`
 * itself is untouched (its own authoring pages still need it exactly as
 * before).
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { CourseSection, PaginatedResult } from '@types';

export class CourseContentService extends BaseService {
  protected readonly resource = 'courses';

  /** Retrieves the current student's (or course instructor's) view of a course's curriculum — published lessons only. */
  async getSections(
    courseId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<CourseSection>> {
    return this.client.get<PaginatedResult<CourseSection>>(
      this.path(courseId, 'sections'),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const courseContentService = new CourseContentService();
