/**
 * useAcademy hook.
 *
 * Fetches a single academy by ID using TanStack Query.
 *
 * Also reconciles `session.organization` to whichever org actually owns
 * this Academy. `organization` normally comes from `sessionService`'s
 * `isPrimary`-membership default (or a token refresh silently re-applying
 * that default) — neither is ever route-aware, so a user with memberships
 * in more than one Organization who navigates straight to a non-primary
 * org's Academy would see the org-switcher header keep showing their
 * primary org while every org-scoped hook downstream (most notably
 * `useProvisioningRequest`, which polls by `organization.id`) silently
 * operates on the wrong org — reproduced live as a provisioning-status
 * page that never observed its own request's terminal status. This is
 * the one shared data source every `:academyId`-scoped page already
 * calls, so fixing it here fixes the header/downstream-hook mismatch
 * everywhere at once, reusing `switchOrganization`'s existing membership
 * validation/localStorage-persistence/cache-invalidation — no new state.
 */
import { useEffect } from 'react';
import { useApiQuery, useAuth } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import { academyService } from '../services/AcademyService';
import type { Academy } from '@types';

export interface UseAcademyOptions {
  readonly enabled?: boolean;
}

export function useAcademy(academyId: string, options?: UseAcademyOptions) {
  const { enabled = true } = options ?? {};
  const { organization, switchOrganization } = useAuth();

  const query = useApiQuery<Academy>({
    queryKey: academyKeys.detail(organization?.id, academyId),
    queryFn: () => academyService.getAcademy(academyId),
    enabled: enabled && !!academyId,
  });

  const fetchedOrganizationId = query.data?.organizationId;
  useEffect(() => {
    if (
      fetchedOrganizationId &&
      organization?.id &&
      fetchedOrganizationId !== organization.id
    ) {
      switchOrganization(fetchedOrganizationId);
    }
  }, [fetchedOrganizationId, organization?.id, switchOrganization]);

  return query;
}
