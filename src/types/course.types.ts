/**
 * Course domain types.
 *
 * Course Management lets an academy create and organize educational content
 * (courses, sections, lessons). It intentionally stops at content authoring —
 * student consumption, enrollment, payments and certificates are separate,
 * future modules and are not represented here.
 */
import type { CollectionQuery } from './api.types';

/** Course lifecycle status. */
export type CourseStatus = 'draft' | 'published' | 'archived';

/** Who can see a course. Independent of user authorization. */
export type CourseVisibility = 'public' | 'private';

/** Whether a course is free or paid. No payment processing is implied. */
export type CoursePricingType = 'free' | 'paid';

/** Backend-agnostic pricing representation. */
export interface CoursePricing {
  readonly type: CoursePricingType;
  /** Present only when `type` is `paid`. */
  readonly amount?: number;
  /** ISO 4217 currency code. Present only when `type` is `paid`. */
  readonly currency?: string;
}

/** A category used to organize an academy's courses. */
export interface CourseCategory {
  readonly id: string;
  readonly academyId: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  /** Number of courses in this category, when the backend reports it. */
  readonly courseCount?: number;
}

/** Minimal instructor reference shown on a course. */
export interface CourseInstructorSummary {
  readonly id: string;
  readonly name: string;
  readonly avatar?: string;
}

/** The kind of content a lesson holds. Content storage stays abstract. */
export type CourseLessonContentType = 'text' | 'video' | 'file';

/** Whether a lesson is visible as part of the published course. */
export type CourseLessonStatus = 'draft' | 'published';

/** A single lesson within a course section. */
export interface CourseLesson {
  readonly id: string;
  readonly courseId: string;
  readonly sectionId: string;
  readonly title: string;
  readonly description?: string;
  /** Position within its section, 0-based. */
  readonly order: number;
  readonly contentType: CourseLessonContentType;
  /** URL to the lesson's content/resource, when applicable. */
  readonly contentUrl?: string;
  readonly status: CourseLessonStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A section grouping lessons within a course's curriculum. */
export interface CourseSection {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly description?: string;
  /** Position within the course, 0-based. */
  readonly order: number;
  readonly lessons: readonly CourseLesson[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Curriculum-shape summary, used by list views that don't load full sections. */
export interface CourseStats {
  readonly totalSections: number;
  readonly totalLessons: number;
}

/** Course entity. */
export interface Course {
  readonly id: string;
  readonly academyId: string;
  readonly title: string;
  readonly slug: string;
  readonly description?: string;
  readonly shortDescription?: string;
  readonly thumbnail?: string;
  readonly status: CourseStatus;
  readonly visibility: CourseVisibility;
  readonly pricing: CoursePricing;
  readonly categoryId?: string;
  readonly category?: CourseCategory;
  readonly instructors: readonly CourseInstructorSummary[];
  readonly stats?: CourseStats;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publishedAt?: string;
}

/** Filters accepted by the course list. */
export interface CourseFilters {
  readonly status?: CourseStatus;
  readonly visibility?: CourseVisibility;
  readonly categoryId?: string;
  readonly pricingType?: CoursePricingType;
}

/** Course collection query, narrowing `filters` to the course domain. */
export type CourseListQuery = Omit<CollectionQuery, 'filters'> & {
  readonly filters?: CourseFilters;
};

/** Course creation payload. */
export interface CreateCoursePayload {
  readonly title: string;
  readonly slug: string;
  readonly shortDescription?: string;
  readonly description?: string;
  readonly thumbnail?: string;
  readonly categoryId?: string;
  readonly pricing: CoursePricing;
  readonly visibility: CourseVisibility;
}

/**
 * Grants course-level instructor access (Phase 3 — Instructor <-> Course
 * Assignment). `userId` must already be an active `instructor`-role
 * member of the SAME academy that owns the course; see
 * `CourseInstructorsCard`'s doc comment for why this is a distinct action
 * from academy-wide instructor roster membership.
 */
export interface AssignCourseInstructorPayload {
  readonly userId: string;
}

/** Course update payload. */
export interface UpdateCoursePayload {
  readonly title?: string;
  readonly slug?: string;
  readonly shortDescription?: string;
  readonly description?: string;
  readonly thumbnail?: string;
  readonly categoryId?: string;
  readonly pricing?: CoursePricing;
  readonly visibility?: CourseVisibility;
  readonly status?: CourseStatus;
}

/** Course section creation payload. */
export interface CreateCourseSectionPayload {
  readonly title: string;
  readonly description?: string;
}

/** Course section update payload. */
export interface UpdateCourseSectionPayload {
  readonly title?: string;
  readonly description?: string;
}

/** Course lesson creation payload. */
export interface CreateCourseLessonPayload {
  readonly title: string;
  readonly description?: string;
  readonly contentType: CourseLessonContentType;
  readonly contentUrl?: string;
  readonly status?: CourseLessonStatus;
}

/** Course lesson update payload. */
export interface UpdateCourseLessonPayload {
  readonly title?: string;
  readonly description?: string;
  readonly contentType?: CourseLessonContentType;
  readonly contentUrl?: string;
  readonly status?: CourseLessonStatus;
}

/** Reorders a flat list of curriculum items (sections, or lessons within a section). */
export interface ReorderItemsPayload {
  /** Item ids in their new order. */
  readonly orderedIds: readonly string[];
}
