/**
 * useUpdateCommunicationPreferences hook.
 *
 * OPTIMISTIC, WITH ROLLBACK. Every control in the matrix is a direct
 * switch or select — there is no Save button to wait behind — so the
 * cached preferences are patched the moment the control moves, and put
 * back exactly as they were if the request fails. The toast on either
 * outcome is the only other feedback a flipped switch gets, which is why
 * both are on here (unlike `useUpdateNotificationPreferences`, whose page
 * renders its own inline state).
 *
 * The rollback restores the PREVIOUS SNAPSHOT rather than refetching: a
 * refetch would briefly show the wrong (optimistic) state to a person who
 * has just been told the change failed. The settled invalidation still
 * runs afterwards, so a change that raced this one is reconciled.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAuth } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import type { ApiError } from '@api';
import type {
  CommunicationPreferences,
  CommunicationPreferencesUpdate,
} from '@types';

interface OptimisticContext {
  readonly previous: CommunicationPreferences | undefined;
}

/** Applies a PATCH body to a cached snapshot, the way the server will. */
export function applyCommunicationPreferencesUpdate(
  current: CommunicationPreferences,
  update: CommunicationPreferencesUpdate
): CommunicationPreferences {
  return {
    language: update.language ?? current.language,
    categories: {
      ...current.categories,
      lifecycle: update.lifecycle
        ? { ...current.categories.lifecycle, reminders: update.lifecycle.reminders }
        : current.categories.lifecycle,
      engagement: update.engagement ?? current.categories.engagement,
      operational:
        current.categories.operational && update.operational
          ? update.operational
          : current.categories.operational,
    },
  };
}

export function useUpdateCommunicationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = notificationKeys.communicationPreferences(user?.id);

  return useApiMutation<
    CommunicationPreferences,
    CommunicationPreferencesUpdate,
    ApiError,
    OptimisticContext
  >({
    mutationFn: (payload) =>
      notificationService.updateCommunicationPreferences(payload),
    successMessageKey: 'notifications:communication.saved',
    errorMessageKey: 'notifications:communication.saveFailed',
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<CommunicationPreferences>(queryKey);
      if (previous) {
        queryClient.setQueryData<CommunicationPreferences>(
          queryKey,
          applyCommunicationPreferencesUpdate(previous, update)
        );
      }
      return { previous };
    },
    onError: (_error, _update, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (data) => {
      // The server's answer is authoritative; it replaces the optimistic
      // guess before the invalidation below confirms it.
      queryClient.setQueryData(queryKey, data);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}
