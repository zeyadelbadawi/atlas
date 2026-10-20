/**
 * Course editor sibling navigation.
 *
 * Details, Builder, Settings, Quizzes, and Assignments all edit the same
 * course. `CourseEditPage` used to expose Builder/Quizzes/Assignments/
 * Settings as four `PageHeader` action buttons — functional, but a row of
 * outline buttons reads as "things to do," not "where you already are,"
 * and none of the other four pages had any way back except the sidebar.
 * `getCourseEditorTabs` is the one place this sibling set is declared, so
 * every one of the five pages renders the exact same, single, "you are
 * here" strip instead.
 *
 * Each tab carries the permission its route guard requires
 * (`AtlasAppRoutes.tsx`), so the strip never offers a tab that would only
 * land on the forbidden page: an assigned course instructor (no
 * `course.update` / `course.configure`) sees Builder, Quizzes,
 * Assignments and Reviews, not Details or Settings. Filter with
 * `useCourseEditorTabs`; the route guard stays the control.
 */
import {
  BookOpen,
  ClipboardCheck,
  HelpCircle,
  Layers,
  Settings2,
  Star,
} from 'lucide-react';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { NavigationItem } from '@types';

export function getCourseEditorTabs(
  academyId: string,
  courseId: string
): readonly NavigationItem[] {
  return [
    {
      id: 'course-tab-details',
      requiredPermissions: ['course.update'],
      labelKey: 'course:edit.detailsTabLabel',
      path: buildPath(DASHBOARD_ROUTES.academyCourseDetail, {
        academyId,
        courseId,
      }),
      icon: BookOpen,
    },
    {
      id: 'course-tab-builder',
      requiredPermissions: ['instructor.course.view'],
      labelKey: 'course:edit.goToBuilder',
      path: buildPath(DASHBOARD_ROUTES.academyCourseBuilder, {
        academyId,
        courseId,
      }),
      icon: Layers,
    },
    {
      id: 'course-tab-quizzes',
      requiredPermissions: ['quiz.manage'],
      labelKey: 'course:edit.goToQuizzes',
      path: buildPath(DASHBOARD_ROUTES.academyCourseQuizzes, {
        academyId,
        courseId,
      }),
      icon: HelpCircle,
      // A quiz's own create/edit screen is a drill-down of Quizzes — still "on" this tab.
      matchNestedPaths: true,
    },
    {
      id: 'course-tab-assignments',
      requiredPermissions: ['assignment.manage'],
      labelKey: 'course:edit.goToAssignments',
      path: buildPath(DASHBOARD_ROUTES.academyCourseAssignments, {
        academyId,
        courseId,
      }),
      icon: ClipboardCheck,
    },
    {
      id: 'course-tab-reviews',
      requiredPermissions: ['instructor.course.view'],
      labelKey: 'course:edit.goToReviews',
      path: buildPath(DASHBOARD_ROUTES.academyCourseReviews, {
        academyId,
        courseId,
      }),
      icon: Star,
    },
    {
      id: 'course-tab-settings',
      requiredPermissions: ['course.configure'],
      labelKey: 'course:edit.goToSettings',
      path: buildPath(DASHBOARD_ROUTES.academyCourseSettings, {
        academyId,
        courseId,
      }),
      icon: Settings2,
    },
  ];
}

/** The tabs the caller may open: every permission a tab's route requires. */
export function filterCourseEditorTabs(
  tabs: readonly NavigationItem[],
  hasPermission: (permission: string) => boolean
): readonly NavigationItem[] {
  return tabs.filter((tab) =>
    (tab.requiredPermissions ?? []).every((permission) =>
      hasPermission(permission)
    )
  );
}
