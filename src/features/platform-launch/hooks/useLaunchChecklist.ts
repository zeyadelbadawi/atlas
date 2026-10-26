/**
 * B3 — launch checklist hooks (Platform Owner). Toggling and reordering
 * update the cache optimistically and roll back on failure.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import {
  INLINE_ERRORS_META,
  platformLaunchChecklistKeys,
} from '@services/query';
import type { ApiError } from '@api';
import { platformLaunchChecklistService } from '../services/PlatformLaunchChecklistService';
import type {
  ChecklistItemWritePayload,
  LaunchChecklist,
  LaunchChecklistItem,
} from '../types';

/** Feedback is the page's (inline or its own toast); no generic error toast. */
const QUIET = {
  showSuccessToast: false,
  showErrorToast: false,
  meta: { [INLINE_ERRORS_META]: true },
} as const;
const KEY = platformLaunchChecklistKeys.all;

export function useLaunchChecklist() {
  return useApiQuery<LaunchChecklist, ApiError>({
    queryKey: KEY,
    queryFn: () => platformLaunchChecklistService.get(),
  });
}

export function useCreateChecklistItem() {
  return useApiMutation<
    LaunchChecklistItem,
    ChecklistItemWritePayload,
    ApiError
  >({
    mutationFn: (payload) => platformLaunchChecklistService.create(payload),
    invalidateKeys: [KEY],
    ...QUIET,
  });
}

/** Recomputes progress from the items (the server sends the same numbers). */
export function withProgress(
  items: readonly LaunchChecklistItem[]
): LaunchChecklist {
  return {
    items,
    progress: {
      done: items.filter((item) => item.done).length,
      total: items.length,
    },
  };
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useApiMutation<
    LaunchChecklistItem,
    {
      readonly id: string;
      readonly payload: ChecklistItemWritePayload & {
        readonly version: number;
      };
    },
    ApiError,
    { readonly previous?: LaunchChecklist }
  >({
    mutationFn: ({ id, payload }) =>
      platformLaunchChecklistService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<LaunchChecklist>(KEY);
      if (previous && payload.done !== undefined) {
        queryClient.setQueryData<LaunchChecklist>(
          KEY,
          withProgress(
            previous.items.map((item) =>
              item.id === id ? { ...item, done: payload.done as boolean } : item
            )
          )
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(KEY, context.previous);
    },
    invalidateKeys: [KEY],
    ...QUIET,
  });
}

export function useDeleteChecklistItem() {
  return useApiMutation<void, string, ApiError>({
    mutationFn: (id) => platformLaunchChecklistService.remove(id),
    invalidateKeys: [KEY],
    ...QUIET,
  });
}

export function useReorderChecklist() {
  const queryClient = useQueryClient();
  return useApiMutation<
    LaunchChecklist,
    readonly string[],
    ApiError,
    { readonly previous?: LaunchChecklist }
  >({
    mutationFn: (ids) => platformLaunchChecklistService.reorder(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<LaunchChecklist>(KEY);
      if (previous) {
        const byId = new Map(previous.items.map((item) => [item.id, item]));
        const ordered = ids
          .map((id, index) => {
            const item = byId.get(id);
            return item ? { ...item, position: index } : undefined;
          })
          .filter((item): item is LaunchChecklistItem => item !== undefined);
        queryClient.setQueryData<LaunchChecklist>(KEY, withProgress(ordered));
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(KEY, context.previous);
    },
    invalidateKeys: [KEY],
    ...QUIET,
  });
}
