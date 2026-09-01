/**
 * Course Service.
 *
 * Manages course CRUD, curriculum (sections/lessons), categories, ordering
 * and the publish/unpublish workflow. Every course belongs to a specific
 * academy, so every operation is nested under that academy's resource path —
 * the same nesting pattern `AcademyService` already uses for members, stats
 * and activity. Extends BaseService to keep the same architectural contract.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { resourcePath, toCollectionParams } from '@api';
import type {
  AssignCourseInstructorPayload,
  Course,
  CourseCategory,
  CourseLesson,
  CourseListQuery,
  CourseSection,
  CreateCourseLessonPayload,
  CreateCoursePayload,
  CreateCourseSectionPayload,
  PaginatedResult,
  ReorderItemsPayload,
  UpdateCourseLessonPayload,
  UpdateCoursePayload,
  UpdateCourseSectionPayload,
} from '@types';

export class CourseService extends BaseService {
  // Every course endpoint is nested under a specific academy, so the base
  // resource is `academies` — the same prefix `AcademyService` uses for its
  // own sub-resources — and each method appends `:academyId/courses/...`.
  protected readonly resource = 'academies';

  private coursesPath(academyId: string, ...segments: readonly string[]): string {
    return this.path(academyId, 'courses', ...segments);
  }

  /**
   * Discovers published, publicly visible courses across every academy.
   *
   * This is the one endpoint in Course Management that is *not* nested
   * under a specific academy — Student Learning needs a cross-academy
   * catalog, which the owner-facing `academies/:id/courses` shape cannot
   * express. Each returned `Course` still carries its own `academyId`, so
   * callers can reach the existing academy-scoped endpoints once a course
   * has been chosen (see `getCourse`, `getCourseSections`).
   */
  async discoverCourses(
    query?: CourseListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Course>> {
    return this.client.get<PaginatedResult<Course>>(resourcePath('courses'), {
      ...options,
      params: { ...toCollectionParams(query), ...options?.params },
    });
  }

  /**
   * Retrieves a single published, publicly visible course by id alone,
   * regardless of which academy owns it — the singular counterpart to
   * `discoverCourses`, for the student-facing course details page reached
   * before the student has enrolled (and so before an academy id is known).
   */
  async discoverCourse(
    courseId: string,
    options?: ReadOptions
  ): Promise<Course> {
    return this.client.get<Course>(
      resourcePath('courses', courseId),
      options
    );
  }

  /** Retrieves a page of courses for an academy. */
  async getCourses(
    academyId: string,
    query?: CourseListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Course>> {
    return this.client.get<PaginatedResult<Course>>(
      this.coursesPath(academyId),
      { ...options, params: { ...toCollectionParams(query), ...options?.params } }
    );
  }

  /** Retrieves a single course by id. */
  async getCourse(
    academyId: string,
    courseId: string,
    options?: ReadOptions
  ): Promise<Course> {
    return this.client.get<Course>(
      this.coursesPath(academyId, courseId),
      options
    );
  }

  /** Creates a new course. */
  async createCourse(
    academyId: string,
    payload: CreateCoursePayload,
    options?: WriteOptions
  ): Promise<Course> {
    return this.client.post<Course, CreateCoursePayload>(
      this.coursesPath(academyId),
      payload,
      options
    );
  }

  /** Updates an existing course. */
  async updateCourse(
    academyId: string,
    courseId: string,
    payload: UpdateCoursePayload,
    options?: WriteOptions
  ): Promise<Course> {
    return this.client.patch<Course, UpdateCoursePayload>(
      this.coursesPath(academyId, courseId),
      payload,
      options
    );
  }

  /** Deletes a course. */
  async deleteCourse(
    academyId: string,
    courseId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(
      this.coursesPath(academyId, courseId),
      options
    );
  }

  /** Publishes a course, making it visible per its configured visibility. */
  async publishCourse(
    academyId: string,
    courseId: string,
    options?: WriteOptions
  ): Promise<Course> {
    return this.client.post<Course, undefined>(
      this.coursesPath(academyId, courseId, 'publish'),
      undefined,
      options
    );
  }

  /** Reverts a published course back to draft. */
  async unpublishCourse(
    academyId: string,
    courseId: string,
    options?: WriteOptions
  ): Promise<Course> {
    return this.client.post<Course, undefined>(
      this.coursesPath(academyId, courseId, 'unpublish'),
      undefined,
      options
    );
  }

  /**
   * Grants course-level instructor access (Phase 3). The target must
   * already be an active `instructor`-role member of this academy — see
   * `AssignCourseInstructorPayload`'s doc comment.
   */
  async assignCourseInstructor(
    academyId: string,
    courseId: string,
    payload: AssignCourseInstructorPayload,
    options?: WriteOptions
  ): Promise<Course> {
    return this.client.post<Course, AssignCourseInstructorPayload>(
      this.coursesPath(academyId, courseId, 'instructors'),
      payload,
      options
    );
  }

  /** Revokes course-level instructor access. Does not affect the instructor's Academy roster membership. */
  async removeCourseInstructor(
    academyId: string,
    courseId: string,
    userId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(
      this.coursesPath(academyId, courseId, 'instructors', userId),
      options
    );
  }

  /** Retrieves an academy's course categories. */
  async getCourseCategories(
    academyId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<CourseCategory>> {
    return this.client.get<PaginatedResult<CourseCategory>>(
      this.path(academyId, 'course-categories'),
      options
    );
  }

  /** Retrieves a single course category. */
  async getCourseCategory(
    academyId: string,
    categoryId: string,
    options?: ReadOptions
  ): Promise<CourseCategory> {
    return this.client.get<CourseCategory>(
      this.path(academyId, 'course-categories', categoryId),
      options
    );
  }

  /** Retrieves a course's curriculum (sections with their nested lessons). */
  async getCourseSections(
    academyId: string,
    courseId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<CourseSection>> {
    return this.client.get<PaginatedResult<CourseSection>>(
      this.coursesPath(academyId, courseId, 'sections'),
      options
    );
  }

  /** Creates a course section. */
  async createCourseSection(
    academyId: string,
    courseId: string,
    payload: CreateCourseSectionPayload,
    options?: WriteOptions
  ): Promise<CourseSection> {
    return this.client.post<CourseSection, CreateCourseSectionPayload>(
      this.coursesPath(academyId, courseId, 'sections'),
      payload,
      options
    );
  }

  /** Updates a course section. */
  async updateCourseSection(
    academyId: string,
    courseId: string,
    sectionId: string,
    payload: UpdateCourseSectionPayload,
    options?: WriteOptions
  ): Promise<CourseSection> {
    return this.client.patch<CourseSection, UpdateCourseSectionPayload>(
      this.coursesPath(academyId, courseId, 'sections', sectionId),
      payload,
      options
    );
  }

  /** Deletes a course section and its lessons. */
  async deleteCourseSection(
    academyId: string,
    courseId: string,
    sectionId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(
      this.coursesPath(academyId, courseId, 'sections', sectionId),
      options
    );
  }

  /** Persists a new section order for a course. */
  async reorderCourseSections(
    academyId: string,
    courseId: string,
    payload: ReorderItemsPayload,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.patch<void, ReorderItemsPayload>(
      this.coursesPath(academyId, courseId, 'sections', 'order'),
      payload,
      options
    );
  }

  /** Creates a lesson within a section. */
  async createCourseLesson(
    academyId: string,
    courseId: string,
    sectionId: string,
    payload: CreateCourseLessonPayload,
    options?: WriteOptions
  ): Promise<CourseLesson> {
    return this.client.post<CourseLesson, CreateCourseLessonPayload>(
      this.coursesPath(academyId, courseId, 'sections', sectionId, 'lessons'),
      payload,
      options
    );
  }

  /** Updates a lesson. */
  async updateCourseLesson(
    academyId: string,
    courseId: string,
    sectionId: string,
    lessonId: string,
    payload: UpdateCourseLessonPayload,
    options?: WriteOptions
  ): Promise<CourseLesson> {
    return this.client.patch<CourseLesson, UpdateCourseLessonPayload>(
      this.coursesPath(
        academyId,
        courseId,
        'sections',
        sectionId,
        'lessons',
        lessonId
      ),
      payload,
      options
    );
  }

  /** Deletes a lesson. */
  async deleteCourseLesson(
    academyId: string,
    courseId: string,
    sectionId: string,
    lessonId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(
      this.coursesPath(
        academyId,
        courseId,
        'sections',
        sectionId,
        'lessons',
        lessonId
      ),
      options
    );
  }

  /** Persists a new lesson order within a section. */
  async reorderCourseLessons(
    academyId: string,
    courseId: string,
    sectionId: string,
    payload: ReorderItemsPayload,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.patch<void, ReorderItemsPayload>(
      this.coursesPath(
        academyId,
        courseId,
        'sections',
        sectionId,
        'lessons',
        'order'
      ),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const courseService = new CourseService();
