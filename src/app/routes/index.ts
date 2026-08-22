/**
 * Atlas routing — public entry point.
 */
export { AppRouter } from './AppRouter';
export { RouteFallback } from './RouteFallback';
export {
  ROUTES,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  DASHBOARD_ROUTES,
  SYSTEM_ROUTES,
  AUTHENTICATED_ENTRY_ROUTE,
  UNAUTHENTICATED_ENTRY_ROUTE,
  buildPath,
  isPathActive,
} from './route-paths';
export * from './guards';