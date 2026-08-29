/**
 * useCreateOrganization hook.
 *
 * Mutation hook for creating a new Organization (Phase P19 — see
 * `OrganizationService.create`'s own doc comment). Mirrors
 * `useCreateAcademy` exactly: page shows its own contextual toast, so the
 * mutation's generic ones are suppressed.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { organizationKeys } from '@services/query';
import type { ApiError } from '@api';
import { organizationService } from '../services/OrganizationService';
import type { CreateOrganizationPayload, Organization } from '@types';

export function useCreateOrganization() {
  const { invalidate } = useInvalidate();

  return useApiMutation<Organization, CreateOrganizationPayload, ApiError>({
    mutationFn: (payload) => organizationService.create(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(organizationKeys.all);
    },
  });
}
