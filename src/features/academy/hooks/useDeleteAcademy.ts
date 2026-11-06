/**
 * useDeleteAcademy hook.
 *
 * Deletes an Academy and records why. Deleting changes the organization's
 * usage — the plan's academy allowance is released — so the tenant
 * queries are invalidated alongside the academy ones; otherwise the owner
 * deletes their only academy and the plan still shows the slot as used.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import {
  academyKeys,
  dashboardOverviewKeys,
  tenantKeys, INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';

export interface DeleteAcademyVariables {
  readonly id: string;
  readonly reason?: string;
  readonly feedback?: string;
}

export function useDeleteAcademy() {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, DeleteAcademyVariables, ApiError>({
    mutationFn: ({ id, reason, feedback }) =>
      academyService.deleteAcademyWithReason(id, { reason, feedback }),
    // The dialog reports the outcome in context and navigates away, so the
    // generic toast would be a second message for one event.
    showSuccessToast: false,
    showErrorToast: false,
    // B4 (UX audit) — the caller shows the one message; the app-wide
    // reporter must not add a second toast.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async () => {
      await invalidate(academyKeys.all);
      await invalidate(tenantKeys.all);
      // The organization dashboard counts academies.
      await invalidate(dashboardOverviewKeys.overviews());
    },
  });
}
