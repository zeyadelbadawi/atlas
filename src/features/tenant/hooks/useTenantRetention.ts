/**
 * The hosted-video retention read (P64 C6, plan §31/§32).
 *
 * ONE AUTHORITY, for the reason `useSubscriptionLifecycleState` documents
 * at length and which matters more here: this hook is the only thing
 * standing between a customer and a wrong answer to "when is my content
 * deleted". The dates come from the backend's own evaluator — the same
 * pure function the sweep runs before it enqueues a deletion — so the
 * page cannot quote a date the automation disagrees with. Nothing is
 * re-derived locally, not even the day count.
 *
 * IT IS NOT A SECURITY CONTROL. The endpoint is owner-only server-side
 * and RLS-scoped underneath that; this hook merely asks.
 *
 * `enabled` on the organization id, exactly like the lifecycle read: an
 * account with no organization has nothing to ask about, and firing a
 * request at `/organizations/undefined/retention` would produce a 4xx the
 * page would then have to explain away as an error it is not.
 *
 * CALLERS MAY NARROW IT FURTHER. `LifecyclePanel` renders on every
 * dashboard page, and this read is not cheap — it counts every hosted
 * video in the organisation and the courses they belong to. That caller
 * passes `enabled: false` unless the subscription is in a state where a
 * retention window could exist at all AND the viewer holds the
 * owner-exclusive permission the endpoint itself requires, so a Manager
 * browsing the dashboard never provokes a 403 per page load.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { tenantKeys } from '@services/query';
import { tenantService } from '../services/TenantService';
import type { TenantRetention } from '@types';
import type { ApiError } from '@api';

export interface TenantRetentionQueryResult {
  readonly data?: TenantRetention;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly refetch: () => void;
  /** True when the account has no organization — a real state, not a failure. */
  readonly hasNoOrganization: boolean;
}

export interface UseTenantRetentionOptions {
  /** Defaults to true. ANDed with "this account has an organization". */
  readonly enabled?: boolean;
}

export function useTenantRetention(
  options: UseTenantRetentionOptions = {}
): TenantRetentionQueryResult {
  const { organization } = useAuth();
  const hasNoOrganization = !organization?.id;
  const enabled = (options.enabled ?? true) && !hasNoOrganization;

  const query = useApiQuery<TenantRetention, ApiError>({
    queryKey: tenantKeys.retention(organization?.id),
    queryFn: () => tenantService.getRetention(organization!.id),
    enabled,
  });

  return {
    data: query.data,
    isLoading: enabled ? query.isLoading : false,
    error: query.error ?? null,
    refetch: () => void query.refetch(),
    hasNoOrganization,
  };
}
