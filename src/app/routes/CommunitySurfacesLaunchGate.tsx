/**
 * B0-WEB-07 — the academy blog (list, editor, post) and the course forum
 * (discussions, thread) are hidden from every menu while
 * `FEATURE_FLAGS.academyBlogAndForum` is off, but their URLs still opened
 * the pages. While the flag is off, any of those URLs lands somewhere
 * useful instead: a forum URL on its course's overview, a blog URL on the
 * dashboard home. Same pattern as `LiveSessionsLaunchGate`.
 */
import type { ReactNode } from 'react';
import { Navigate, generatePath, useParams } from 'react-router-dom';
import { isFeatureEnabled } from '@config';
import { DASHBOARD_ROUTES } from './route-paths';

export function CommunitySurfacesLaunchGate({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const { courseId } = useParams<{ courseId?: string }>();
  if (!isFeatureEnabled('academyBlogAndForum')) {
    const target = courseId
      ? generatePath(DASHBOARD_ROUTES.instructorCourseOverview, { courseId })
      : DASHBOARD_ROUTES.root;
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}
