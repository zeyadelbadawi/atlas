/**
 * B0-LIV-01 — the customer Live Sessions pages (overview, sessions,
 * recordings, Zoom connection) are reachable by URL even though the
 * sidebar hides them. While the customer launch is off
 * (`FEATURE_FLAGS.liveSessions`), any of those URLs lands on the add-ons
 * catalog instead. The backend refuses the Zoom connect flow on its own
 * while the add-on is unpublished; this only keeps the pages out of reach.
 */
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isFeatureEnabled } from '@config';
import { DASHBOARD_ROUTES } from './route-paths';

export function LiveSessionsLaunchGate({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  if (!isFeatureEnabled('liveSessions')) {
    return <Navigate to={DASHBOARD_ROUTES.tenantAddOns} replace />;
  }
  return <>{children}</>;
}
