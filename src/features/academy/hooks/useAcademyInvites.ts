/**
 * Academy invite hooks (P64 Phase 1).
 *
 * Invite links let a learner register on the academy website when the
 * registration policy is `invite` (they also work under other policies
 * as a direct, pre-approved path). The raw token is returned exactly
 * once, on creation — the list read never carries it, so the create
 * dialog is the only place it can be copied from.
 */
import {
  useApiMutation,
  useApiQuery,
  useAuth,
  useInvalidate,
  useAcademyBoundMutation,
} from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
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
    // Learners accept invites from their own browser; poll while shown so
    // the "used" count and status catch up without a manual refresh.
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}

export function useCreateAcademyInvite(academyId: string) {
  const { invalidate } = useInvalidate();
  const { organization } = useAuth();

  const mutation = useApiMutation<
    CreatedAcademyInvite,
    AcademyScopedVariables<CreateAcademyInvitePayload>,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      academyRosterService.createInvite(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidate(academyKeys.invites(organization?.id, academyId));
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}

export function useRevokeAcademyInvite(academyId: string) {
  const { invalidate } = useInvalidate();
  const { organization } = useAuth();

  const mutation = useApiMutation<
    void,
    AcademyScopedVariables<{ readonly inviteId: string }>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { inviteId } }) =>
      academyRosterService.revokeInvite(academyId, inviteId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidate(academyKeys.invites(organization?.id, academyId));
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
