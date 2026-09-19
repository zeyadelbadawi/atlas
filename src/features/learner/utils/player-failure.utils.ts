/**
 * Turning one refused grant into one thing the player can SAY (§E.3's
 * "explicit error states").
 *
 * WHY THIS IS A TRANSLATION AND NOT A LOOKUP. The backend deliberately
 * answers 404 for almost every refusal — `notEnrolled`, `courseUnavailable`,
 * `lessonUnavailable`, `notAuthenticated` all arrive as "not found" —
 * because a 403 for "not enrolled" versus a 404 for "no such lesson" would
 * let an anonymous crawler map every lesson id in a paid catalogue by
 * reading status codes. Only the states a learner can actually DO
 * something about come back named: the device cap, the rate limit, an
 * ended enrolment, a drip date, a suspension, and the 409 session
 * conflict that carries the other device's label.
 *
 * So the player gets less information than the log does, and this file is
 * where that is handled honestly rather than by guessing. Everything
 * named is rendered as itself; everything else becomes one careful
 * sentence that does not claim to know which of four things happened.
 *
 * THE ONE INFERENCE, STATED AS ONE. A 404 on a lesson the SEQUENCE has
 * just listed as available is very likely a video that has not finished
 * processing — the lesson exists, the course is published, the learner is
 * enrolled and the item is not locked, which rules out every other 404
 * cause the server would have used. `classifyPlayerFailure` takes that
 * hint as an argument instead of assuming it, and the copy it selects
 * says "may still be processing", never "is processing".
 */
import { isApiError } from '@api';
import type { SessionConflictDetails } from '@types';

/** What the player is currently unable to do, in the learner's terms. */
export const PLAYER_FAILURE_KINDS = [
  /** The request never reached a server, or it timed out. Retryable, and not the learner's fault. */
  'network',
  /** The grant's credential ran out and a refresh could not replace it. */
  'expired',
  /** Enrolment revoked, refunded or expired — the course is gone, not the lesson. */
  'accessEnded',
  /** This browser is not one of the learner's registered devices and the cap is full. */
  'deviceLimit',
  /** Another device holds the learning lease. Carries that device's label. */
  'sessionConflict',
  /** Too many grants in too short a window. */
  'rateLimited',
  /** Drip: the lesson opens on a future date. */
  'scheduled',
  'suspended',
  /** No session, or a session that is not for this academy. */
  'notAuthenticated',
  /** See this file's doc comment — an inference, and worded as one. */
  'processing',
  /** The honest catch-all for the deliberately ambiguous 404. */
  'unavailable',
  'unknown',
] as const;
export type PlayerFailureKind = (typeof PLAYER_FAILURE_KINDS)[number];

export interface PlayerFailure {
  readonly kind: PlayerFailureKind;
  /** Present only for `sessionConflict`: what the takeover dialog has to be able to name. */
  readonly sessionConflict?: SessionConflictDetails;
}

/**
 * Failures that mean access is GONE, not merely unavailable this second.
 *
 * The distinction decides whether a failed silent refresh interrupts
 * playback. A network blip must not — the learner is watching a video
 * that is already buffered and the next attempt is seconds away — but a
 * revoked enrolment must, immediately, because continuing to serve
 * content after access ended is the thing §I exists to prevent.
 */
const ACCESS_ENDED_KINDS: ReadonlySet<PlayerFailureKind> = new Set([
  'accessEnded',
  'deviceLimit',
  'sessionConflict',
  'suspended',
  'notAuthenticated',
]);

export function isAccessRevokedFailure(kind: PlayerFailureKind): boolean {
  return ACCESS_ENDED_KINDS.has(kind);
}

/** The backend's own message keys, spelled exactly as it sends them. */
const MESSAGE_KEY_TO_KIND: Readonly<Record<string, PlayerFailureKind>> = {
  'errors.learning.deviceLimit': 'deviceLimit',
  'errors.learning.grantRateLimited': 'rateLimited',
  'errors.learning.accessEnded': 'accessEnded',
  'errors.learning.lessonScheduled': 'scheduled',
  'errors.learning.sessionConflict': 'sessionConflict',
  'errors.auth.accountSuspended': 'suspended',
};

/**
 * Reads the 409's `details` without trusting its shape.
 *
 * This is untrusted wire data reaching a dialog that renders it, so every
 * field is narrowed rather than asserted. A malformed payload produces a
 * conflict with no device label — which the dialog already has to handle,
 * because the backend itself sends `null` when the other device could not
 * be named.
 */
function readSessionConflict(
  details: Readonly<Record<string, unknown>> | undefined
): SessionConflictDetails {
  const label = details?.deviceLabel;
  const since = details?.since;
  return {
    deviceLabel: typeof label === 'string' && label.length > 0 ? label : null,
    since: typeof since === 'string' ? since : '',
  };
}

export interface ClassifyPlayerFailureOptions {
  /**
   * Whether the curriculum currently lists this item as reachable. Only
   * ever used to choose between `processing` and `unavailable` on a 404 —
   * see this file's doc comment.
   */
  readonly sequenceSaysAvailable?: boolean;
}

/** Maps one thrown value to the single state the player should render. */
export function classifyPlayerFailure(
  error: unknown,
  options?: ClassifyPlayerFailureOptions
): PlayerFailure {
  if (!isApiError(error)) return { kind: 'unknown' };

  if (error.kind === 'network' || error.kind === 'timeout') {
    return { kind: 'network' };
  }

  const named = error.messageKey
    ? MESSAGE_KEY_TO_KIND[error.messageKey]
    : undefined;

  if (named === 'sessionConflict') {
    return {
      kind: 'sessionConflict',
      sessionConflict: readSessionConflict(error.details),
    };
  }
  if (named) return { kind: named };

  // A 409 with no recognised key is still a lease conflict — that is the
  // only conflict this endpoint produces — so the takeover path stays
  // reachable even if the key is ever renamed on the server.
  if (error.status === 409) {
    return {
      kind: 'sessionConflict',
      sessionConflict: readSessionConflict(error.details),
    };
  }

  if (error.kind === 'unauthorized') return { kind: 'notAuthenticated' };
  if (error.kind === 'rateLimited') return { kind: 'rateLimited' };

  if (error.kind === 'notFound') {
    return {
      kind: options?.sequenceSaysAvailable ? 'processing' : 'unavailable',
    };
  }

  if (error.kind === 'server') return { kind: 'network' };

  return { kind: 'unknown' };
}

/** Translation key for a failure's heading. */
export function playerFailureTitleKey(kind: PlayerFailureKind): string {
  return `learning:player.failure.${kind}.title`;
}

/** Translation key for a failure's explanation. */
export function playerFailureDescriptionKey(kind: PlayerFailureKind): string {
  return `learning:player.failure.${kind}.description`;
}
