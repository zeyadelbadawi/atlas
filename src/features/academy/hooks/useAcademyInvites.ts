/**
 * Academy invite hooks (P64 Phase 1).
 *
 * Invite links let a learner register on the academy website when the
 * registration policy is `invite` (they also work under other policies
 * as a direct, pre-approved path). The raw token is returned exactly
 * once, on creation — the list read never carries it, so the create
 * dialog is the only place it can be copied from.
 */
import { useApiMutation, useApiQuery, useAuth, useInvalidate } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyRosterService } from '../services/AcademyRosterService';
import type {
  AcademyInvite,
  CreateAcademyInvitePayload,
  CreatedAcademyInvite,
} from '@types';

export interface UseAcademyInvitesOptions {
  readonly enabled?: boolean;
}

export function useAcademyInvites(
  academyId: string,
  options?: UseAcademyInvitesOptions
) {
  const { enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<readonly AcademyInvite[], ApiError>({
    queryKey: academyKeys.invites(organization?.id, academyId),
    queryFn: () => academyRosterService.getInvites(academyId),
    enabled: enabled && !!academyId,
  });
}

export function useCreateAcademyInvite(academyId: string) {
  const { invalidate } = useInvalidate();
  const { organization } = useAuth();

  return useApiMutation<
    CreatedAcademyInvite,
    CreateAcademyInvitePayload,
    ApiError
  >({
    mutationFn: (payload) =>
      academyRosterService.createInvite(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(academyKeys.invites(organization?.id, academyId));
    },
  });
}

export function useRevokeAcademyInvite(academyId: string) {
  const { invalidate } = useInvalidate();
  const { organization } = useAuth();

  return useApiMutation<void, { readonly inviteId: string }, ApiError>({
    mutationFn: ({ inviteId }) =>
      academyRosterService.revokeInvite(academyId, inviteId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(academyKeys.invites(organization?.id, academyId));
    },
  });
}
