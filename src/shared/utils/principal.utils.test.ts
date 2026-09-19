/**
 * P64 Phase 1 — the routing predicates, including the `surface.enforce`
 * staged rollout (§T).
 *
 * These are not the control. The backend refuses a learner a management
 * session and refuses learner tokens on every management controller; this
 * only decides whether the product renders a workspace the API would
 * refuse anyway. During a staged rollout the API does NOT refuse a learner
 * the rollout has not reached, and the interface has to follow the
 * server's answer rather than strand them in the academy chooser.
 */
import { describe, expect, it } from 'vitest';
import { isLearnerPrincipal, isManagementPrincipal } from './principal.utils';

describe('isLearnerPrincipal', () => {
  it('is true for a learner the backend is actually refusing', () => {
    expect(
      isLearnerPrincipal({ principalKind: 'learner', managementSurfaceEnforced: true })
    ).toBe(true);
  });

  it('is true for a learner on a response that predates the rollout field', () => {
    expect(isLearnerPrincipal({ principalKind: 'learner' })).toBe(true);
  });

  it('is false for a learner the rollout has not reached', () => {
    expect(
      isLearnerPrincipal({ principalKind: 'learner', managementSurfaceEnforced: false })
    ).toBe(false);
  });

  it('is false for every other principal kind, in both rollout states', () => {
    for (const kind of ['staff', 'platform_owner', 'unaffiliated'] as const) {
      for (const enforced of [true, false]) {
        expect(
          isLearnerPrincipal({
            principalKind: kind,
            managementSurfaceEnforced: enforced,
          })
        ).toBe(false);
      }
    }
  });

  it('is false with no user at all', () => {
    expect(isLearnerPrincipal(undefined)).toBe(false);
    expect(isLearnerPrincipal(null)).toBe(false);
  });
});

describe('isManagementPrincipal', () => {
  it('admits staff, platform owners and brand-new unaffiliated accounts', () => {
    for (const kind of ['staff', 'platform_owner', 'unaffiliated'] as const) {
      expect(isManagementPrincipal({ principalKind: kind })).toBe(true);
    }
  });

  it('refuses a learner and anyone not signed in', () => {
    expect(isManagementPrincipal({ principalKind: 'learner' })).toBe(false);
    expect(isManagementPrincipal(undefined)).toBe(false);
  });
});
