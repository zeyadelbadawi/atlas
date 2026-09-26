/**
 * Platform commerce — the Platform Owner's course-commerce console.
 *
 * Course-order payment review, academy payouts and the §4.2 commission
 * hierarchy. Pages are lazy-loaded by the router through their own paths;
 * this barrel publishes only what another feature needs: the organization
 * commission card the Organization detail page embeds.
 */
export { OrganizationCommissionCard } from './components/OrganizationCommissionCard';
export type { OrganizationCommissionCardProps } from './components/OrganizationCommissionCard';
