/**
 * Platform communications console hooks (P64 Communications C7).
 *
 * `useCommunicationsHealth` polls, deliberately. This page answers "is
 * mail going out right now?", and a stale snapshot is the one thing it
 * must never show — an operator staring at a frozen `oldestPendingSeconds`
 * would conclude the queue is fine while it silently backs up.
 */
import { useApiQuery, useApiMutation } from '@/shared/hooks';
import { platformCommunicationsKeys } from '@services/query';
import { platformCommunicationsService } from '../services/PlatformCommunicationsService';
import type {
  CommunicationSuppressionPage,
  PlatformCommunicationsHealth,
} from '@types';
import type { ApiError } from '@api';

/** Live enough to notice a stalled queue, slow enough not to hammer the API. */
const HEALTH_REFETCH_MS = 60_000;
const SUPPRESSION_PAGE_SIZE = 100;

export function useCommunicationsHealth(days: number) {
  return useApiQuery<PlatformCommunicationsHealth, ApiError>({
    queryKey: platformCommunicationsKeys.health(days),
    queryFn: () => platformCommunicationsService.getHealth(days),
    refetchInterval: HEALTH_REFETCH_MS,
  });
}

export function useCommunicationSuppressions(limit = SUPPRESSION_PAGE_SIZE) {
  return useApiQuery<CommunicationSuppressionPage, ApiError>({
    queryKey: platformCommunicationsKeys.suppressions(limit),
    queryFn: () => platformCommunicationsService.listSuppressions({ limit }),
  });
}

/**
 * Lifting a block is consequential: the address starts receiving mail
 * again, and if it hard-bounced that costs sender reputation. The UI
 * confirms first; this hook only performs it, then invalidates both the
 * list and the health counts so the two can never disagree.
 */
export function useUnsuppressAddress() {
  return useApiMutation<{ lifted: boolean }, string, ApiError>({
    mutationFn: (email: string) =>
      platformCommunicationsService.unsuppress(email),
    // Both the list and the health counts are derived from the same rows,
    // so they are invalidated together — a lifted block that still showed
    // in the count would read as a failed action.
    invalidateKeys: [platformCommunicationsKeys.all],
    successMessageKey: 'analytics:communications.suppressions.lifted',
  });
}
