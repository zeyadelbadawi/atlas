/**
 * Turning a refused grant into one thing the player can say (§E.3).
 *
 * WHY THIS IS WORTH A TEST. The backend answers 404 for almost every
 * refusal on purpose — a 403 for "not enrolled" versus a 404 for "no such
 * lesson" would let an anonymous crawler map every lesson id in a paid
 * catalogue by reading status codes — so the player is given LESS
 * information than the log has, and the mapping from what it does get to
 * what it tells the learner is where that gap is handled. Getting it
 * wrong is silent: the learner sees a generic "something went wrong" for
 * a device cap they could have fixed in two clicks.
 *
 * THE SESSION-CONFLICT CASE CARRIES DATA, which is the other reason.
 * §E.4 requires the takeover dialog to NAME the other device, and the
 * only place that name exists is `details` on a 409 — untrusted wire data
 * reaching a dialog that renders it. A malformed payload must produce a
 * conflict with no label, never a crash inside the dialog.
 */
import { describe, expect, it } from 'vitest';
import { createApiError } from '@api';
import { classifyPlayerFailure, isAccessRevokedFailure } from './utils/player-failure.utils';

describe('player failure classification', () => {
  it('names the device cap so the learner can be sent somewhere useful', () => {
    const failure = classifyPlayerFailure(
      createApiError('forbidden', {
        status: 403,
        messageKey: 'errors.learning.deviceLimit',
      })
    );

    expect(failure.kind).toBe('deviceLimit');
  });

  it('names an ended enrolment rather than calling it "not found"', () => {
    const failure = classifyPlayerFailure(
      createApiError('forbidden', {
        status: 403,
        messageKey: 'errors.learning.accessEnded',
      })
    );

    expect(failure.kind).toBe('accessEnded');
    expect(isAccessRevokedFailure(failure.kind)).toBe(true);
  });

  it('carries the other device and the time from a 409', () => {
    const failure = classifyPlayerFailure(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.learning.sessionConflict',
        details: {
          deviceLabel: 'Chrome on Windows',
          since: '2026-09-19T11:00:00.000Z',
        },
      })
    );

    expect(failure.kind).toBe('sessionConflict');
    expect(failure.sessionConflict?.deviceLabel).toBe('Chrome on Windows');
    expect(failure.sessionConflict?.since).toBe('2026-09-19T11:00:00.000Z');
  });

  it('survives a 409 whose details are missing or the wrong shape', () => {
    const failure = classifyPlayerFailure(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.learning.sessionConflict',
        details: { deviceLabel: 42, since: null },
      })
    );

    // The dialog already handles a null label — the server itself sends
    // one when it cannot name the device — so this must degrade to that
    // rather than throw inside a render.
    expect(failure.kind).toBe('sessionConflict');
    expect(failure.sessionConflict?.deviceLabel).toBeNull();
    expect(failure.sessionConflict?.since).toBe('');
  });

  it('still reaches the takeover path when the key is unrecognised', () => {
    // A 409 is the only conflict this endpoint produces. If the message
    // key is ever renamed server-side, the learner must still be offered
    // the takeover rather than a dead end.
    const failure = classifyPlayerFailure(
      createApiError('conflict', { status: 409, messageKey: 'errors.something.else' })
    );

    expect(failure.kind).toBe('sessionConflict');
  });

  it('reads a 404 on an available item as "still processing"', () => {
    // The one inference this file makes, and it is made from the
    // curriculum rather than assumed: the lesson exists, is published, is
    // not locked and the learner is enrolled — which rules out every
    // other reason the server would have answered 404.
    const failure = classifyPlayerFailure(
      createApiError('notFound', { status: 404 }),
      { sequenceSaysAvailable: true }
    );

    expect(failure.kind).toBe('processing');
  });

  it('does not claim to know why, when the curriculum cannot vouch for the item', () => {
    const failure = classifyPlayerFailure(
      createApiError('notFound', { status: 404 }),
      { sequenceSaysAvailable: false }
    );

    expect(failure.kind).toBe('unavailable');
  });

  it('treats an unreachable server as a network problem, not a refusal', () => {
    expect(classifyPlayerFailure(createApiError('network')).kind).toBe('network');
    expect(classifyPlayerFailure(createApiError('timeout')).kind).toBe('network');
    expect(classifyPlayerFailure(createApiError('server', { status: 502 })).kind).toBe(
      'network'
    );
  });

  it('separates failures that must interrupt playback from those that must not', () => {
    // The distinction the whole silent-refresh design rests on: a network
    // blip behind a buffered video must not stop it, and a revoked
    // enrolment must stop it immediately.
    expect(isAccessRevokedFailure('accessEnded')).toBe(true);
    expect(isAccessRevokedFailure('deviceLimit')).toBe(true);
    expect(isAccessRevokedFailure('sessionConflict')).toBe(true);
    expect(isAccessRevokedFailure('suspended')).toBe(true);

    expect(isAccessRevokedFailure('network')).toBe(false);
    expect(isAccessRevokedFailure('rateLimited')).toBe(false);
    expect(isAccessRevokedFailure('unknown')).toBe(false);
  });
});
