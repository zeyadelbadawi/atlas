/**
 * useCommunicationPreferences hook.
 *
 * `users/me/communication-preferences` — the per-category email matrix
 * (`CommunicationPreferences`), distinct from the legacy channel triple
 * `useNotificationPreferences` still serves the platform defaults page.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import type { CommunicationPreferences } from '@types';
import type { ApiError } from '@api';

export function useCommunicationPreferences() {
  const { user } = useAuth();

  return useApiQuery<CommunicationPreferences, ApiError>({
    queryKey: notificationKeys.communicationPreferences(user?.id),
    queryFn: () => notificationService.getCommunicationPreferences(),
    enabled: !!user,
  });
}
