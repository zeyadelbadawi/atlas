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

/** P64 Phase 4 — catalog difficulty level. */
export type CourseLevel =
  'beginner' | 'intermediate' | 'advanced' | 'all_levels';

export const COURSE_LEVEL_VALUES: readonly CourseLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'all_levels',
];

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
  /**
   * P52 — the unified, ordered curriculum of this unit (lessons + quizzes +
   * assignments in one shared order). Present on the student curriculum read;
   * the authoring builder loads items per-unit via `getUnitItems`.
   */
  readonly items?: readonly CurriculumItem[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The type of a unified curriculum item (P52). */
export type CurriculumItemType =
  'lesson' | 'quiz' | 'assignment' | 'live_session';

/** One item in a unit's unified ordered sequence — a projection over the existing entities. */
export interface CurriculumItem {
  readonly id: string;
  readonly type: CurriculumItemType;
  readonly title: string;
  readonly order: number;
  readonly status: string;
  readonly sectionId: string;
}

/** A course-level quiz/assignment that can be attached to a unit. */
export interface AvailableCurriculumItem {
  readonly id: string;
  readonly type: 'quiz' | 'assignment';
  readonly title: string;
  readonly status: string;
  readonly sectionId: string | null;
}

/**
 * Curriculum-shape summary, used by list views that don't load full sections.
 *
 * The four optional fields mirror what the PUBLIC course list/detail
 * (`GET /public/websites/:academyId/courses[/:id]`) adds for catalog cards
 * (P64 Phase 4). They are optional because the tenant-scoped list does not
 * compute them; a consumer must treat their absence as "unknown", not zero.
 */
export interface CourseStats {
  readonly totalSections: number;
  readonly totalLessons: number;
  /** Sum of lesson durations; `null` when no lesson carries a duration. */
  readonly durationSeconds?: number | null;
  /** Whether at least one lesson is an open (free) preview. */
  readonly hasPreview?: boolean;
  /** Approved-review average, 0..5 to one decimal; `0` when there are none. */
  readonly averageRating?: number;
  /** Count of approved reviews behind `averageRating`. */
  readonly totalReviews?: number;
  /** Published quizzes / assignments — a course can be quizzes only. */
  readonly totalQuizzes?: number;
  readonly totalAssignments?: number;
}

/** A curriculum-preview lesson — the public Course Details page's pre-enrollment view: title/order/type only, never `contentUrl`/`description` (see backend `toPublicCourseCurriculumResponse`'s doc comment for why those stay gated). */
export interface PublicCourseCurriculumLesson {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly contentType: CourseLessonContentType;
  /**
   * The free sample. The backend serves this lesson's content to anonymous
   * visitors (`LessonContentService.getContent`'s `isOpenPreview`
   * short-circuit), so the page may offer to play it before enrolment.
   */
  readonly isPreview: boolean;
}

/** A curriculum-preview section, paired with `PublicCourseCurriculumLesson`. */
export interface PublicCourseCurriculumSection {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly lessons: readonly PublicCourseCurriculumLesson[];
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
  // P64 Phase 4 — catalog metadata (all optional; empty arrays when unset).
  readonly level?: CourseLevel;
  readonly language?: string;
  readonly outcomes?: readonly string[];
  readonly requirements?: readonly string[];
  readonly introVideoAssetId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publishedAt?: string;
}

/**
 * Filters accepted by the course list. Sent FLAT by `toCollectionParams`
 * (`?level=beginner&pricingType=free…`), which is exactly how the backend's
 * public catalog reads them. Every field is optional, so adding one never
 * affects an existing caller.
 */
export interface CourseFilters {
  readonly status?: CourseStatus;
  readonly visibility?: CourseVisibility;
  readonly categoryId?: string;
  readonly pricingType?: CoursePricingType;
  // P64 Phase 4 — public catalog filters (`CourseCatalogSection`).
  readonly level?: CourseLevel;
  /** Course language code as authored on the course (e.g. `en`, `ar`). */
  readonly language?: string;
  /** Inclusive price bound, in minor units (e.g. cents). */
  readonly priceMin?: number;
  /** Inclusive price bound, in minor units (e.g. cents). */
  readonly priceMax?: number;
  /**
   * Exactly these course ids, comma-separated (a Featured Courses block in
   * "selected" mode). The public catalog bounds it to 50 and still returns
   * only published, public courses.
   */
  readonly ids?: string;
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
  // P64 Phase 4 catalog metadata.
  readonly level?: CourseLevel;
  readonly language?: string;
  readonly outcomes?: readonly string[];
  readonly requirements?: readonly string[];
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
  // P64 Phase 4 catalog metadata.
  readonly level?: CourseLevel;
  readonly language?: string;
  readonly outcomes?: readonly string[];
  readonly requirements?: readonly string[];
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
