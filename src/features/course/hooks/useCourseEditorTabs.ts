/**
 * The course editor's sibling tabs this user may open — see
 * `getCourseEditorTabs` for why each tab carries its route's permission.
 */
import { useMemo } from 'react';
import { usePermissions } from '@hooks';
import type { NavigationItem } from '@types';
import {
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
