/**
 * Owner Reports types (P64 Phase 4 §E.5) — mirror the backend's academy
 * report responses field-for-field.
 *
 * Two reads, both scoped to ONE academy and ONE trailing window:
 *
 *   - `GET academies/:academyId/reports/integrity?days=N` — the quiz
 *     integrity events recorded across the academy's attempts.
 *   - `GET academies/:academyId/reports/sharing?days=N` — lesson-access
 *     grants versus refusals (the account-sharing / device-limit signals).
 *
 * `days` is 1–90 (default 30); the backend answers 400 outside that range
 * and 403 to members who are not owner/admin/manager, so the UI never
 * invents a wider window and always has a permission state to show.
 *
 * `byType` / `refusedByReason` are open string maps on purpose: the set of
 * event types and refusal reasons belongs to the backend, and a new one
 * must render (as its raw key) rather than be dropped by a closed union.
 */

export interface AcademyReportWindow {
  readonly from: string;
  readonly to: string;
  readonly days: number;
}

export interface IntegrityReportCourse {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly events: number;
  readonly attemptsWithEvents: number;
}

export interface AcademyIntegrityReport {
  readonly academyId: string;
  readonly window: AcademyReportWindow;
  readonly totalEvents: number;
  /** Events that counted against an attempt's tolerance (a subset of `totalEvents`). */
  readonly countedEvents: number;
  readonly attemptsWithEvents: number;
  readonly byType: Readonly<Record<string, number>>;
  readonly topCourses: readonly IntegrityReportCourse[];
  /** The backend capped a list; the headline figures are still complete. */
  readonly truncated: boolean;
}

export interface SharingReportCourse {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly refusals: number;
}

export interface SharingReportUser {
  readonly userId: string;
  readonly userName?: string;
  readonly refusals: number;
}

export interface AcademySharingReport {
  readonly academyId: string;
  readonly window: AcademyReportWindow;
  readonly granted: number;
  readonly refused: number;
  readonly refusedByReason: Readonly<Record<string, number>>;
  readonly distinctUsersRefused: number;
  readonly distinctDevicesRefused: number;
  readonly topCourses: readonly SharingReportCourse[];
  readonly topUsers: readonly SharingReportUser[];
  /** See `AcademyIntegrityReport.truncated`. */
  readonly truncated: boolean;
}
