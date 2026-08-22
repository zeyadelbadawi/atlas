/**
 * Public website feature — public entry point (Prompt 11).
 */
export { PublicWebsiteRouter } from './PublicWebsiteRouter';
export {
  resolvePublicWebsiteContext,
  getCurrentPublicWebsiteContext,
} from './utils/hostname-resolution.utils';
export type {
  PublicWebsiteContext,
  PublicWebsiteLookupType,
} from './utils/hostname-resolution.utils';
