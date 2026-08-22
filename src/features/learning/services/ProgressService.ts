/**
 * Progress Service.
 *
 * Reads and advances the current student's progress through a course.
 * Nested under a flat `courses/:courseId/...` path — the student-facing
 * sibling of `CourseService`'s owner-facing `academies/:academyId/courses`
 * tree. A student reaches a course by id (learned from their own
 * enrollment), never by academy id, so this tree deliberately does not
 * require one. Progress computation itself stays entirely server-side —
 * this service only reads and reports the states, never derives them.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { CompleteLessonPayload, CourseProgress } from '@types';

export class ProgressService extends BaseService {
  protected readonly resource = 'courses';

  /** Retrieves the current student's progress through a course. */
  async getCourseProgress(
    courseId: string,
    options?: ReadOptions
  ): Promise<CourseProgress> {
    return this.client.get<CourseProgress>(
      this.path(courseId, 'progress'),
      options
    );
  }

  /** Marks a lesson complete for the current student. */
  async completeLesson(
    courseId: string,
    payload: CompleteLessonPayload,
    options?: WriteOptions
  ): Promise<CourseProgress> {
    return this.client.post<CourseProgress, CompleteLessonPayload>(
      this.path(courseId, 'progress', 'complete-lesson'),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const progressService = new ProgressService();
