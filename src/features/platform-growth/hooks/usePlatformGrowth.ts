/**
 * G1 — Growth & capacity hooks (Platform Owner). Writes refresh what they
 * feed: a spend change moves CAC; a settings change moves capacity; a
 * channel override moves the organization detail and CAC.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import {
  INLINE_ERRORS_META,
  platformGrowthKeys,
  platformOrganizationKeys,
} from '@services/query';
import type { ApiError } from '@api';
import { platformGrowthService } from '../services/PlatformGrowthService';
import type {
  CacReport,
  CapacityReport,
  GrowthSettings,
  MonthRange,
  OrganizationAcquisition,
  SetOrganizationChannelPayload,
  SpendEntry,
  SpendList,
  SpendWritePayload,
  UpdateGrowthSettingsPayload,
} from '../types';

/** Feedback is the page's (inline or its own toast); no generic error toast. */
const QUIET = {
  showSuccessToast: false,
  showErrorToast: false,
  meta: { [INLINE_ERRORS_META]: true },
} as const;

export function useGrowthCapacity() {
  return useApiQuery<CapacityReport, ApiError>({
    queryKey: platformGrowthKeys.capacity(),
    queryFn: () => platformGrowthService.getCapacity(),
  });
}

export function useGrowthCac(range: MonthRange, enabled = true) {
  return useApiQuery<CacReport, ApiError>({
    queryKey: platformGrowthKeys.cac(range),
    queryFn: () => platformGrowthService.getCac(range),
    enabled,
  });
}

export function useGrowthSpend(range: MonthRange) {
  return useApiQuery<SpendList, ApiError>({
    queryKey: platformGrowthKeys.spend(range),
    queryFn: () => platformGrowthService.listSpend(range),
  });
}

export function useGrowthSettings() {
  return useApiQuery<GrowthSettings, ApiError>({
    queryKey: platformGrowthKeys.settings(),
    queryFn: () => platformGrowthService.getSettings(),
  });
}

export function useUpdateGrowthSettings() {
  const queryClient = useQueryClient();
  return useApiMutation<GrowthSettings, UpdateGrowthSettingsPayload, ApiError>({
    mutationFn: (payload) => platformGrowthService.updateSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(platformGrowthKeys.settings(), settings);
    },
    invalidateKeys: [platformGrowthKeys.capacity()],
    ...QUIET,
  });
}

const SPEND_FEEDS = [
  platformGrowthKeys.spendAll(),
  platformGrowthKeys.cacAll(),
];

export function useCreateSpend() {
  return useApiMutation<SpendEntry, SpendWritePayload, ApiError>({
    mutationFn: (payload) => platformGrowthService.createSpend(payload),
    invalidateKeys: SPEND_FEEDS,
    ...QUIET,
  });
}

export function useUpdateSpend() {
  return useApiMutation<
    SpendEntry,
    {
      readonly id: string;
      readonly payload: Partial<SpendWritePayload> & {
        readonly version: number;
      };
    },
    ApiError
  >({
    mutationFn: ({ id, payload }) =>
      platformGrowthService.updateSpend(id, payload),
    invalidateKeys: SPEND_FEEDS,
    ...QUIET,
  });
}

export function useDeleteSpend() {
  return useApiMutation<void, string, ApiError>({
    mutationFn: (id) => platformGrowthService.deleteSpend(id),
    invalidateKeys: SPEND_FEEDS,
    ...QUIET,
  });
}

export function useSetOrganizationChannel(organizationId: string) {
  return useApiMutation<
    OrganizationAcquisition,
    SetOrganizationChannelPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      platformGrowthService.setOrganizationChannel(organizationId, payload),
    invalidateKeys: [
      platformOrganizationKeys.detail(organizationId),
      platformGrowthKeys.cacAll(),
      platformGrowthKeys.capacity(),
    ],
    ...QUIET,
  });
}
