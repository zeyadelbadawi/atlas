/**
 * Platform (Control Plane) hooks — public entry point.
 */
export { usePlatformOrganizations } from './usePlatformOrganizations';
export type { UsePlatformOrganizationsOptions } from './usePlatformOrganizations';
export { usePlatformOrganization } from './usePlatformOrganization';
export { usePlatformAcademies } from './usePlatformAcademies';
export type { UsePlatformAcademiesOptions } from './usePlatformAcademies';
export { usePlatformAcademy } from './usePlatformAcademy';
export { usePlatformCourses, usePlatformCourse } from './usePlatformCourses';
export type { UsePlatformCoursesOptions } from './usePlatformCourses';
export { usePlatformUsers } from './usePlatformUsers';
export type { UsePlatformUsersOptions } from './usePlatformUsers';
export { usePlatformUser } from './usePlatformUser';
export { usePlatformMetrics } from './usePlatformMetrics';
export { usePlatformVideoMetrics } from './usePlatformVideoMetrics';
export { usePlatformCommerceMetrics } from './usePlatformCommerceMetrics';
export { usePlatformDeliveryMetrics } from './usePlatformDeliveryMetrics';

// P64 Communications C7 — the platform email pipeline console.
export {
  useCommunicationsHealth,
  useCommunicationSuppressions,
  useUnsuppressAddress,
} from './usePlatformCommunications';
export * from './useUserDeletion';
