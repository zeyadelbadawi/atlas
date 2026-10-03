/**
 * Moving an FAQ or testimonial library entry up/down.
 *
 * The backend has no reorder endpoint for the content libraries — a move
 * is two `order` updates (the entry takes its neighbour's position, the
 * neighbour takes the entry's). The library tab used to fire both as two
 * independent mutations at once and ignore their pending state, so a fast
 * second click raced the first and could leave two entries on the same
 * position.
 *
 * Here the two writes run IN SEQUENCE inside ONE mutation, so callers get
 * a single `isPending` to disable every move control with, and the lists
 * are refreshed once when the move settles — on failure too, so a move
 * that half-applied (first write saved, second rejected) is shown as the
 * server now has it rather than as the screen guessed.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import {
  invalidateFaqEntries,
  invalidateTestimonialEntries,
} from '@services/query';
import type { ApiError } from '@api';
import { websiteContentService } from '../services/WebsiteContentService';

/** One entry's id and current position. */
export interface ContentOrderSlot {
  readonly id: string;
  readonly order: number;
}

export interface SwapWebsiteContentOrderVariables {
  readonly academyId: string;
  /** The entry being moved. */
  readonly entry: ContentOrderSlot;
  /** The neighbour it trades places with. */
  readonly target: ContentOrderSlot;
}

export function useSwapWebsiteFaqEntryOrder() {
  const queryClient = useQueryClient();

  return useApiMutation<void, SwapWebsiteContentOrderVariables, ApiError>({
    mutationFn: async ({ academyId, entry, target }) => {
      await websiteContentService.updateFaqEntry(academyId, entry.id, {
        order: target.order,
      });
      await websiteContentService.updateFaqEntry(academyId, target.id, {
        order: entry.order,
      });
    },
    showSuccessToast: false,
    // The app-wide reporter already toasts the failure with its real
    // reason (permission, conflict, offline); a second generic toast here
    // would only repeat it.
    showErrorToast: false,
    onSettled: (_data, _error, { academyId }) =>
      invalidateFaqEntries(queryClient, academyId),
  });
}

export function useSwapWebsiteTestimonialEntryOrder() {
  const queryClient = useQueryClient();

  return useApiMutation<void, SwapWebsiteContentOrderVariables, ApiError>({
    mutationFn: async ({ academyId, entry, target }) => {
      await websiteContentService.updateTestimonialEntry(academyId, entry.id, {
        order: target.order,
      });
      await websiteContentService.updateTestimonialEntry(academyId, target.id, {
        order: entry.order,
      });
    },
    showSuccessToast: false,
    showErrorToast: false,
    onSettled: (_data, _error, { academyId }) =>
      invalidateTestimonialEntries(queryClient, academyId),
  });
}
