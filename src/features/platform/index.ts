/**
 * Platform feature exports.
 *
 * Platform Owner Dashboard and platform-level administration.
 */
export { default as PlatformDashboardPage } from './pages/PlatformDashboardPage';

// P64 Phase 4 — the Analysis area's Commerce and Content delivery reports
// read the platform-metrics endpoints through these; features depend on
// each other only via this barrel (`@features/platform`), never deep paths.
export {
  usePlatformCommerceMetrics,
  usePlatformDeliveryMetrics,
} from './hooks';
export { PlatformVideoInventory } from './components/PlatformVideoInventory';
