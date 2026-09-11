/**
 * Atlas Service Layer — public entry point.
 *
 * Every business operation in Atlas goes through a service. Features import
 * services; they never import the API or HTTP layers directly.
 */
export { BaseService } from './base.service';
export * from './api';
export * from './query';
export * from './identity';

/**
 * Public-runtime API client.
 *
 * Lives in the SHARED services package, not inside `@features/public-website`,
 * because the public website, the Student LMS, the dashboard sidebar and the
 * website section renderers all need it. While it sat inside the feature the
 * only way to reach it was a deep `@features/public-website/services/...`
 * import, which `no-restricted-imports` correctly forbids — and routing
 * through that feature's barrel instead was impossible, because the barrel
 * re-exports components that import `@features/website`, closing a module
 * cycle. Moving the data layer to the shared package removes the cycle rather
 * than working around it.
 */
export { PublicWebsiteService, publicWebsiteService } from './public-website/PublicWebsiteService';
