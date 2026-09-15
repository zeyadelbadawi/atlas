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
  LiveProviderConnectionState,
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

/**
 * Publishes a session.
 *
 * Invalidates the same pair as create/update: publishing changes the
 * session's status AND can consume nothing while still depending on the
 * recording allowance, so a stale status read would show a published
 * session as a draft.
 */
export function usePublishLiveSession(
  academyId: string | undefined,
  courseId: string | undefined,
) {
  const invalidate = useInvalidateLiveSessions(academyId, courseId);
  return useApiMutation<LiveSession, { readonly liveSessionId: string }, ApiError>({
    mutationFn: ({ liveSessionId }) =>
      liveSessionService.publish(academyId!, liveSessionId),
    onSuccess: invalidate,
    successMessageKey: 'liveSessions:toast.published',
  });
}

/** Provider connection health for one academy. */
export function useZoomConnection(academyId: string | undefined) {
  return useApiQuery<LiveProviderConnectionState, ApiError>({
    queryKey: [...liveSessionKeys.all, 'connection', academyId],
    queryFn: () => liveSessionService.getConnection(academyId!),
    enabled: Boolean(academyId),
  });
}

/**
 * Connect / re-check / disconnect.
 *
 * All three invalidate the whole Live Sessions key tree, because the
 * connection gates the course-builder block and the overview page too —
 * leaving those stale would show "Zoom not connected" on a screen the
 * customer has just connected from.
 */
export function useZoomConnectionActions(academyId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: liveSessionKeys.all });
  };

  /*
    CONNECT IS NOW A NAVIGATION, NOT A SAVE.

    The mutation returns the Zoom authorization URL and the caller sends
    the browser there; success is decided at the callback, not here. No
    success toast, because nothing has succeeded yet — announcing
    "connected" before the customer has even seen Zoom's consent screen
    would be a lie the UI tells itself.
  */
  const connect = useApiMutation<
    { authorizationUrl: string; expiresAt: string },
    void,
    ApiError
  >({
    mutationFn: () => liveSessionService.startAuthorization(academyId!),
    showSuccessToast: false,
  });

  /*
    COMPLETING THE AUTHORIZATION, back on the Atlas page Zoom returned to.

    This is where "connected" is finally true, so this is where the success
    toast belongs — not on `connect` above, which has only sent the
    customer away to a consent screen they may yet decline.

    The academy is deliberately absent: it comes from the state row Atlas
    wrote when the flow began, so nothing about which tenant is being
    connected passes through the browser.
  */
  const completeAuthorization = useApiMutation<
    { status: string },
    { code: string; state: string },
    ApiError
  >({
    mutationFn: (payload) => liveSessionService.completeAuthorization(payload),
    onSuccess: invalidate,
    successMessageKey: 'liveSessions:toast.connected',
  });

  const check = useApiMutation<{ healthy: boolean }, void, ApiError>({
    mutationFn: () => liveSessionService.checkConnection(academyId!),
    onSuccess: invalidate,
    showSuccessToast: false,
  });

  const disconnect = useApiMutation<{ status: string }, void, ApiError>({
    mutationFn: () => liveSessionService.disconnect(academyId!),
    onSuccess: invalidate,
    successMessageKey: 'liveSessions:toast.disconnected',
  });

  return { connect, completeAuthorization, check, disconnect };
}
