/**
 * Hostname resolution lives in `@utils` (`public-website-context.utils.ts`)
 * so `AppRouter` can decide "Academy website or Atlas app" without loading
 * this feature. Re-exported here for the feature's own imports.
 */
export {
  DEV_OVERRIDE_PARAM,
  getCurrentPublicWebsiteContext,
  resolvePublicWebsiteContext,
} from '@utils';
export type { PublicWebsiteContext, PublicWebsiteLookupType } from '@utils';
