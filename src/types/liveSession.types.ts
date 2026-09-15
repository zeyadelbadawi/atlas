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
  | 'error'
  /** The stored authorization can no longer be refreshed. Only the Organization Owner re-authorizing clears it. */
  | 'reconnect_required';

/**
 * Connection health as the UI is allowed to see it.
 *
 * SAFE METADATA ONLY. The Zoom account id is a non-secret identifier and
 * is genuinely useful for confirming WHICH account is attached. There is
 * deliberately no token, no scope secret and no client secret here — no
 * endpoint returns them, so nothing in the app ever holds one.
 */
export interface LiveProviderConnectionState {
  readonly status: LiveProviderConnectionStatus;
  readonly providerKey: string;
  readonly externalAccountId?: string | null;
  readonly connectedAt?: string | null;
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

/**
 * Starting a Zoom authorization.
 *
 * WHAT USED TO BE HERE: six fields a customer copied out of Zoom apps
 * they had to create themselves. Atlas owns the Zoom application now, so
 * the customer supplies NOTHING — the flow carries no input at all, and
 * the only thing that comes back is where to send the browser.
 */
export interface ZoomAuthorizationStart {
  readonly authorizationUrl: string;
  readonly expiresAt: string;
}

/** Why a student cannot join right now. Each has its own honest explanation. */
export type JoinRefusalReason =
  | 'not_enrolled'
  | 'wrong_academy'
  | 'not_published'
  | 'cancelled'
  | 'too_early'
  | 'too_late'
  | 'provider_unavailable'
  | 'add_on_unavailable';

export interface LiveSessionEligibility {
  readonly joinable: boolean;
  readonly reason?: JoinRefusalReason;
  readonly isHost: boolean;
  readonly status: LiveSessionStatus;
  readonly title: string;
  readonly scheduledStartAt: string;
  readonly scheduledEndAt: string;
}

/** What the embedded SDK needs. `sdkKey` is a public client id; the SECRET never leaves the server. */
export interface LiveSessionJoinAuthorization {
  readonly joinable: true;
  readonly sdkKey: string;
  readonly signature: string;
  readonly providerMeetingId: string;
  readonly expiresAt: string;
  readonly isHost: boolean;
  /**
   * The host's start token, present ONLY for the host.
   *
   * Atlas creates meetings that cannot be joined before the host, so
   * without this the host waits in their own classroom and nobody can get
   * in. It is a credential: minted per join, held in memory for the
   * duration of the join call, and never persisted anywhere.
   */
  readonly hostToken?: string;
}

/**
 * One Live Session as a STUDENT sees it in their curriculum.
 *
 * Deliberately narrower than `LiveSession`: no provider meeting id, no
 * join URL, no recording location. This shape reaches every enrolled
 * browser, so it carries only what the screen draws.
 */
export interface StudentLiveSession {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: LiveSessionStatus;
  readonly sectionId?: string;
  readonly scheduledStartAt: string;
  readonly scheduledEndAt: string;
  readonly host?: { readonly id: string; readonly name: string };
  /** Whether a recording EXISTS. Opening it still goes through media authorization. */
  readonly recordingAvailable: boolean;
}

export interface LiveSessionJoinRefused {
  readonly joinable: false;
  readonly reason: string;
}
