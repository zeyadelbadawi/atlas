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
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { TenantSubscription } from '@types';

const useTenantSubscription = vi.fn();

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

function settled(data: TenantSubscription | undefined) {
  useTenantSubscription.mockReturnValue({ data, isLoading: false });
}

describe('useSubscriptionAccess', () => {
  /*
   * THE MOST IMPORTANT ONE. A momentary loading state must never flash
   * "your subscription has ended" at a customer who is paying — being late
   * here costs nothing, because the backend is what refuses anything.
   */
  it('never reports a block while the subscription is still loading', () => {
    useTenantSubscription.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useSubscriptionAccess());

    expect(result.current.isBlocked).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('does not block an active subscription', () => {
    settled(subscription({ status: 'active' }));
    expect(renderHook(() => useSubscriptionAccess()).result.current.isBlocked).toBe(
      false,
    );
  });

  it('does not block a trial that is still running', () => {
    settled(
      subscription({
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      }),
    );
    expect(renderHook(() => useSubscriptionAccess()).result.current.isBlocked).toBe(
      false,
    );
  });

  /*
   * The sweep that flips `trialing` to `expired` runs on a schedule, so
   * between a trial ending and the sweep noticing, `status` still reads
   * `trialing` and is wrong. A UI trusting `status` would show a working
   * dashboard whose every save failed — which is exactly the experience
   * this whole task exists to prevent.
   */
  it('blocks a trial whose clock ran out even while status still says trialing', () => {
    settled(
      subscription({
        status: 'trialing',
        trialEndsAt: new Date(Date.now() - 3_600_000).toISOString(),
      }),
    );

    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.reason).toBe('trial_ended');
  });

  it('blocks an expired subscription', () => {
    settled(subscription({ status: 'expired' }));
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.reason).toBe('expired');
  });

  it('blocks a cancelled subscription', () => {
    settled(subscription({ status: 'cancelled' }));
    expect(renderHook(() => useSubscriptionAccess()).result.current.reason).toBe(
      'expired',
    );
  });

  /*
   * A customer who has never subscribed is mid-onboarding, not lapsed.
   * Organization creation does not auto-start a trial, so this is the
   * ordinary state of a brand-new account — and "your subscription has
   * ended" is both false and a rotten first impression. The backend draws
   * the same line: `assertHasAccess` refuses lapses, and the limit checks
   * refuse the writes that actually need an entitlement.
   */
  it('does NOT block a customer who has never subscribed', () => {
    settled(undefined);
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.reason).toBe('no_subscription');
  });

  /*
   * A grace period exists so a tenant whose payment is late keeps working
   * while it is sorted out. Blocking it would punish the customer for the
   * gap between a failed charge and a retry, and would disagree with the
   * backend, which deliberately omits it too.
   */
  it('does NOT block during a grace period', () => {
    settled(subscription({ status: 'grace_period' }));
    expect(renderHook(() => useSubscriptionAccess()).result.current.isBlocked).toBe(
      false,
    );
  });

  it('does NOT block a past-due subscription', () => {
    settled(subscription({ status: 'past_due' }));
    expect(renderHook(() => useSubscriptionAccess()).result.current.isBlocked).toBe(
      false,
    );
  });
});
