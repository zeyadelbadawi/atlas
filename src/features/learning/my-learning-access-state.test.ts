/**
 * P64 Phase 1 — "My Learning" must not offer an action the backend will
 * refuse. Found in real browser validation: a learner whose enrollment
 * had been revoked still saw an enabled "Start Course" button, which led
 * straight into a 404.
 *
 * This is NOT a security control and must not be read as one — every
 * content read is refused server-side for a revoked or expired
 * enrollment, and that refusal is what protects the content. What this
 * pins is that the card reports the backend's own answer (`isActive`)
 * instead of re-deriving one from `status`, which stays `enrolled` on an
 * enrollment whose access window has already closed.
 */
import { describe, expect, it } from 'vitest';
import { isEnrollmentAccessEnded } from './utils/learning-status.utils';

describe('isEnrollmentAccessEnded', () => {
  it('leaves a live enrollment actionable', () => {
    expect(isEnrollmentAccessEnded({ status: 'enrolled', isActive: true })).toBe(false);
  });

  it('ends the action on a revoked enrollment', () => {
    expect(isEnrollmentAccessEnded({ status: 'unavailable', isActive: false })).toBe(true);
  });

  it('ends the action on an expired enrollment whose status still reads enrolled', () => {
    expect(isEnrollmentAccessEnded({ status: 'enrolled', isActive: false })).toBe(true);
  });

  it('keeps a completed course reachable after its access window closes', () => {
    expect(isEnrollmentAccessEnded({ status: 'completed', isActive: false })).toBe(false);
  });

  it('treats a response without the field as actionable rather than guessing', () => {
    // An older backend that does not send `isActive` must not silently
    // lock every card; the server still refuses anything it should.
    expect(isEnrollmentAccessEnded({ status: 'enrolled' })).toBe(false);
  });
});
