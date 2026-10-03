/**
 * useCourseCatalogInvalidation — the one refresh every course-catalog
 * mutation (create, edit, delete, publish, unpublish, instructor access)
 * runs on success.
 *
 * It used to be `invalidate(courseKeys.all)`, which refreshed the course
 * pages themselves but none of the views that also show courses: the
 * dashboard counts, the academy statistics, the instructor's course list,
 * the student catalog and the public website's course grid. The fan-out is
 * declared once in `invalidateCourseCatalog` (next to the key factories);
 * this hook only supplies the scope ids. Curriculum (sections, lessons,
 * quizzes) is refreshed by the course builder's own hooks.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateCourseCatalog } from '@services/query';

/**
 * W5 (F9) — the academy is an ARGUMENT, supplied from the mutation's
 * variables, so a course saved in academy A refreshes A's catalog even if
 * the screen has moved to academy B by the time the request settles.
 */
export function useCourseCatalogInvalidation() {
  const queryClient = useQueryClient();

  return useCallback(
    (academyId: string, courseId?: string) =>
      invalidateCourseCatalog(queryClient, { academyId, courseId }),
    [queryClient]
  );
}
