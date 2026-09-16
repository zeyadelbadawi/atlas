/**
 * What `/dashboard` shows, which depends on who is asking.
 *
 * A Platform Owner is not a tenant of Atlas — they operate it. The tenant
 * dashboard behind this route is built entirely from "my organization's"
 * data, so for an operator (who has no organization) every card on it is
 * empty or meaningless. Landing there gave the impression the product was
 * broken before they had clicked anything.
 *
 * So a Platform Owner is sent to the Platform Dashboard, which IS their
 * home. `replace` so the useless page never enters history and the back
 * button does not bounce them through it.
 *
 * This is a redirect, not an authorization decision: the tenant dashboard
 * is still routable and still guarded exactly as before. It pairs with the
 * `tenantSurface` flag that takes the same item out of their sidebar, so
 * the menu and the landing page agree about where an operator belongs.
 *
 * The tenant dashboard arrives as `children` rather than being imported
 * here, so it stays the lazy chunk `AppRouter` declares — an operator who
 * is redirected never downloads it.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '@hooks';
import { DASHBOARD_ROUTES } from './route-paths';

export interface DashboardIndexRouteProps {
  readonly children: React.ReactNode;
}

export function DashboardIndexRoute({
  children,
}: DashboardIndexRouteProps): JSX.Element {
  const { user } = useAuth();

  if (user?.roles?.includes('platform_owner')) {
    return <Navigate to={DASHBOARD_ROUTES.platform} replace />;
  }

  return <>{children}</>;
}
