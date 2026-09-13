/**
 * Whether this tenant currently has working access, and why not if not.
 *
 * READS THE BACKEND'S ANSWER — it no longer computes its own. Until Phase
 * 11 this hook reimplemented the server's status interpretation locally
 * (the same inactive-status set, the same live trial-clock check) and the
 * two were kept in step by hand. They agreed faithfully, including about
 * the thing they were both wrong about: a brand-new Organization carried
 * `status: 'expired'`, so this hook confidently told every new customer
 * their subscription had ended. A second copy of a rule cannot catch the
 * first copy's mistake; it can only reproduce it.
 *
 * It is NOT the control: every mutation is refused server-side by
 * `SubscriptionAccessInterceptor` whatever this returns. What this is for
 * is telling the customer BEFORE they lose work typing into a form that
 * will be rejected.
 *
 * Kept as a thin adapter over `useSubscriptionLifecycleState` rather than
 * deleted, because the existing banner/guard call sites read exactly this
 * shape and rewriting them all to learn the richer vocabulary at once
 * would be a much larger, riskier change than the bug warranted.
 */
import { useMemo } from 'react';
import { useSubscriptionLifecycleState } from './useSubscriptionLifecycleState';
import { useTenantSubscription } from './useTenantSubscription';
import type { TenantSubscription } from '@types';

export type SubscriptionBlockReason =
  | 'no_subscription'
  /** A new customer who has not chosen a plan. Never presented as a lapse. */
  | 'no_plan'
  | 'expired'
  | 'trial_ended';

export interface SubscriptionAccess {
  /** False only when we are CERTAIN access is blocked — never while still loading. */
  readonly isBlocked: boolean;
  readonly reason?: SubscriptionBlockReason;
  readonly subscription?: TenantSubscription;
  readonly isLoading: boolean;
}

export function useSubscriptionAccess(): SubscriptionAccess {
  const { state, isLoading } = useSubscriptionLifecycleState();
  // Still fetched so callers that show plan name / dates keep working.
  // Never consulted to decide blocking — that is `state`'s job alone.
  const { data: subscription } = useTenantSubscription();

  return useMemo(() => {
    // Never block on incomplete information. A momentary loading state must
    // not flash a "your subscription ended" screen at a paying customer —
    // the backend is the one refusing anything, so being late here costs
    // nothing and being wrong here costs trust.
    if (isLoading || !state) return { isBlocked: false, isLoading: true };

    switch (state.lifecycle) {
      /*
        NEITHER OF THESE IS A LAPSE, and neither blocks. An account still
        choosing a plan — or one that has not created an Organization yet
        — is mid-onboarding and doing nothing wrong. Telling them "your
        subscription has ended" would be both false and a rotten first
        impression. The writes that genuinely need an entitlement are
        refused by the entitlement checks with their own message.
      */
      case 'no_organization':
        return { isBlocked: false, isLoading: false };
      case 'no_plan':
        return { isBlocked: false, reason: 'no_plan', subscription, isLoading: false };

      case 'trial_expired':
        return {
          isBlocked: true,
          reason: 'trial_ended',
          subscription,
          isLoading: false,
        };

      case 'expired':
        return { isBlocked: true, reason: 'expired', subscription, isLoading: false };

      // `trialing`, `active` and `cancelled_active` all have working
      // access. A cancellation that still has paid time left is emphatically
      // not expired, and must never be shown as such.
      default:
        return { isBlocked: false, subscription, isLoading: false };
    }
  }, [state, isLoading, subscription]);
}
