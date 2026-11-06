/**
 * useAddCustomDomain hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { INLINE_ERRORS_META, domainKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  AcademyDomainConfiguration,
  AddCustomDomainPayload,
} from '@types';
import { domainService } from '../services/DomainService';

export interface AddCustomDomainVariables {
  readonly academyId: string;
  readonly payload: AddCustomDomainPayload;
}

export function useAddCustomDomain() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    AcademyDomainConfiguration,
    AddCustomDomainVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      domainService.addCustomDomain(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    // B2 (UX audit) — the domain tab shows the failure itself (on the
    // hostname field, or one toast with the reason); the app-wide reporter
    // used to add a second toast.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_data, variables) => {
      await invalidate(domainKeys.configuration(variables.academyId));
    },
  });
}
