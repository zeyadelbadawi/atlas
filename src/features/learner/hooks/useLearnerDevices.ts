/**
 * The learner's registered devices and live sessions, and the two writes
 * that unblock a refused learner (§E.1, §E.4, AD-10, D4).
 *
 * WHY REMOVE AND TAKEOVER LIVE BESIDE THE READ. Both of them invalidate
 * exactly this list, and a learner performs them for one reason: they
 * have just been refused and need a slot back. Keeping the three
 * together means the refetch after a write cannot be forgotten in a
 * future call site — which on this page would leave a learner staring at
 * a device they have already removed, and trying again.
 *
 * NEITHER WRITE SHOWS A TOAST. The device page re-renders with the row
 * gone, and the takeover dialog closes and resumes playback; a toast on
 * top of either is a second, quieter version of what the screen already
 * says. Errors are surfaced in place by the caller, where the learner is
 * looking, rather than in a corner.
 */
import { useApiMutation, useApiQuery, useAuth, useInvalidate } from '@hooks';
import { learnerKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  LearnerDevicesResponse,
  SessionTakeoverPayload,
  SessionTakeoverResponse,
} from '@types';
import { learnerDashboardService } from '../services/LearnerDashboardService';
import { useLearnerSurface } from '../context/LearnerSurface.context';

export interface UseLearnerDevicesOptions {
  readonly enabled?: boolean;
}

export function useLearnerDevices(options?: UseLearnerDevicesOptions) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();
  const { academyId } = useLearnerSurface();

  return useApiQuery<LearnerDevicesResponse>({
    queryKey: learnerKeys.devices(user?.id, academyId),
    queryFn: () => learnerDashboardService.getDevices(),
    enabled: enabled && !!user?.id,
  });
}

/** Revokes one registered device, then re-reads the list from the server. */
export function useRemoveLearnerDevice() {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (deviceId) => learnerDashboardService.removeDevice(deviceId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      // The whole learner subtree, not just the devices key: removing the
      // device this browser is using ends its own learning session too,
      // and the overview's "continue learning" is computed from that.
      await invalidate(learnerKeys.all);
    },
  });
}

/**
 * Moves the single learning session to this device.
 *
 * The caller MUST have asked first (§E.4: "explicit confirmation"). This
 * hook deliberately exposes no "retry the grant" convenience — taking a
 * session from another device is a decision a learner makes, not a
 * recovery step a component performs on their behalf.
 */
export function useSessionTakeover() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    SessionTakeoverResponse,
    SessionTakeoverPayload,
    ApiError
  >({
    mutationFn: (payload) => learnerDashboardService.takeoverSession(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(learnerKeys.all);
    },
  });
}
