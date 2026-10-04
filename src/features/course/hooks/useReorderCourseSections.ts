/**
 * useReorderCourseSections hook.
 *
 * Persists a new section order, optimistically:
 *   - `onMutate` cancels in-flight section reads, snapshots the cache and
 *     writes the new order immediately, so the moved section is already in
 *     place (and keeps focus) while the request runs;
 *   - `onError` restores the snapshot (the caller shows the toast — a stale
 *     409 gets its own localized message);
 *   - `onSettled` refetches the authoritative order once the LAST queued
 *     reorder of this course settles (an earlier one refetching mid-queue
 *     would briefly overwrite the later optimistic order).
 * Every reorder of one course shares a mutation `scope`, so TanStack runs
 * them strictly one after another, in click order — never two in parallel
 * built on the same stale snapshot.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import { applyOrder } from '../utils/reorder.utils';
import type {
  CourseSection,
  PaginatedResult,
  ReorderItemsPayload,
} from '@types';

export interface ReorderSectionsContext {
  readonly previous: PaginatedResult<CourseSection> | undefined;
}

/** Mutation key shared by every section reorder of one course. */
export const reorderSectionsMutationKey = (courseId: string) =>
  [...courseKeys.all, 'reorder-sections', courseId] as const;

export function useReorderCourseSections(academyId: string, courseId: string) {
  const queryClient = useQueryClient();
  const mutationKey = reorderSectionsMutationKey(courseId);

  const mutation = useApiMutation<
    void,
    AcademyScopedVariables<ReorderItemsPayload>,
    ApiError,
    ReorderSectionsContext
  >({
    mutationKey,
    scope: { id: `course-sections-order:${courseId}` },
    mutationFn: ({ academyId, payload }) =>
      courseService.reorderCourseSections(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onMutate: async ({ academyId, payload }) => {
      const sectionsKey = courseKeys.sections(academyId, courseId);
      await queryClient.cancelQueries({ queryKey: sectionsKey });
      const previous =
        queryClient.getQueryData<PaginatedResult<CourseSection>>(sectionsKey);
      if (previous) {
        queryClient.setQueryData<PaginatedResult<CourseSection>>(sectionsKey, {
          ...previous,
          items: applyOrder(previous.items, payload.orderedIds),
        });
      }
      return { previous };
    },
    onError: (_error, { academyId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          courseKeys.sections(academyId, courseId),
          context.previous
        );
      }
    },
    onSettled: async (_data, _error, { academyId }) => {
      // `isMutating` still counts this mutation while its onSettled runs.
      if (queryClient.isMutating({ mutationKey }) <= 1) {
        await invalidateCourseCurriculum(queryClient, { academyId, courseId });
      }
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
