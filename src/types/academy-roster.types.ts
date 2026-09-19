/**
 * Academy student roster types (P64 Phase 1).
 *
 * A "student" is NOT an academy team member (`AcademyMember`) — students
 * register through the academy's own public website and are tracked by
 * a learner-membership row. These types describe the Owner/Manager
 * (and, read-only, the assigned Instructor) view of that roster, plus the
 * academy's registration policy and invite links that control how new
 * students get in.
 *
 * Every shape mirrors the backend contract verbatim; nothing here is
 * derived on the client.
 */
import type { CourseStatus } from './course.types';
import type { CourseCompletionState } from './progress.types';
import type { AssignmentSubmissionStatus } from './assignment.types';
import type { QuizAttemptStatus } from './quiz.types';
import type { GradingStatus } from './instructor.types';
import type { PaginatedResult, PaginationMeta } from './api.types';

/** Learner-membership state on the academy — `blocked` is a separate flag. */
export type AcademyMembershipStatus = 'active' | 'inactive' | 'pending';

/** Roster status filter — `blocked` is a filter on the flag, not a fourth status. */
export type AcademyRosterStatusFilter =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'blocked';

export type AcademyRosterSortBy = 'joinedAt' | 'lastActivityAt' | 'name';
export type AcademyRosterSortDir = 'asc' | 'desc';

/** Query accepted by `GET academies/:id/students`. */
export interface AcademyRosterQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly status?: AcademyRosterStatusFilter;
  readonly courseId?: string;
  readonly sortBy?: AcademyRosterSortBy;
  readonly sortDir?: AcademyRosterSortDir;
}

/** One roster row. */
export interface AcademyRosterStudent {
  readonly membershipId: string;
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly avatar?: string;
  readonly accountStatus: string;
  readonly emailVerified: boolean;
  readonly membershipStatus: AcademyMembershipStatus;
  readonly blocked: boolean;
  readonly blockedAt?: string;
  readonly blockedReason?: string;
  /** How the learner joined (e.g. `website`, `invite`, `manual`). Server vocabulary; rendered with a fallback label. */
  readonly source: string;
  readonly joinedAt: string;
  readonly lastActivityAt?: string;
  readonly enrollmentCount: number;
  readonly activeEnrollmentCount: number;
}

export type AcademyRosterPage = PaginatedResult<AcademyRosterStudent>;

/** Progress snapshot attached to a roster enrollment. */
export interface RosterEnrollmentProgress {
  readonly completedLessons: number;
  readonly totalLessons: number;
  readonly percentage: number;
  readonly completionState: CourseCompletionState;
  readonly certificateStatus: string;
}

/** Why an enrollment was revoked. */
export type RosterEnrollmentRevokeReason =
  | 'manual'
  | 'membership_ended'
  | 'suspended';

/** One enrollment as seen on the roster detail. */
export interface RosterEnrollment {
  readonly id: string;
  readonly courseId: string;
  readonly courseTitle: string;
  readonly courseSlug: string;
  readonly courseStatus: CourseStatus;
  readonly status: string;
  readonly isActive: boolean;
  readonly accessSource: string;
  readonly enrolledAt?: string;
  readonly completedAt?: string;
  readonly expiresAt?: string;
  readonly revokedAt?: string;
  readonly revokeReason?: RosterEnrollmentRevokeReason | string;
  readonly progress?: RosterEnrollmentProgress;
}

export interface RosterQuizOutcome {
  readonly attemptId: string;
  readonly quizId: string;
  readonly quizTitle: string;
  readonly courseId: string;
  readonly attemptNumber: number;
  readonly status: QuizAttemptStatus;
  readonly score: number | null;
  readonly passed: boolean | null;
  readonly submittedAt: string | null;
}

export interface RosterAssignmentOutcome {
  readonly submissionId: string;
  readonly assignmentId: string;
  readonly assignmentTitle: string;
  readonly courseId: string;
  readonly status: AssignmentSubmissionStatus;
  readonly gradingStatus: GradingStatus;
  readonly score: number | null;
  readonly hasFeedback: boolean;
  readonly submittedAt: string | null;
  readonly gradedAt: string | null;
}

/**
 * Who is looking. `academy` = Owner/Manager (full management);
 * `assigned_courses` = an Instructor who only sees this learner through
 * the courses they teach — read-only, no management actions.
 */
export type AcademyRosterViewerScope = 'academy' | 'assigned_courses';

/** `GET academies/:id/students/:userId`. */
export interface AcademyStudentDetail {
  readonly student: AcademyRosterStudent;
  readonly enrollments: readonly RosterEnrollment[];
  readonly quizOutcomes: readonly RosterQuizOutcome[];
  readonly assignmentOutcomes: readonly RosterAssignmentOutcome[];
  readonly activeSessionCount: number;
  readonly viewerScope: AcademyRosterViewerScope;
}

export interface BlockAcademyStudentPayload {
  readonly reason?: string;
}

export interface EnrollAcademyStudentPayload {
  readonly courseId: string;
  /** ISO timestamp. */
  readonly expiresAt?: string;
}

export interface RevokeRosterEnrollmentPayload {
  readonly reason?: RosterEnrollmentRevokeReason;
}

export interface UpdateRosterEnrollmentExpiryPayload {
  /** ISO timestamp, or `null` to clear the expiry. */
  readonly expiresAt: string | null;
}

/** How new learners get onto the academy. */
export type AcademyRegistrationPolicy = 'open' | 'invite' | 'approval';

export interface AcademyRegistrationPolicySettings {
  readonly academyId: string;
  readonly registrationPolicy: AcademyRegistrationPolicy;
}

export interface UpdateAcademyRegistrationPolicyPayload {
  readonly registrationPolicy: AcademyRegistrationPolicy;
}

/** One invite link — the raw token is never returned on a list read. */
export interface AcademyInvite {
  readonly id: string;
  readonly academyId: string;
  readonly email?: string;
  readonly maxUses: number;
  readonly usedCount: number;
  readonly expiresAt: string;
  readonly revokedAt?: string;
  readonly createdAt: string;
}

/** `POST academies/:id/invites` — the raw `token` is shown exactly once. */
export interface CreatedAcademyInvite extends AcademyInvite {
  readonly token: string;
}

export interface CreateAcademyInvitePayload {
  readonly email?: string;
  readonly maxUses?: number;
  readonly expiresInDays?: number;
}

/** Re-exported so roster consumers need one import for pagination meta. */
export type AcademyRosterPagination = PaginationMeta;
