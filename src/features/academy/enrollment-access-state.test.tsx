/**
 * P64 Phase 1 — the two places where a learner's access state has to be
 * shown honestly, both found in real browser validation rather than by a
 * test:
 *
 *  1. The staff drawer labelled an EXPIRED enrollment "Enrolled", because
 *     the label was derived from `status` alone and an expired enrollment
 *     keeps that status.
 *  2. "My Learning" offered a Start Course button on an enrollment the
 *     backend then refused.
 *
 * Neither is a security control — the backend refuses the content either
 * way, and these tests must not be read as one. What they pin is that the
 * interface reports the backend's answer instead of contradicting it.
 */
import { describe, expect, it } from 'vitest';
import { getRosterEnrollmentLabelKey } from './utils/academy-roster.utils';

const NOW = new Date('2026-09-18T12:00:00.000Z');

describe('roster enrollment label', () => {
  it('names an enrollment whose access window has closed "expired", not "enrolled"', () => {
    expect(
      getRosterEnrollmentLabelKey(
        { status: 'enrolled', expiresAt: '2026-09-17T23:59:59.999Z' },
        NOW
      )
    ).toBe('academy:students.enrollment.expired');
  });

  it('still reports a live enrollment by its status', () => {
    expect(
      getRosterEnrollmentLabelKey(
        { status: 'enrolled', expiresAt: '2026-12-31T23:59:59.999Z' },
        NOW
      )
    ).toBe('instructor:students.enrollmentStatus.enrolled');
    expect(getRosterEnrollmentLabelKey({ status: 'enrolled' }, NOW)).toBe(
      'instructor:students.enrollmentStatus.enrolled'
    );
  });

  it('keeps a completed course completed even after its access window closes', () => {
    // Finishing a course is not undone by the access window ending later.
    expect(
      getRosterEnrollmentLabelKey(
        { status: 'completed', expiresAt: '2026-09-17T23:59:59.999Z' },
        NOW
      )
    ).toBe('instructor:students.enrollmentStatus.completed');
  });

  it('reports revocation ahead of everything else', () => {
    expect(
      getRosterEnrollmentLabelKey(
        {
          status: 'enrolled',
          revokedAt: '2026-09-18T09:00:00.000Z',
          expiresAt: '2026-12-31T23:59:59.999Z',
        },
        NOW
      )
    ).toBe('academy:students.enrollment.revoked');
  });
});
