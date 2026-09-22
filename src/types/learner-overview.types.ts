/**
 * The learner dashboard's read contracts (P64 Phase 2 §D.8/§E.1).
 *
 * A FIELD-FOR-FIELD MIRROR of the backend's
 * `src/learning/dto/learner-overview.contract.ts`. Nothing is widened,
 * renamed or made optional on the way across: the moment these two drift,
 * the dashboard renders `undefined` for a field the server is still
 * sending under its old name, and TypeScript says nothing because the
 * frontend type was the one that changed. Anyone editing this file should
 * open that one beside it.
 *
 * EVERY ONE OF THESE IS ACADEMY-SCOPED BY THE REQUEST HOST. There is no
 * `academyId` parameter on any of the endpoints — a learner can hold one
 * account at several academies (AD-4) and the academy whose branded site
 * they are on is the academy whose work they see. Which means no consumer
 * here ever passes an academy id, and none should start.
 *
 * COUNTS ARE THE SERVER'S (§E.1's "with server counts"). The retired My
 * Learning page counted the page of enrollments it happened to have
 * loaded and called that the total, so "In progress (3)" meant three on
 * this page. `LearnerCourseCounts` is the whole enrolment set.
 */

export interface ContinueLearningItem {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly courseThumbnailUrl: string | null;
  readonly percentage: number;
  readonly completedLessons: number;
  readonly totalLessons: number;
  /** Where "Continue" goes. Null when the course has nothing left to resume. */
  readonly nextItemId: string | null;
  readonly nextItemTitle: string | null;
  readonly lastActivityAt: string | null;
}

export interface LearnerCourseCounts {
  readonly all: number;
  readonly inProgress: number;
  readonly completed: number;
}

export interface UpcomingDeadline {
  readonly id: string;
  readonly type: 'assignment' | 'live_session';
  readonly title: string;
  readonly courseId: string;
  readonly courseTitle: string;
  readonly dueAt: string;
  readonly overdue: boolean;
}

export interface RecentResult {
  readonly id: string;
  readonly type: 'quiz' | 'assignment';
  readonly title: string;
  readonly courseId: string;
  readonly courseTitle: string;
  /** Free-form on the wire; rendered through `learnerAssessmentStateKey`. */
  readonly status: string;
  readonly score: number | null;
  readonly at: string;
}

export interface LearnerAnnouncement {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly publishedAt: string | null;
  readonly courseId: string | null;
}

export interface LearnerOverviewResponse {
  readonly academyId: string;
  readonly continueLearning: readonly ContinueLearningItem[];
  readonly courseCounts: LearnerCourseCounts;
  readonly upcomingDeadlines: readonly UpcomingDeadline[];
  readonly recentResults: readonly RecentResult[];
  readonly announcements: readonly LearnerAnnouncement[];
  /**
   * Certificates are Phase 3. An explicit, honest zero WITH a flag, not an
   * omitted field: the dashboard can then say "not being issued yet"
   * rather than render an empty list that reads as "you have earned none".
   */
  readonly certificates: {
    readonly available: boolean;
    readonly count: number;
  };
}

export interface LearnerAssessmentItem {
  readonly id: string;
  readonly type: 'quiz' | 'assignment';
  readonly title: string;
  readonly courseId: string;
  readonly courseTitle: string;
  /** Free-form on the wire; rendered through `learnerAssessmentStateKey`. */
  readonly state: string;
  readonly dueAt: string | null;
  readonly score: number | null;
  readonly submittedAt: string | null;
}

export interface LearnerDeviceResponse {
  readonly id: string;
  readonly label: string;
  readonly lastSeenAt: string;
  readonly createdAt: string;
  /** True for the browser making THIS request, so the UI can say "this device" and warn before removing it. */
  readonly current: boolean;
}

export interface LearnerSessionResponse {
  readonly sessionId: string;
  readonly deviceLabel: string | null;
  readonly locationCountry: string | null;
  readonly lastUsedAt: string | null;
  readonly createdAt: string;
  readonly current: boolean;
}

export interface LearnerDevicesResponse {
  readonly devices: readonly LearnerDeviceResponse[];
  readonly sessions: readonly LearnerSessionResponse[];
  readonly maxDevices: number;
  readonly maxConcurrentSessions: number;
  /** Which policy row decided — `academy` when the Client Owner set one, otherwise the platform default. */
  readonly policySource: 'academy' | 'plan' | 'platform' | 'default';
}

/** What `POST /learning/session/takeover` answers with: the lease, now held here. */
export interface SessionTakeoverResponse {
  readonly leaseId: string;
  readonly ttlSeconds: number;
  readonly heartbeatSeconds: number;
  /** The device that was learning until this call. Null when it could not be named. */
  readonly displacedDeviceLabel: string | null;
}

/** Body of `POST /learning/session/takeover` — both fields are context for the audit entry. */
export interface SessionTakeoverPayload {
  readonly courseId?: string;
  readonly lessonId?: string;
}
