/**
 * Academy registration policy hooks (P64 Phase 1).
 *
 * `open` — anyone can sign up on the academy website; `invite` — only
 * with a valid invite link; `approval` — sign-ups wait as `pending` until
 * an Owner/Manager approves them on the Students roster.
 *
 * Reading is Owner/Manager; changing it is Client Owner only (Managers
 * get `errors.academy.insufficientRole`). The card disables the save for
 * non-owners up front AND still maps the 403, because the role on the
 * session is a hint — the server decides.
 */
import { useApiMutation, useApiQuery, useAuth, useInvalidate } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyRosterService } from '../services/AcademyRosterService';
import type {
  AcademyRegistrationPolicySettings,
  UpdateAcademyRegistrationPolicyPayload,
} from '@types';

export interface UseAcademyRegistrationPolicyOptions {
  readonly enabled?: boolean;
}

export function useAcademyRegistrationPolicy(
  academyId: string,
  options?: UseAcademyRegistrationPolicyOptions
) {
  const { enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<AcademyRegistrationPolicySettings, ApiError>({
    queryKey: academyKeys.registrationPolicy(organization?.id, academyId),
    queryFn: () => academyRosterService.getRegistrationPolicy(academyId),
    enabled: enabled && !!academyId,
  });
}

export function useUpdateAcademyRegistrationPolicy(academyId: string) {
  const { invalidate } = useInvalidate();
  const { organization } = useAuth();

  return useApiMutation<
    AcademyRegistrationPolicySettings,
    UpdateAcademyRegistrationPolicyPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      academyRosterService.updateRegistrationPolicy(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(
        academyKeys.registrationPolicy(organization?.id, academyId)
      );
    },
  });
}
