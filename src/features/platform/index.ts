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
  // Platform commerce's create-payout dialog picks an academy from the
  // same cross-tenant academy list the Academies console reads.
  usePlatformAcademies,
  usePlatformCommerceMetrics,
  usePlatformDeliveryMetrics,
  // P64 Communications C7 — the platform email pipeline console.
  useCommunicationsHealth,
  useCommunicationSuppressions,
  useUnsuppressAddress,
} from './hooks';
export { PlatformVideoInventory } from './components/PlatformVideoInventory';
export { platformCommunicationsService } from './services/PlatformCommunicationsService';
