/**
 * Tenant feature — public entry point.
 *
 * Added in Prompt 7 so `features/billing` (a different feature — Billing
 * needs the Tenant's current subscription to show plan/billing-cycle
 * context on `BillingOverviewPage`) can depend on it without reaching past
 * this barrel, the same `@features/<name>` pattern `@features/course`
 * already established for `@features/instructor`.
 */
export * from './pages';
export * from './components/PlanComparisonDialog';
export * from './hooks';
export * from './services/TenantService';
export * from './services/PlanService';
export * from './schemas/tenant.schemas';
export * from './constants/tenant.constants';
export * from './utils/entitlement.utils';
export * from './utils/subscription-status.utils';
