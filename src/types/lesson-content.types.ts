/**
 * The content-grant wire contract (P64 Phase 2 §D.2/§E.3).
 *
 * A field-for-field mirror of the backend's
 * `src/learning/dto/lesson-content.contract.ts`.
 *
 * ONE SHAPE, FOUR KINDS. A grant always answers the same questions — what
 * is this, may I have it, for how long, and what must the player show
 * while it plays — and `kind` decides which payload field is populated.
 * The player therefore does not need to know a lesson's type before it
 * can ask about it, which is exactly the information the curriculum
 * response deliberately no longer carries.
 *
 * NOTHING HERE IS DURABLE, AND THE PLAYER MUST TREAT IT THAT WAY.
 * `fileUrl` and `video.url` are short-lived signed URLs and `expiresAt`
 * is when the whole grant stops being valid — as little as ten minutes on
 * the Normal tier, which is shorter than a long lesson. A player that
 * fetches a grant once and keeps playing is a player that stops mid-video
 * for every learner with a slow afternoon. Silent refresh is mandatory,
 * not an optimisation (§E.3); see `useLessonGrant`.
 */

/** What a lesson actually delivers. Wider than the authoring content type: `external` is real. */
export const LESSON_CONTENT_KINDS = [
  'text',
  'video',
  'file',
  'external',
] as const;
export type LessonContentKind = (typeof LESSON_CONTENT_KINDS)[number];

/** How a lesson is allowed to be marked complete. */
export const LESSON_COMPLETION_RULES = ['manual', 'watched_ratio'] as const;
export type LessonCompletionRule = (typeof LESSON_COMPLETION_RULES)[number];

/**
 * Every machine-readable reason a content decision can carry.
 *
 * CLOSED vocabulary: the frontend routes on these strings and
 * `content_access_log.reason` stores them. Note that most of them never
 * reach the browser as themselves — the backend deliberately answers 404
 * for anything an anonymous crawler could use to map a paid catalogue,
 * and only the states a learner can ACT on (`deviceLimit`, `rateLimited`,
 * `accessEnded`, `scheduled`, `suspended`) arrive with their own message
 * key. This list is here so the player's own state machine can name the
 * same things the log does.
 */
export const CONTENT_ACCESS_REASONS = [
  'notAuthenticated',
  'notEnrolled',
  'accessEnded',
  'courseUnavailable',
  'lessonUnavailable',
  'scheduled',
  'deviceLimit',
  'sessionConflict',
  'suspended',
  'rateLimited',
] as const;
export type ContentAccessReason = (typeof CONTENT_ACCESS_REASONS)[number];

/**
 * The per-viewer overlay the player draws over protected video.
 *
 * A DETERRENT, AND LABELLED AS ONE (D1). It does not stop a determined
 * person with a camera; it makes a casually re-shared recording trace
 * back to the account it came from, which is the actual threat for paid
 * course content. `text` is built server-side from the viewer's own
 * identity, so a client cannot blank it by lying.
 */
export interface ContentWatermark {
  readonly enabled: boolean;
  readonly text: string;
}

/** What the browser must do to keep the single-session lease alive. */
export interface PlaybackLease {
  readonly leaseId: string;
  readonly ttlSeconds: number;
  readonly heartbeatSeconds: number;
}

/**
 * Present only when `externalUrl` is a supported YouTube link. The player
 * embeds from `videoId` alone — never from the raw URL — so this is the
 * only way an external address ever becomes a frame on the learner's page.
 * Mirrors `ExternalEmbedContract` (backend `lesson-content.contract.ts`).
 */
export interface ExternalEmbed {
  readonly provider: 'youtube';
  /** Exactly YouTube's 11-character id alphabet, validated server-side. */
  readonly videoId: string;
  readonly startSeconds?: number;
}

export interface GrantedVideo {
  /** The discriminator the video adapter branches on. Nothing else decides the element. */
  readonly format: 'hls' | 'mp4';
  readonly url: string;
  readonly posterUrl?: string;
  /** Always `false` (§I). Explicit so a test can assert it and a reviewer can see it. */
  readonly downloadable: false;
}

export interface GrantedResource {
  readonly id: string;
  readonly title: string;
  /** Signed, short-lived. Absent for an external resource. */
  readonly url?: string;
  readonly externalUrl?: string;
}

