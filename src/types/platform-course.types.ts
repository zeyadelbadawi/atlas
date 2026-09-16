/**
 * Global Course Console types (P60).
 *
 * The Platform Owner's cross-tenant view of every course on Atlas —
 * distinct from `Course` (`course.types.ts`), which is one academy's own
 * record fetched through the tenant-scoped `courses` resource. This file
 * does not redeclare `Course`; it composes a cross-tenant summary/detail
 * shape and reuses `CourseStatus`/`CourseVisibility`/`CoursePricingType`
 * verbatim rather than inventing a second vocabulary for the same values.
 *
 * Read-only, like `platform-academy.types.ts`: course authoring belongs to
 * the academy that owns the course, and the backend exposes no platform
 * write route to mutate it.
 *
 * `createdBy: null` IS THE DATA. A course created before Atlas recorded
 * creators has no provable author, and the console says "Not recorded"
 * rather than guessing at the academy owner. Treat `null` as a fact to
 * render, never as a missing field to paper over.
 */
import type {
  CoursePricingType,
  CourseStatus,
  CourseVisibility,
} from './course.types';

export interface PlatformCourseCreator {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface PlatformCourseInstructor {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string;
}

/** One row in the Platform Owner's cross-tenant course list. */
export interface PlatformCourseSummary {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: CourseStatus;
  readonly visibility: CourseVisibility;
  readonly pricingType: CoursePricingType;
  readonly pricingAmount?: number;
  readonly pricingCurrency?: string;
  readonly academyId: string;
  readonly academyName: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly categoryName?: string;
  readonly createdBy: PlatformCourseCreator | null;
  readonly enrolledStudents: number;
  readonly createdAt: string;
  readonly publishedAt?: string;
}

export interface PlatformCourseDetail extends PlatformCourseSummary {
  readonly shortDescription?: string;
  readonly description?: string;
  readonly thumbnailUrl?: string;
  readonly updatedAt: string;
  readonly totalSections: number;
  readonly totalLessons: number;
  readonly completedStudents: number;
  /** Paid course orders — the existing commerce record, not a new concept. */
  readonly paidOrders: number;
  readonly instructors: readonly PlatformCourseInstructor[];
}

/**
 * Server-side filters for the global list. Mirrors
 * `ListPlatformCoursesQueryDto` exactly — the backend's `ValidationPipe`
 * rejects any key not declared there, so an extra field here is a 400, not
 * a silently ignored filter.
 */
export interface PlatformCourseFilters {
  readonly status?: CourseStatus;
  readonly visibility?: CourseVisibility;
  readonly pricingType?: CoursePricingType;
  readonly academyId?: string;
  readonly organizationId?: string;
}

export type PlatformCourseSortField =
  | 'title'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt';
