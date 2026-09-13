/**
 * THE lifecycle read (Phase 11) — where the customer is in the Atlas
 * lifecycle, decided by the backend.
 *
 * WHY THIS REPLACED A LOCAL DERIVATION. `useSubscriptionAccess` used to
 * compute the answer here, mirroring the backend's status interpretation
 * by hand: the same inactive-status set, the same live trial-clock check.
 * The mirroring was accurate, which is exactly what made it dangerous —
 * when the backend's model turned out to be wrong (a brand-new
 * Organization carried `status: 'expired'`, so every new customer was
 * greeted as a lapsed one), the frontend reproduced that judgement
 * perfectly. Two hand-synchronised copies of a rule agree about being
 * wrong just as reliably as about being right.
 *
 * Now there is one authority. `GET /organizations/:id/subscription/
 * lifecycle` is computed by `SubscriptionAccessService` — the very
 * service `SubscriptionAccessInterceptor` enforces with — so the screen
 * and the API that will accept or refuse the write cannot disagree.
 *
 * IT IS NOT A SECURITY CONTROL. Nothing here grants access. Every
 * mutation is refused independently server-side, with RLS underneath
 * that. This exists so the product can tell the customer the truth
 * BEFORE they fill in a form that was always going to be rejected.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { tenantKeys } from '@services/query';
import { tenantService } from '../services/TenantService';
import type { SubscriptionLifecycleState } from '@types';
import type { ApiError } from '@api';

export interface LifecycleQueryResult {
  readonly state?: SubscriptionLifecycleState;
  readonly isLoading: boolean;
  /**
   * True when the account has no Organization at all, which is a real
   * lifecycle state and NOT an error — there is simply nothing to ask the
   * API about yet. Callers render the "create your organization" step.
   */
  readonly hasNoOrganization: boolean;
}

export function useSubscriptionLifecycleState(): LifecycleQueryResult {
  const { organization } = useAuth();
  const hasNoOrganization = !organization?.id;

  const query = useApiQuery<SubscriptionLifecycleState, ApiError>({
    queryKey: tenantKeys.lifecycle(organization?.id),
    queryFn: () => tenantService.getLifecycle(organization!.id),
    enabled: !hasNoOrganization,
  });

  return {
    state: hasNoOrganization
      ? // Synthesised locally rather than fetched, because no endpoint
        // could answer it: the question "does this account have an
        // organization?" is settled before any organization-scoped URL
        // can even be formed. `trialAvailable: false` is the honest
        // conservative answer here — eligibility is a real backend
        // decision and this path has not asked it.
        {
          lifecycle: 'no_organization',
          hasAccess: false,
          trialAvailable: false,
        }
      : query.data,
    isLoading: hasNoOrganization ? false : query.isLoading,
    hasNoOrganization,
  };
}
