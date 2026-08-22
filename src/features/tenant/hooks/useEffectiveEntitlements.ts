/**
 * useEffectiveEntitlements hook.
 *
 * Composes the Tenant's subscription (for its `Plan`) with its active
 * Add-ons into the single derived `EffectiveEntitlements` result, through
 * `computeEffectiveEntitlements` — the ONLY place that calculation happens.
 * No page combines Plan + Add-on data itself.
 *
 * Deliberately not cached as its own query: it's a pure function of two
 * queries that are already cached (`useTenantSubscription`,
 * `useTenantAddOns`), so caching it again would just be a second source of
 * truth to keep in sync.
 */
import { useMemo } from 'react';
import { useAuth } from '@/shared/hooks';
import type { ApiError } from '@api';
import type { EffectiveEntitlements } from '@types';
import { useTenantSubscription } from './useTenantSubscription';
import { useTenantAddOns } from './useTenantAddOns';
import { computeEffectiveEntitlements } from '../utils/entitlement.utils';

export interface UseEffectiveEntitlementsResult {
  readonly data: EffectiveEntitlements | undefined;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly refetch: () => void;
}

export function useEffectiveEntitlements(): UseEffectiveEntitlementsResult {
  const { organization } = useAuth();
  const subscriptionQuery = useTenantSubscription();
  const addOnsQuery = useTenantAddOns();

  const data = useMemo<EffectiveEntitlements | undefined>(() => {
    if (!organization?.id || !subscriptionQuery.data || !addOnsQuery.data) {
      return undefined;
    }
    return computeEffectiveEntitlements(
      organization.id,
      subscriptionQuery.data.plan,
      addOnsQuery.data.map((tenantAddOn) => tenantAddOn.addOn)
    );
  }, [organization?.id, subscriptionQuery.data, addOnsQuery.data]);

  const refetch = () => {
    void subscriptionQuery.refetch();
    void addOnsQuery.refetch();
  };

  return {
    data,
    isLoading: subscriptionQuery.isLoading || addOnsQuery.isLoading,
    error: subscriptionQuery.error ?? addOnsQuery.error,
    refetch,
  };
}
