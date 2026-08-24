/**
 * useOrganization hook.
 *
 * Fetches the active organization's own entity data (name/slug/status/
 * owner/timestamps). Mirrors `useTenantSubscription`'s pattern exactly:
 * keyed off the session's real active organization, so it refetches
 * automatically on organization switch and never diverges from what's
 * actually in view.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { organizationKeys } from '@services/query';
import { organizationService } from '../services/OrganizationService';
import type { Organization } from '@types';
import type { ApiError } from '@api';

export function useOrganization() {
  const { organization } = useAuth();

  return useApiQuery<Organization, ApiError>({
    queryKey: organizationKeys.detail(organization?.id ?? ''),
    queryFn: () => organizationService.getById(organization!.id),
    enabled: !!organization?.id,
  });
}
