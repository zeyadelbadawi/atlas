/**
 * Public website feature — public entry point (Prompt 11).
 */
export { PublicWebsiteRouter } from './PublicWebsiteRouter';
export {
  resolvePublicWebsiteContext,
  getCurrentPublicWebsiteContext,
  DEV_OVERRIDE_PARAM,
} from './utils/hostname-resolution.utils';
export type {
  PublicWebsiteContext,
  PublicWebsiteLookupType,
} from './utils/hostname-resolution.utils';
