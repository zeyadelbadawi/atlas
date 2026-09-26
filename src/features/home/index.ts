/**
 * Home (marketing) feature — public entry point.
 *
 * Deliberately tiny: the marketing pages are lazy routes and never
 * imported across features. What IS shared is the marketing site's
 * "intended plan" hand-off — written by `useStartPlanFlow` when a visitor
 * picks a plan before having an account, and consumed (then cleared) by
 * the one-page sign-up in `@features/auth`.
 */
export {
  INTENDED_PLAN_STORAGE_KEY,
  useStartPlanFlow,
} from './hooks/useStartPlanFlow';
