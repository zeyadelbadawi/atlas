/**
 * Live Sessions add-on domain types.
 *
 * A Live Session is a COURSE ACTIVITY, alongside Lesson/Quiz/Assignment —
 * it carries the same `sectionId` placement and `order` those already use,
 * so the curriculum can sequence all four together.
 *
 * NOTE ON WHAT IS ABSENT: there is no provider meeting id and no join URL
 * anywhere in these types, deliberately. A student joins through an
 * Atlas-minted, single-use grant; shipping a meeting identifier to the
 * browser would make the room reachable by anyone who opened dev tools.
 */

/** Mirrors the backend `LiveSessionStatus` enum exactly. */
export type LiveSessionStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'cancelled'
  | 'failed';

/** Mirrors `LiveSessionRecordingStatus`. Recording state is NOT session state. */
export type LiveSessionRecordingStatus =
  | 'requested'
  | 'processing'
  | 'available'
  | 'failed';

export interface LiveSessionRecordingSummary {
  readonly status: LiveSessionRecordingStatus;
  readonly availableAt?: string;
}

export interface LiveSession {
  readonly id: string;
  readonly courseId: string;
  /** The unit this activity sits in. Absent means "course level, no unit". */
  readonly sectionId?: string;
  readonly title: string;
  readonly description?: string;
  readonly order: number;
  readonly status: LiveSessionStatus;
  readonly scheduledStartAt: string;
  readonly scheduledEndAt: string;
  readonly host?: { readonly id: string; readonly name: string };
  /** OFF unless explicitly turned on. Never inherited from the Zoom account. */
  readonly recordingEnabled: boolean;
  /** Absent when no recording was ever made — not the same as `failed`. */
  readonly recording?: LiveSessionRecordingSummary;
  readonly startedAt?: string;
  readonly endedAt?: string;
}

/** Why the add-on cannot be used. Each has a different fix, so each is distinct. */
export type AddOnBlockReason =
  | 'subscription_inactive'
  | 'not_entitled'
  | 'not_installed'
  | 'disabled'
  | 'installing'
  | 'failed';

export interface AddOnAccessState {
  readonly usable: boolean;
  readonly reason?: AddOnBlockReason;
  readonly installStatus?: string;
  /** Whether the plan grants the capability, independent of installation. */
  readonly entitled: boolean;
  readonly failureReason?: string;
}

/** Provider connection health — academy-scoped, never shared across academies. */
export type LiveProviderConnectionStatus =
  | 'not_connected'
  | 'connected'
  | 'expired'
  | 'revoked'
  | 'error';

export interface LiveProviderConnectionState {
  readonly status: LiveProviderConnectionStatus;
  readonly providerKey: string;
  readonly lastCheckedAt?: string | null;
}

/**
 * Recorded-session allowance.
 *
 * `remaining` is `null` when the limit is `'unlimited'` — never a sentinel
 * number, matching how every other Atlas limit is expressed.
 */
export interface RecordingQuotaUsage {
  readonly used: number;
  readonly limit: number | 'unlimited';
  readonly remaining: number | null;
}

/**
 * The four dependencies, reported separately.
 *
 * Installed is not entitled, entitled is not connected, and connected is
 * not "has quota". Collapsing them would leave a customer with a dead
 * screen and no idea which one to fix.
 */
export interface LiveSessionsStatus {
  readonly addOn: AddOnAccessState;
  readonly provider: LiveProviderConnectionState;
  readonly recordingQuota: RecordingQuotaUsage;
}

export interface CreateLiveSessionInput {
  readonly title: string;
  readonly description?: string;
  readonly sectionId?: string;
  readonly scheduledStartAt: string;
  readonly scheduledEndAt: string;
  readonly hostUserId?: string;
  readonly recordingEnabled?: boolean;
}

export interface UpdateLiveSessionInput {
  readonly title?: string;
  readonly description?: string;
  readonly sectionId?: string;
  readonly scheduledStartAt?: string;
  readonly scheduledEndAt?: string;
  readonly hostUserId?: string;
  readonly recordingEnabled?: boolean;
  /** Only the transitions a human performs. `live`/`ended` are consequences, not choices. */
  readonly status?: 'draft' | 'scheduled' | 'cancelled';
}

/** Where one attendance interval came from. `manual` is always shown as an override. */
export type LiveAttendanceSource =
  | 'sdk_event'
  | 'provider_webhook'
  | 'provider_report'
  | 'manual';

export interface AttendanceIntervalView {
  readonly joinedAt: string;
  readonly leftAt: string | null;
  readonly source: LiveAttendanceSource;
}

/** Attendance is interval-based — never a boolean. */
export interface ParticipantAttendance {
  readonly userId: string;
  readonly participantId: string;
  readonly name: string;
  readonly email: string;
  readonly intervals: readonly AttendanceIntervalView[];
  readonly joinCount: number;
  readonly totalSeconds: number;
  readonly firstJoinedAt: string | null;
  readonly lastLeftAt: string | null;
  readonly attendancePercent: number;
  readonly status: 'attended' | 'partial' | 'absent';
}

/** The add-on catalog, annotated with this tenant's own lifecycle state. */
export interface AddOnCatalogEntry {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly effect: { readonly type: 'limit' | 'feature'; readonly featureKey?: string };
  readonly compatiblePlanKeys: readonly string[];
  readonly pricing?: { readonly amount?: number; readonly currency?: string };
  /** Free is simply "no price attached" — decided by the catalog, never a second flag. */
  readonly isFree: boolean;
  readonly installStatus:
    | 'installing'
    | 'installed'
    | 'enabled'
    | 'disabled'
    | 'uninstalling'
    | 'uninstalled'
    | 'failed';
  readonly failureReason?: string;
}
