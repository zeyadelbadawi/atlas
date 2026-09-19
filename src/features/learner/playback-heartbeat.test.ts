/**
 * The playback heartbeat and the lease it keeps alive (§D.6, §D.7, §E.4).
 *
 * THREE BEHAVIOURS, ALL OF THEM EASY TO BREAK WITHOUT NOTICING:
 *
 * 1. `leaseHeld: false` LATCHES. §E.4's requirement is a "lease-lost pause
 *    state", and a state that un-pauses itself the moment a later beat
 *    happens to succeed is not a pause — it is a video that stutters
 *    between two devices while both learners think they have it. The
 *    latch is what makes the learner's own decision the thing that ends
 *    it.
 *
 * 2. A FAILED BEAT IS NOT A FAILED LESSON. The lease survives two misses
 *    by design (60 s TTL against a 20 s cadence), so a dropped request
 *    must change nothing on screen. Turning a network blip into an
 *    interruption would punish exactly the learners on the worst
 *    connections.
 *
 * 3. THE POSITION IS READ AT BEAT TIME, AS A WHOLE NUMBER. It is the only
 *    figure the client is allowed to report — the server derives watched
 *    time from the deltas it observes, because a client-reported
 *    "watched" number would make the completion rule decorative — and the
 *    DTO rejects a non-integer outright.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { PlaybackHeartbeatResponse, PlaybackLease } from '@types';

const recordHeartbeat = vi.fn<
  (courseId: string, payload: unknown) => Promise<PlaybackHeartbeatResponse>
>();
const releaseLease = vi.fn(async () => undefined);

vi.mock('./services/LessonContentService', () => ({
  lessonContentService: {
    recordHeartbeat: (courseId: string, payload: unknown) =>
      recordHeartbeat(courseId, payload),
    releaseLease: () => releaseLease(),
  },
}));

const { usePlaybackHeartbeat } = await import('./hooks/usePlaybackHeartbeat');

const LEASE: PlaybackLease = {
  leaseId: 'lease-1',
  ttlSeconds: 60,
  heartbeatSeconds: 20,
};

function response(
  overrides: Partial<PlaybackHeartbeatResponse> = {}
): PlaybackHeartbeatResponse {
  return {
    lessonId: 'l-1',
    lastPositionSeconds: 12,
    watchedSeconds: 12,
    maxWatchedRatio: 0.2,
    leaseHeld: true,
    completionEligible: false,
    ...overrides,
  };
}

function setup(position = () => 12.7) {
  return renderHook(() =>
    usePlaybackHeartbeat({
      courseId: 'c-1',
      lessonId: 'l-1',
      lease: LEASE,
      getPositionSeconds: position,
    })
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  recordHeartbeat.mockResolvedValue(response());
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('playback heartbeat', () => {
  it('reports a whole-second position and the lease id', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.beat();
    });

    expect(recordHeartbeat).toHaveBeenCalledWith('c-1', {
      lessonId: 'l-1',
      // Floored, not rounded up: the DTO takes an integer, and claiming a
      // second the learner has not watched is the wrong direction to err.
      positionSeconds: 12,
      leaseId: 'lease-1',
    });
  });

  it('beats on the lease’s own cadence, not on a constant', async () => {
    setup();

    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });
    expect(recordHeartbeat).toHaveBeenCalledTimes(2);
  });

  it('latches the lease as lost and stops beating', async () => {
    const { result } = setup();

    recordHeartbeat.mockResolvedValueOnce(response({ leaseHeld: false }));
    await act(async () => {
      await result.current.beat();
    });

    expect(result.current.leaseHeld).toBe(false);

    // A later beat reporting the lease as held must NOT resurrect
    // playback: the learner decides how the pause ends.
    recordHeartbeat.mockResolvedValue(response({ leaseHeld: true }));
    await act(async () => {
      await result.current.beat();
    });
    expect(result.current.leaseHeld).toBe(false);

    // And nothing keeps beating behind a paused player.
    const callsSoFar = recordHeartbeat.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(recordHeartbeat).toHaveBeenCalledTimes(callsSoFar);
  });

  it('carries the server’s completion verdict without computing one', async () => {
    const { result } = setup();

    expect(result.current.completionEligible).toBe(false);

    recordHeartbeat.mockResolvedValueOnce(
      response({ completionEligible: true, maxWatchedRatio: 0.95 })
    );
    await act(async () => {
      await result.current.beat();
    });

    expect(result.current.completionEligible).toBe(true);
    expect(result.current.maxWatchedRatio).toBe(0.95);
  });

  it('swallows a failed beat rather than interrupting the lesson', async () => {
    const { result } = setup();

    recordHeartbeat.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await result.current.beat();
    });

    expect(result.current.leaseHeld).toBe(true);
    expect(result.current.completionEligible).toBe(false);
  });

  it('hands the lease back when the player closes', async () => {
    const { unmount } = setup();

    await act(async () => {
      unmount();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(releaseLease).toHaveBeenCalled();
  });
});
