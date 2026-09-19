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
  LEARNER_ROUTES,
  RETIRED_ACADEMY_LEARNER_ROUTES,
  RETIRED_DASHBOARD_LEARNER_ROUTES,
  SYSTEM_ROUTES,
  AUTHENTICATED_ENTRY_ROUTE,
  UNAUTHENTICATED_ENTRY_ROUTE,
  buildPath,
  isPathActive,
} from './route-paths';
export type { RetiredLearnerRoute } from './route-paths';
export { resolveRetiredLearnerTarget } from './retired-learner-routes';
export * from './guards';
