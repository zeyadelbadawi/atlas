/**
 * Live Sessions data hooks.
 *
 * `useLiveSessionsStatus` is the one every Live Sessions surface reads
 * first: it reports the four dependencies separately (entitlement,
 * installation, provider connection, recording allowance) so a screen can
 * say WHICH one is missing instead of failing generically.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { liveSessionKeys } from '@services/query';
import { liveSessionService } from '../services/LiveSessionService';
import type {
  CreateLiveSessionInput,
  LiveSession,
  LiveSessionsStatus,
  ParticipantAttendance,
  UpdateLiveSessionInput,
} from '@types';
import type { ApiError } from '@api';

export function useLiveSessionsStatus(academyId: string | undefined) {
  return useApiQuery<LiveSessionsStatus, ApiError>({
    queryKey: liveSessionKeys.status(academyId),
    queryFn: () => liveSessionService.getStatus(academyId!),
    enabled: Boolean(academyId),
  });
}

export function useCourseLiveSessions(
  academyId: string | undefined,
  courseId: string | undefined,
) {
  return useApiQuery<readonly LiveSession[], ApiError>({
    queryKey: liveSessionKeys.forCourse(academyId, courseId),
    queryFn: () => liveSessionService.listForCourse(academyId!, courseId!),
    enabled: Boolean(academyId && courseId),
  });
}

export function useSessionAttendance(
  academyId: string | undefined,
  liveSessionId: string | undefined,
) {
  return useApiQuery<readonly ParticipantAttendance[], ApiError>({
    queryKey: liveSessionKeys.attendance(academyId, liveSessionId),
    queryFn: () => liveSessionService.getAttendance(academyId!, liveSessionId!),
    enabled: Boolean(academyId && liveSessionId),
  });
}

/**
 * Invalidates the curriculum read after any session change.
 *
 * Also invalidates the status read, because creating a recorded session
 * moves the recording allowance — leaving that stale would show a
 * customer a quota that has already been spent.
 */
function useInvalidateLiveSessions(
  academyId: string | undefined,
  courseId: string | undefined,
) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: liveSessionKeys.forCourse(academyId, courseId),
    });
    void queryClient.invalidateQueries({
      queryKey: liveSessionKeys.status(academyId),
    });
  };
}

export function useCreateLiveSession(
  academyId: string | undefined,
  courseId: string | undefined,
) {
  const invalidate = useInvalidateLiveSessions(academyId, courseId);
  return useApiMutation<LiveSession, CreateLiveSessionInput, ApiError>({
    mutationFn: (input) => liveSessionService.create(academyId!, courseId!, input),
    onSuccess: invalidate,
    successMessageKey: 'liveSessions:toast.created',
  });
}

export function useUpdateLiveSession(
  academyId: string | undefined,
  courseId: string | undefined,
) {
  const invalidate = useInvalidateLiveSessions(academyId, courseId);
  return useApiMutation<
    LiveSession,
    { readonly liveSessionId: string; readonly input: UpdateLiveSessionInput },
    ApiError
  >({
    mutationFn: ({ liveSessionId, input }) =>
      liveSessionService.update(academyId!, liveSessionId, input),
    onSuccess: invalidate,
    successMessageKey: 'liveSessions:toast.updated',
  });
}
