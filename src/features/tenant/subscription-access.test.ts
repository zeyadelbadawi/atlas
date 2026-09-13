/**
 * The client's read of subscription access.
 *
 * This is NOT the control — `SubscriptionAccessInterceptor` refuses every
 * mutation server-side whatever this returns, and that is asserted in
 * `subscription-expiration-enforcement.e2e-spec.ts`. What this decides is
 * whether a customer is TOLD before they lose work typing into a form that
 * will be rejected, and whether a paying customer is ever shown a lapse
 * notice they have not earned.
 *
 * The two failure modes it guards are opposite and both bad: reporting a
 * block that is not real (a paying customer told their subscription ended)
 * and missing one that is (a lapsed customer discovering it only when a
 * save fails).
 *
 * WHAT CHANGED IN PHASE 11, AND WHERE THE OLD ASSERTIONS WENT. This hook
 * used to DERIVE the answer from the raw subscription — its own copy of
 * the inactive-status set, its own live trial-clock check — kept in step
 * with the backend by hand. The two agreed faithfully, including about
 * the thing they were both wrong about: a brand-new Organization carried
 * `status: 'expired'`, so this hook confidently told every new customer
 * their subscription had ended.
 *
 * The rules now live in ONE place, server-side, and the cases this file
 * used to own (a trial whose clock ran out before the sweep noticed;
 * grace-period and past-due staying usable; cancelled counting as
 * expired) are asserted directly against that authority in
 * `subscription-access.service.spec.ts`. Re-asserting them here would be
 * re-creating the second copy whose existence was the original problem.
 *
 * What remains this hook's job — and so what this file tests — is
 * faithful TRANSLATION: never blocking on incomplete information, and
 * never turning a state that is merely "not started" into a lapse.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SubscriptionLifecycleState, TenantSubscription } from '@types';

const useSubscriptionLifecycleState = vi.fn();
const useTenantSubscription = vi.fn();

vi.mock('./hooks/useSubscriptionLifecycleState', () => ({
  useSubscriptionLifecycleState: () => useSubscriptionLifecycleState() as unknown,
}));

vi.mock('./hooks/useTenantSubscription', () => ({
  useTenantSubscription: () => useTenantSubscription() as unknown,
}));

const { useSubscriptionAccess } = await import('./hooks/useSubscriptionAccess');

afterEach(() => vi.clearAllMocks());

function subscription(
  overrides: Partial<TenantSubscription> = {},
): TenantSubscription {
  return {
    organizationId: 'org-1',
    status: 'active',
    planId: 'plan-1',
    plan: { id: 'plan-1', key: 'growth', name: 'Growth' },
    cancelAtPeriodEnd: false,
    ...overrides,
  } as TenantSubscription;
}

/** The backend has answered with this lifecycle. */
function settled(
  lifecycle: SubscriptionLifecycleState['lifecycle'],
  extra: Partial<SubscriptionLifecycleState> = {},
) {
  useSubscriptionLifecycleState.mockReturnValue({
    state: {
      lifecycle,
      hasAccess: !['no_plan', 'trial_expired', 'expired', 'no_organization'].includes(
        lifecycle,
      ),
      trialAvailable: false,
      ...extra,
    },
    isLoading: false,
    hasNoOrganization: lifecycle === 'no_organization',
  });
  useTenantSubscription.mockReturnValue({ data: subscription(), isLoading: false });
}

describe('useSubscriptionAccess', () => {
  /*
   * THE MOST IMPORTANT ONE. A momentary loading state must never flash
   * "your subscription has ended" at a customer who is paying — being late
   * here costs nothing, because the backend is what refuses anything.
   */
  it('never reports a block while the lifecycle is still loading', () => {
    useSubscriptionLifecycleState.mockReturnValue({
      state: undefined,
      isLoading: true,
      hasNoOrganization: false,
    });
    useTenantSubscription.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useSubscriptionAccess());

    expect(result.current.isBlocked).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('does not block an active subscription', () => {
    settled('active');
    expect(renderHook(() => useSubscriptionAccess()).result.current.isBlocked).toBe(
      false,
    );
  });

  it('does not block a trial that is still running', () => {
    settled('trialing', { trialDaysRemaining: 2 });
    expect(renderHook(() => useSubscriptionAccess()).result.current.isBlocked).toBe(
      false,
    );
  });

  it('blocks an ended trial, and says it was the TRIAL that ended', () => {
    settled('trial_expired');
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.reason).toBe('trial_ended');
  });

  it('blocks a lapsed paid subscription, distinctly from an ended trial', () => {
    settled('expired');
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.reason).toBe('expired');
    // The distinction is the whole point of Phase 11.
    expect(result.current.reason).not.toBe('trial_ended');
  });

  /*
   * THE REGRESSION THIS PHASE EXISTS TO PREVENT. A customer who has never
   * chosen a plan is mid-onboarding, not lapsed. Organization creation
   * does not auto-start a trial, so this is the ordinary state of a
   * brand-new account — and "your subscription has ended" is both false
   * and a rotten first impression.
   */
  it('does NOT block, and does NOT call it a lapse, for a customer with no plan yet', () => {
    settled('no_plan');
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.reason).toBe('no_plan');
    expect(result.current.reason).not.toBe('expired');
  });

  it('does NOT block an account that has no organization yet', () => {
    settled('no_organization');
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.reason).toBeUndefined();
  });

  /*
   * A cancellation that still has paid time left is emphatically not
   * expired: the customer bought that time and keeps it. Showing it as a
   * lapse would be a lie about something they paid for.
   */
  it('does NOT block a cancelled subscription that is still within its paid period', () => {
    settled('cancelled_active', {
      currentPeriodEnd: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    });
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.reason).toBeUndefined();
  });
});
