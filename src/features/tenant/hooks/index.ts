/**
 * Tenant hooks — public entry point.
 */
export { useTenantSubscription } from './useTenantSubscription';
export { useTenantUsage } from './useTenantUsage';
export { useTenantAddOns } from './useTenantAddOns';
export { usePlanCatalog } from './usePlanCatalog';
export { useAddOnCatalog } from './useAddOnCatalog';
export { useTrialPolicy } from './useTrialPolicy';
export { useUpdateTrialPolicy } from './useUpdateTrialPolicy';
export { useEffectiveEntitlements } from './useEffectiveEntitlements';
export type { UseEffectiveEntitlementsResult } from './useEffectiveEntitlements';
export { useSubscriptionAccess } from './useSubscriptionAccess';
export type { SubscriptionAccess, SubscriptionBlockReason } from './useSubscriptionAccess';
export { useSubscriptionLifecycleState } from './useSubscriptionLifecycleState';
export type { LifecycleQueryResult } from './useSubscriptionLifecycleState';
export {
  useStartTrial,
  useCancelTrial,
  useCancelSubscription,
} from './useSubscriptionLifecycle';
