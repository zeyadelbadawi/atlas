/**
 * The course editor tab strip offers only the tabs whose route the user
 * may open. A course instructor does not get Details or Settings (their
 * routes need `course.update` / `course.configure`, owner/manager only),
 * and typing one of those addresses still lands on the normal forbidden
 * page through the route guard — never a crash.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { SYSTEM_ROUTES } from '@app/routes/route-paths';
import type { CurrentUser } from '@types';
import {
  filterCourseEditorTabs,
  getCourseEditorTabs,
} from './utils/course-navigation.utils';

vi.mock('@features/tenant', () => ({
  useSubscriptionLifecycleState: () => ({
    state: { hasAccess: true },
    isLoading: false,
  }),
}));

import { RouteGuard } from '@app/routes/guards/RouteGuard';

/** Organization permissions as the backend grants them per role. */
const INSTRUCTOR = [
  'quiz.manage',
  'assignment.manage',
  'instructor.dashboard.view',
  'instructor.course.view',
];
const MANAGER = [
  ...INSTRUCTOR,
  'course.view',
  'course.update',
  'course.configure',
];

afterEach(() => cleanup());

const tabsFor = (granted: readonly string[]) =>
  filterCourseEditorTabs(getCourseEditorTabs('a1', 'c1'), (permission) =>
    granted.includes(permission)
  ).map((tab) => tab.id);

describe('course editor tabs', () => {
  it('an owner or manager gets all six', () => {
    expect(tabsFor(MANAGER)).toEqual([
      'course-tab-details',
      'course-tab-builder',
      'course-tab-quizzes',
      'course-tab-assignments',
      'course-tab-reviews',
      'course-tab-settings',
    ]);
  });

  it('a course instructor does not get Details or Settings', () => {
    expect(tabsFor(INSTRUCTOR)).toEqual([
      'course-tab-builder',
      'course-tab-quizzes',
      'course-tab-assignments',
      'course-tab-reviews',
    ]);
  });

  it('typing a hidden tab address sends an instructor to the forbidden page', () => {
    const hidden = getCourseEditorTabs('a1', 'c1').filter(
      (tab) => !tabsFor(INSTRUCTOR).includes(tab.id)
    );
    expect(hidden.map((tab) => tab.id)).toEqual([
      'course-tab-details',
      'course-tab-settings',
    ]);
    const identity = {
      user: {
        id: 'u-1',
        roles: [],
        permissions: [],
        principalKind: 'staff',
      } as unknown as CurrentUser,
      isAuthenticated: true,
      isRestoring: false,
      organization: { id: 'o-1', role: 'instructor', permissions: INSTRUCTOR },
    } as unknown as IdentityContextValue;

    for (const tab of hidden) {
      render(
        <IdentityContext.Provider value={identity}>
          <MemoryRouter initialEntries={[tab.path]}>
            <Routes>
              <Route
                path={tab.path}
                element={
                  <RouteGuard
                    requireAuthentication
                    requiredPermissions={tab.requiredPermissions}
                    requiresEntitlement
                  >
                    <span>editor page</span>
                  </RouteGuard>
                }
              />
              <Route
                path={SYSTEM_ROUTES.forbidden}
                element={<span>forbidden page</span>}
              />
            </Routes>
          </MemoryRouter>
        </IdentityContext.Provider>
      );
      expect(screen.getByText('forbidden page')).toBeTruthy();
      expect(screen.queryByText('editor page')).toBeNull();
      cleanup();
    }
  });
});
