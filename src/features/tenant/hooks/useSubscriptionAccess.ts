/**
 * Whether this tenant currently has working access, and why not if not.
 *
 * READS THE SAME AUTHORITY THE BACKEND ENFORCES ON, and reaches the same
 * conclusion by the same rule — `expired`/`cancelled`, or a trial whose
 * clock has run out. It is NOT the control: every mutation is refused
 * server-side by `SubscriptionAccessInterceptor` whatever this returns.
 * What this is for is telling the customer BEFORE they lose work typing
 * into a form that will be rejected.
 *
 * THE TRIAL CHECK IS AGAINST THE CLOCK, not `status` alone, for exactly the
 * reason the backend does the same: the sweep that flips `trialing` to
 * `expired` runs on a schedule, and between a trial ending and the sweep
 * noticing, `status` still reads `trialing` and is wrong. A UI that trusted
 * `status` would cheerfully show a working dashboard whose every save
 * failed.
 */
import { useMemo } from 'react';
import { useTenantSubscription } from './useTenantSubscription';
import type { TenantSubscription } from '@types';

/** Mirrors the backend's `SUBSCRIPTION_INACTIVE_STATUSES`. Grace period and past-due are deliberately absent from both. */
const INACTIVE_STATUSES: ReadonlySet<string> = new Set(['expired', 'cancelled']);

export type SubscriptionBlockReason = 'no_subscription' | 'expired' | 'trial_ended';

export interface SubscriptionAccess {
  /** False only when we are CERTAIN access is blocked — never while still loading. */
  readonly isBlocked: boolean;
  readonly reason?: SubscriptionBlockReason;
  readonly subscription?: TenantSubscription;
  readonly isLoading: boolean;
}

function isTrialOver(subscription: TenantSubscription, now: number): boolean {
  if (subscription.status !== 'trialing') return false;
  if (!subscription.trialEndsAt) return false;
  return new Date(subscription.trialEndsAt).getTime() <= now;
}

export function useSubscriptionAccess(): SubscriptionAccess {
  const { data, isLoading } = useTenantSubscription();

  return useMemo(() => {
    // Never block on incomplete information. A momentary loading state must
    // not flash a "your subscription ended" screen at a paying customer —
    // the backend is the one refusing anything, so being late here costs
    // nothing and being wrong here costs trust.
    if (isLoading) return { isBlocked: false, isLoading: true };

    if (!data) {
      /*
        NEVER SUBSCRIBED IS NOT LAPSED — and the backend draws the same
        line. Organization creation deliberately does not auto-start a
        trial, so a customer who is still setting themselves up has no
        subscription row yet and is doing nothing wrong. Telling them "your
        subscription has ended" would be both false and a rotten first
        impression.

        The writes that genuinely need an entitlement (creating an academy,
        a course) are refused by the limit checks with their own message.
      */
      return { isBlocked: false, reason: 'no_subscription', isLoading: false };
    }

    if (isTrialOver(data, Date.now())) {
      return {
        isBlocked: true,
        reason: 'trial_ended',
        subscription: data,
        isLoading: false,
      };
    }

    if (INACTIVE_STATUSES.has(data.status)) {
      return {
        isBlocked: true,
        reason: 'expired',
        subscription: data,
        isLoading: false,
      };
    }

    return { isBlocked: false, subscription: data, isLoading: false };
  }, [data, isLoading]);
}