/**
 * What protection is ACTUALLY in force for this grant (AD-16).
 *
 * Every field is read from the delivering adapter's own `capabilities()`,
 * never assumed from a tier's name — that assumption is precisely what
 * finding D-5 recorded, where "premium" was taken to mean device-bound
 * and the provider's edge was in fact re-checking nothing.
 *
 * THE UI RENDERS THESE FIELDS, NEVER A MARKETING WORD. On two of them the
 * Normal tier scores HIGHER than Premium, and that is the honest result:
 * saying "secure" over a Premium grant would be a claim the delivery edge
 * does not back. See `ProtectionReport`.
 */
export interface ContentProtectionReport {
  /** `null` for content with no hosted video (text, files, external embeds). */
  readonly tier: 'normal' | 'premium' | null;
  /** False only for an external embed Atlas does not host and cannot protect. */
  readonly signedUrl: boolean;
  /** Real lifetime of the credential in this response — never an optimistic figure (finding D-3). */
  readonly expiresInSeconds: number;
  /** Whether the DELIVERY EDGE re-checks the session on every request. `false` for Cloudflare Stream (D-5). */
  readonly boundToSession: boolean;
  readonly boundToDevice: boolean;
  /** Whether access can be cut off before the credential expires. */
  readonly revocableBeforeExpiry: boolean;
  readonly originRestricted: boolean;
  readonly watermark: boolean;
  readonly adaptiveBitrate: boolean;
  /** Always false. Neither tier has DRM — Cloudflare Stream does not offer it (D1). */
  readonly drm: false;
}

export interface LessonContentGrant {
  readonly lessonId: string;
  readonly courseId: string;
  readonly academyId: string;
  readonly title: string;
  readonly kind: LessonContentKind;
  readonly isPreview: boolean;
  readonly durationSeconds: number | null;
  readonly completionRule: LessonCompletionRule;
  /** The fraction of the video that must be watched before completion is allowed. Null when the rule is `manual`. */
  readonly minimumWatchedRatio: number | null;
  readonly protection: ContentProtectionReport;
  readonly bodyHtml?: string;
  readonly fileUrl?: string;
  readonly fileName?: string;
  readonly video?: GrantedVideo;
  readonly externalUrl?: string;
  readonly externalEmbed?: ExternalEmbed;
  readonly resources: readonly GrantedResource[];
  readonly watermark: ContentWatermark;
  /** Null for a preview opened without a session — there is nothing to lease. */
  readonly playbackLease: PlaybackLease | null;
  /** Where this learner left off, so the player can resume without a second round-trip. */
  readonly resumePositionSeconds: number;
  readonly expiresAt: string;
}

/** Body of `POST /learning/courses/:id/playback`. */
export interface PlaybackHeartbeatPayload {
  readonly lessonId: string;
  /**
   * The ONLY number the client reports, and it is used for RESUME, never
   * as evidence of watching — the backend derives watched seconds from
   * the deltas it observes, because a client-reported watched figure
   * would make the completion rule decorative.
   */
  readonly positionSeconds: number;
  /** Absent when the grant was issued without a lease (lease store unavailable). */
  readonly leaseId?: string;
}

export interface PlaybackHeartbeatResponse {
  readonly lessonId: string;
  readonly lastPositionSeconds: number;
  readonly watchedSeconds: number;
  readonly maxWatchedRatio: number;
  /** False when another device has taken over. The player pauses; nothing already recorded is lost. */
  readonly leaseHeld: boolean;
  /** Whether the watched-ratio rule is now satisfied, so the UI can offer completion without a second round-trip. */
  readonly completionEligible: boolean;
}

/** Body of `POST /learning/courses/:id/playback/release`. */
export interface ReleaseLeasePayload {
  readonly leaseId: string;
}

/**
 * The 409 body when another device holds the lease.
 *
 * Carries exactly what the takeover dialog has to be able to say: WHICH
 * device, and SINCE WHEN. A confirmation that cannot name the other
 * device is a confirmation nobody can give meaningfully.
 */
export interface SessionConflictDetails {
  readonly deviceLabel: string | null;
  readonly since: string;
}
