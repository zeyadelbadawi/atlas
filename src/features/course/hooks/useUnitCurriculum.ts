/**
 * Hooks for the unified unit curriculum (P52).
 *
 * `useUnitItems` reads one unit's mixed, ordered sequence. The mutation
 * hooks (attach/detach/reorder) persist changes and invalidate the course's
 * whole builder curriculum (`invalidateCourseCurriculum`), so the builder
 * stays authoritative — ordering is never kept only in browser state.
 *
 * The reorder is optimistic (the moved row is in place immediately) but
 * still server-authoritative: it is rolled back on failure, refetched once
 * the last queued reorder settles, and every reorder of one unit shares a
 * mutation `scope` so they run strictly in click order.
 */
import { useQueryClient } from '@tanstack/react-query';
import {
  useApiMutation,
  useApiQuery,
  useAcademyBoundMutation,
} from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import { applyOrder } from '../utils/reorder.utils';
import type {
  AvailableCurriculumItem,
  CurriculumItem,
  ReorderItemsPayload,
} from '@types';

export function useUnitItems(
  academyId: string,
  courseId: string,
  sectionId: string,
  enabled = true
) {
  return useApiQuery<CurriculumItem[], ApiError>({
    queryKey: courseKeys.unitItems(academyId, courseId, sectionId),
    queryFn: () => courseService.getUnitItems(academyId, courseId, sectionId),
    enabled: enabled && !!academyId && !!courseId && !!sectionId,
  });
}

export function useAvailableContent(
  academyId: string,
  courseId: string,
  enabled = true
) {
  return useApiQuery<AvailableCurriculumItem[], ApiError>({
    queryKey: courseKeys.availableContent(academyId, courseId),
    queryFn: () => courseService.getAvailableContent(academyId, courseId),
    enabled: enabled && !!academyId && !!courseId,
  });
}

interface AttachVariables {
  readonly sectionId: string;
  readonly type: 'quiz' | 'assignment';
  readonly itemId: string;
}

export function useAttachUnitItem(academyId: string, courseId: string) {
  const queryClient = useQueryClient();
  const mutation = useApiMutation<
    CurriculumItem[],
    AcademyScopedVariables<AttachVariables>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { sectionId, type, itemId } }) =>
      courseService.attachUnitItem(academyId, courseId, sectionId, {
        type,
        itemId,
      }),
    showSuccessToast: false,
    // The caller shows its own localized toast; a second generic one would
    // just repeat it.
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidateCourseCurriculum(queryClient, { academyId, courseId });
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}

export function useDetachUnitItem(academyId: string, courseId: string) {
  const queryClient = useQueryClient();
  const mutation = useApiMutation<
    CurriculumItem[],
    AcademyScopedVariables<AttachVariables>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { sectionId, type, itemId } }) =>
      courseService.detachUnitItem(academyId, courseId, sectionId, {
        type,
        itemId,
      }),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidateCourseCurriculum(queryClient, { academyId, courseId });
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}

export interface ReorderUnitItemsContext {
  readonly previous: CurriculumItem[] | undefined;
}

/** Mutation key shared by every item reorder of one unit. */
export const reorderUnitItemsMutationKey = (sectionId: string) =>
  [...courseKeys.all, 'reorder-unit-items', sectionId] as const;

/**
 * Persists a new item order for ONE unit (items never move across units —
 * the data model has no cross-unit move). `payload.expectedOrderedIds`
 * should carry the order the author saw, so a concurrent change is refused
 * (409) instead of overwritten.
 */
export function useReorderUnitItems(
  academyId: string,
  courseId: string,
  sectionId: string
) {
  const queryClient = useQueryClient();
  const mutationKey = reorderUnitItemsMutationKey(sectionId);

  const mutation = useApiMutation<
    void,
    AcademyScopedVariables<ReorderItemsPayload>,
    ApiError,
    ReorderUnitItemsContext
  >({
    mutationKey,
    scope: { id: `unit-items-order:${sectionId}` },
    mutationFn: ({ academyId, payload }) =>
      courseService.reorderUnitItems(academyId, courseId, sectionId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onMutate: async ({ academyId, payload }) => {
      const itemsKey = courseKeys.unitItems(academyId, courseId, sectionId);
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const previous = queryClient.getQueryData<CurriculumItem[]>(itemsKey);
      if (previous) {
        queryClient.setQueryData<CurriculumItem[]>(
          itemsKey,
          applyOrder(previous, payload.orderedIds)
        );
      }
      return { previous };
    },
    onError: (_error, { academyId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          courseKeys.unitItems(academyId, courseId, sectionId),
          context.previous
        );
      }
    },
    onSettled: async (_data, _error, { academyId }) => {
      // `isMutating` still counts this mutation while its onSettled runs:
      // only the last queued reorder of the unit refetches.
      if (queryClient.isMutating({ mutationKey }) <= 1) {
        await invalidateCourseCurriculum(queryClient, { academyId, courseId });
      }
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
