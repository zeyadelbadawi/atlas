/**
 * The course editor's sibling tabs this user may open — see
 * `getCourseEditorTabs` for why each tab carries its route's permission.
 */
import { useMemo } from 'react';
import { usePermissions } from '@hooks';
import type { BreadcrumbItem, NavigationItem } from '@types';
import {
  courseEditorLeadCrumbs,
  filterCourseEditorTabs,
  getCourseEditorTabs,
} from '../utils/course-navigation.utils';

export function useCourseEditorTabs(
  academyId: string,
  courseId: string
): readonly NavigationItem[] {
  const { hasPermission } = usePermissions();
  return useMemo(
    () =>
      filterCourseEditorTabs(
        getCourseEditorTabs(academyId, courseId),
        hasPermission
      ),
    [academyId, courseId, hasPermission]
  );
}

/**
 * The course list and course crumbs of a course editor page, for this
 * user — see `courseEditorLeadCrumbs`. `courseTitle` is undefined until
 * the course has loaded (the course crumb then waits).
 */
export function useCourseEditorLeadCrumbs(
  academyId: string,
  courseId: string,
  courseTitle: string | undefined,
  courseLabelKey: string
): BreadcrumbItem[] {
  const { hasPermission } = usePermissions();
  const tabs = useCourseEditorTabs(academyId, courseId);
  return courseEditorLeadCrumbs({
    academyId,
    courseTitle,
    courseLabelKey,
    tabs,
    canListCourses: hasPermission('course.view'),
  });
}
