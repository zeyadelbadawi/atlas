/**
 * Instructor domain types.
 *
 * The Instructor experience reuses Course, Enrollment, Progress, Quiz and
 * Assignment types wherever their existing shape already fits — these types
 * only cover what is genuinely new: teaching-scoped read models (an
 * instructor viewing courses/students they are authorized to teach, not
 * their own data) and the grading workflow.
 */
import type { CourseStatus, CourseVisibility } from './course.types';
import type { CourseCompletionState, CourseProgress } from './progress.types';
import type { EnrollmentStatus } from './enrollment.types';
import type { QuizAttempt } from './quiz.types';
import type { AssignmentSubmission } from './assignment.types';

/** Why a course is flagged as needing the instructor's attention. */
export type CourseAttentionReason =
  | 'pending_grading'
  | 'low_engagement'
  | 'no_recent_activity';

/** A course surfaced on the dashboard as needing attention. */
export interface CourseAttentionItem {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly reason: CourseAttentionReason;
}

/** The kind of event behind one activity feed entry. */
export type InstructorActivityType =
  | 'submission'
  | 'quiz_attempt'
  | 'enrollment'
  | 'completion';

/** One entry in the instructor's recent-activity feed. */
export interface InstructorActivityItem {
  readonly id: string;
  readonly type: InstructorActivityType;
  readonly courseId: string;
  readonly courseTitle: string;
  readonly studentName?: string;
  /** Server-supplied description, not a translation key — mirrors `AcademyActivity`. */
  readonly description: string;
  readonly timestamp: string;
}

/** Aggregated teaching metrics for the Instructor Dashboard. */
export interface InstructorDashboardMetrics {
  readonly assignedCoursesCount: number;
  readonly activeCoursesCount: number;
  readonly totalStudents: number;
  readonly pendingSubmissionsCount: number;
  readonly pendingGradingCount: number;
  readonly coursesRequiringAttention: readonly CourseAttentionItem[];
  readonly recentActivity: readonly InstructorActivityItem[];
}

/** A course this instructor is authorized to teach. */
export interface TeachingCourse {
  readonly courseId: string;
  readonly title: string;
  readonly thumbnail?: string;
  readonly status: CourseStatus;
  readonly visibility: CourseVisibility;
  /** Present only when the backend contract computes it. */
  readonly enrolledCount?: number;
  /** 0–100, present only when the backend contract computes it. */
  readonly averageProgress?: number;
  readonly requiresAttention: boolean;
}

/** Teaching-operations overview for one authorized course. */
export interface InstructorCourseOverview {
  readonly courseId: string;
  readonly title: string;
  readonly description?: string;
  readonly status: CourseStatus;
  readonly visibility: CourseVisibility;
  readonly enrolledCount: number;
  readonly averageProgress?: number;
  readonly totalSections: number;
  readonly totalLessons: number;
  readonly pendingSubmissionsCount: number;
  readonly pendingGradingCount: number;
  readonly recentActivity: readonly InstructorActivityItem[];
}

/** One roster entry — an enrolled student, as seen by an authorized instructor. */
export interface InstructorStudent {
  readonly studentId: string;
  readonly name: string;
  readonly email: string;
  readonly enrollmentStatus: EnrollmentStatus;
  readonly progressPercentage: number;
  readonly completionState: CourseCompletionState;
  readonly lastActivityAt?: string;
}

/** Grading state of a submission. */
export type GradingStatus = 'ungraded' | 'graded';

/** A grade entered by an authorized instructor. Scoring rules stay server-side. */
export interface Grade {
  readonly score?: number;
  readonly feedback?: string;
  readonly gradedAt?: string;
  readonly gradedBy?: string;
}

/** A quiz attempt as seen by an authorized instructor — `QuizAttempt` plus the student's identity for roster display. */
export interface QuizAttemptSummary extends QuizAttempt {
  readonly studentName: string;
}

/**
 * An assignment submission as seen by an authorized instructor — the same
 * `AssignmentSubmission` extended with the submitting student's identity
 * (for roster display) and grading state.
 */
export interface AssignmentSubmissionReview extends AssignmentSubmission {
  readonly studentName: string;
  readonly gradingStatus: GradingStatus;
  readonly grade?: Grade;
}

/** Grades a submission. Only the fields the instructor enters — no scoring logic. */
export interface GradeSubmissionPayload {
  readonly score?: number;
  readonly feedback?: string;
}

/**
 * One student's detailed, course-scoped progress as seen by an authorized
 * instructor — read-only. Reuses `CourseProgress`/`QuizAttempt` verbatim;
 * only submissions gain grading state via `AssignmentSubmissionReview`.
 */
export interface InstructorStudentProgress {
  readonly studentId: string;
  readonly studentName: string;
  readonly courseId: string;
  readonly enrollmentStatus: EnrollmentStatus;
  readonly progress: CourseProgress;
  readonly quizAttempts: readonly QuizAttempt[];
  readonly assignmentSubmissions: readonly AssignmentSubmissionReview[];
}
