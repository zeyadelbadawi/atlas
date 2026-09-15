/**
 * Hooks for the unified unit curriculum (P52).
 *
 * `useUnitItems` reads one unit's mixed, ordered sequence. The mutation
 * hooks (attach/detach/reorder) persist changes and invalidate both the
 * unit's item list and the section list, so the builder stays authoritative
 * — ordering is never kept only in browser state.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
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
  const { invalidate } = useInvalidate();
  return useApiMutation<CurriculumItem[], AttachVariables, ApiError>({
    mutationFn: ({ sectionId, type, itemId }) =>
      courseService.attachUnitItem(academyId, courseId, sectionId, { type, itemId }),
    showSuccessToast: false,
    onSuccess: async (_data, { sectionId }) => {
      await invalidate(courseKeys.unitItems(academyId, courseId, sectionId));
      await invalidate(courseKeys.availableContent(academyId, courseId));
      await invalidate(courseKeys.sections(academyId, courseId));
    },
  });
}

export function useDetachUnitItem(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();
  return useApiMutation<CurriculumItem[], AttachVariables, ApiError>({
    mutationFn: ({ sectionId, type, itemId }) =>
      courseService.detachUnitItem(academyId, courseId, sectionId, { type, itemId }),
    showSuccessToast: false,
    onSuccess: async (_data, { sectionId }) => {
      await invalidate(courseKeys.unitItems(academyId, courseId, sectionId));
      await invalidate(courseKeys.availableContent(academyId, courseId));
      await invalidate(courseKeys.sections(academyId, courseId));
    },
  });
}

interface ReorderVariables {
  readonly sectionId: string;
  readonly payload: ReorderItemsPayload;
}

export function useReorderUnitItems(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();
  return useApiMutation<void, ReorderVariables, ApiError>({
    mutationFn: ({ sectionId, payload }) =>
      courseService.reorderUnitItems(academyId, courseId, sectionId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { sectionId }) => {
      await invalidate(courseKeys.unitItems(academyId, courseId, sectionId));
    },
  });
}
