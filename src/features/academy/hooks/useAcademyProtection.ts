/**
 * Academy content-protection, video-tier and device-policy hooks
 * (P64 Phase 2).
 *
 * All three settings are Client Owner only for READING as well as
 * writing — the backend runs `assertCanManageSecurityPolicy` on every GET
 * too. The queries therefore take `enabled`: the settings cards pass
 * `canEdit`, so a Manager's page never fires a request that can only
 * 403. That is UX only; the server remains the authority and the cards
 * still handle the 403 if the session's role was wrong.
 *
 * Updates are NOT optimistic: each PATCH returns the resolved state
 * (the video tier and device policy are re-resolved against the plan and
 * platform ceilings server-side), so the cache is written from the
 * response rather than from what was asked for.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery, useAuth } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyProtectionService } from '../services/AcademyProtectionService';
import type {
  AcademyContentProtection,
  AcademyDevicePolicy,
  AcademyVideoTierSettings,
  UpdateAcademyContentProtectionPayload,
  UpdateAcademyDevicePolicyPayload,
  UpdateAcademyVideoTierPayload,
} from '@types';

export interface UseAcademyProtectionQueryOptions {
  /** Pass `canEdit` — non-owners are refused the read as well. */
  readonly enabled?: boolean;
}

export function useAcademyContentProtection(
  academyId: string,
  options?: UseAcademyProtectionQueryOptions
) {
  const { enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<AcademyContentProtection, ApiError>({
    queryKey: academyKeys.contentProtection(organization?.id, academyId),
    queryFn: () => academyProtectionService.getContentProtection(academyId),
    enabled: enabled && !!academyId,
  });
}

export function useUpdateAcademyContentProtection(academyId: string) {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useApiMutation<
    AcademyContentProtection,
    UpdateAcademyContentProtectionPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      academyProtectionService.updateContentProtection(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (data) => {
      queryClient.setQueryData(
        academyKeys.contentProtection(organization?.id, academyId),
        data
      );
    },
  });
}

export function useAcademyVideoTier(
  academyId: string,
  options?: UseAcademyProtectionQueryOptions
) {
  const { enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<AcademyVideoTierSettings, ApiError>({
    queryKey: academyKeys.videoTier(organization?.id, academyId),
    queryFn: () => academyProtectionService.getVideoTier(academyId),
    enabled: enabled && !!academyId,
  });
}

export function useUpdateAcademyVideoTier(academyId: string) {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const queryKey = academyKeys.videoTier(organization?.id, academyId);

  return useApiMutation<
    AcademyVideoTierSettings,
    UpdateAcademyVideoTierPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      academyProtectionService.updateVideoTier(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    // A refusal usually means the plan changed under the screen — refetch
    // so the entitlement it shows is the one the server just applied.
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useAcademyDevicePolicy(
  academyId: string,
  options?: UseAcademyProtectionQueryOptions
) {
  const { enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<AcademyDevicePolicy, ApiError>({
    queryKey: academyKeys.devicePolicy(organization?.id, academyId),
    queryFn: () => academyProtectionService.getDevicePolicy(academyId),
    enabled: enabled && !!academyId,
  });
}

export function useUpdateAcademyDevicePolicy(academyId: string) {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const queryKey = academyKeys.devicePolicy(organization?.id, academyId);

  return useApiMutation<
    AcademyDevicePolicy,
    UpdateAcademyDevicePolicyPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      academyProtectionService.updateDevicePolicy(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    // `devicePolicyAboveMaximum` means the platform ceiling moved — refetch
    // so the form's limits are the live ones.
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}
