/**
 * The student's Live Sessions reads.
 *
 * ELIGIBILITY IS POLLED, and that is a product decision rather than a
 * technical one. A student sitting on a session page at 09:58 must see the
 * page come alive at 10:00 without being told to refresh — the whole
 * value of a "join" button is that it appears when joining is possible.
 * Polling stops once the session has ended, because nothing can change
 * after that and a browser left open overnight should not keep asking.
 */
import { useApiQuery } from '@/shared/hooks';
import { liveSessionKeys } from '@services/query';
import { studentLiveSessionService } from '../services/StudentLiveSessionService';
import type { LiveSessionEligibility, StudentLiveSession } from '@types';
import type { ApiError } from '@api';

/** How often the join gate is re-checked while a session is still ahead. */
const ELIGIBILITY_POLL_MS = 30_000;

export function useStudentCourseLiveSessions(courseId: string | undefined) {
  return useApiQuery<readonly StudentLiveSession[], ApiError>({
    queryKey: liveSessionKeys.studentForCourse(courseId),
    queryFn: () => studentLiveSessionService.listForCourse(courseId!),
    enabled: Boolean(courseId),
  });
}

export function useLiveSessionEligibility(liveSessionId: string | undefined) {
  return useApiQuery<LiveSessionEligibility, ApiError>({
    queryKey: liveSessionKeys.studentEligibility(liveSessionId),
    queryFn: () => studentLiveSessionService.getEligibility(liveSessionId!),
    enabled: Boolean(liveSessionId),
    // A stale "too early" is the one answer that makes the page useless,
    // so this read is never served from cache.
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data as LiveSessionEligibility | undefined;
      if (!data) return ELIGIBILITY_POLL_MS;
      // Terminal states: nothing the clock does will change the answer.
      if (data.status === 'ended' || data.status === 'cancelled') return false;
      return ELIGIBILITY_POLL_MS;
    },
  });
}
