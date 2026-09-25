/**
 * The Platform Owner's deletion hooks.
 *
 * Two deliberate choices here.
 *
 * The plan is fetched ONLY when a dialog is actually open (`enabled`).
 * Deleting a user is rare and the plan reads across every academy they
 * own, so fetching it for every row of a directory would be a lot of work
 * for a question nobody asked.
 *
 * The mutation suppresses the automatic toasts. A deletion's outcome is
 * reported inside the dialog, next to the thing that was deleted, because
 * a toast that disappears after four seconds is the wrong place to tell
 * somebody an irreversible act succeeded — or, worse, that it failed
 * halfway.
 */
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { platformUserKeys } from '@services/query';
import {
  platformUserManagementService,
  type DeleteUserPayload,
} from '../services/PlatformUserManagementService';
import type { DeleteUserResult, DeletionPlan } from '@types';
import type { ApiError } from '@api';

export interface UseUserDeletionPlanOptions {
  /** False while the dialog is closed, so nothing is fetched speculatively. */
  readonly enabled?: boolean;
}

export function useUserDeletionPlan(
  userId: string,
  options?: UseUserDeletionPlanOptions
) {
  return useApiQuery<DeletionPlan, ApiError>({
    queryKey: platformUserKeys.deletionPlan(userId),
    queryFn: () => platformUserManagementService.getDeletionPlan(userId),
    enabled: Boolean(userId) && options?.enabled !== false,
    // Always re-read when the dialog opens. A plan cached from an earlier
    // visit could describe academies that have since been archived, and
    // the whole point of the plan is that it matches reality.
    staleTime: 0,
  });
}

export interface UseDeleteUserVariables {
  readonly userId: string;
  readonly payload: DeleteUserPayload;
}

export function useDeleteUserAsPlatformOwner() {
  return useApiMutation<DeleteUserResult, UseDeleteUserVariables, ApiError>({
    mutationFn: ({ userId, payload }) =>
      platformUserManagementService.deleteUser(userId, payload),
    // The directory, the detail view and the plan all describe an account
    // that has just changed shape, so all three are invalidated together.
    invalidateKeys: [platformUserKeys.all],
    showSuccessToast: false,
    showErrorToast: false,
  });
}
