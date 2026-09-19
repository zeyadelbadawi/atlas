/**
 * The silent-refresh clock (P64 Phase 2 §E.3, §I).
 *
 * WHY THIS IS WORTH A TEST RATHER THAN A REVIEW. Every input here is a
 * clock, and the failure mode is invisible until a real learner plays a
 * real forty-minute lesson end to end: refresh too late and the
 * credential dies mid-video, refresh too eagerly and one learner becomes
 * a grant flood the rate limiter then refuses (§U watches exactly that
 * metric). Neither shows up in a five-minute manual check, and neither is
 * visible in a diff of an arithmetic expression that "looks about right".
 *
 * THE NORMAL TIER IS THE CASE THAT MATTERS. Its credential is ten
 * minutes against lessons that routinely run longer, which is why §L
 * makes refresh part of the API contract rather than an optimisation.
 * The 2-hour Premium case has slack; the 10-minute case has none.
 */
import { describe, expect, it } from 'vitest';
import { grantRefreshDelayMs } from './hooks/useLessonGrant';

/** A fixed "now", so every expectation below is arithmetic rather than timing. */
const NOW = Date.parse('2026-09-19T12:00:00.000Z');

function inSeconds(seconds: number): string {
  return new Date(NOW + seconds * 1000).toISOString();
}

describe('grant refresh delay', () => {
  it('refreshes a ten-minute Normal-tier credential well before it dies', () => {
    const delay = grantRefreshDelayMs(inSeconds(600), NOW);

    expect(delay).not.toBe(false);
    // 70% of 600s is 420s; the 60s safety margin caps it at 540s, so 70%
    // wins. What matters is that it lands inside the window with room for
    // the request itself.
    expect(delay).toBe(420_000);
    expect(delay as number).toBeLessThan(600_000 - 60_000);
  });

  it('leaves room for the request itself on a short credential', () => {
    // 70% of 90s would be 63s, only 27s before expiry. The safety margin
    // pulls it back to 30s, so the refresh has a full minute to land.
    expect(grantRefreshDelayMs(inSeconds(90), NOW)).toBe(30_000);
  });

  it('never schedules sooner than the floor, however little time is left', () => {
    // A credential already at (or past) its end must not become a request
    // loop: clock skew between a browser and the server is routine.
    expect(grantRefreshDelayMs(inSeconds(3), NOW)).toBe(10_000);
    expect(grantRefreshDelayMs(inSeconds(0), NOW)).toBe(10_000);
    expect(grantRefreshDelayMs(inSeconds(-3600), NOW)).toBe(10_000);
  });

  it('scales to the two-hour Premium credential instead of using a constant', () => {
    // The point of reading `expiresAt` rather than assuming a TTL: the
    // two tiers differ by more than an order of magnitude, and finding
    // D-3 exists because an optimistic figure was used once before.
    expect(grantRefreshDelayMs(inSeconds(7200), NOW)).toBe(7200 * 0.7 * 1000);
  });

  it('asks for nothing when there is no grant to refresh', () => {
    expect(grantRefreshDelayMs(undefined, NOW)).toBe(false);
    expect(grantRefreshDelayMs('not a date', NOW)).toBe(false);
  });
});
