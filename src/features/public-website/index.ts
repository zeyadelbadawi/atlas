/**
 * Public website feature — public entry point (Prompt 11).
 */
export { PublicWebsiteRouter } from './PublicWebsiteRouter';
export type { PublicWebsiteRouterProps } from './PublicWebsiteRouter';
export {
  resolvePublicWebsiteContext,
  getCurrentPublicWebsiteContext,
  DEV_OVERRIDE_PARAM,
} from './utils/hostname-resolution.utils';
export type {
  PublicWebsiteContext,
  PublicWebsiteLookupType,
} from './utils/hostname-resolution.utils';

/** Server rendering of the public website (Reports/SSR_ARCHITECTURE_ANALYSIS.md). */
export { classifyPublicWebsiteData } from './hooks/usePublicWebsiteData';
export type {
  PublicWebsiteDataState,
  PublicWebsiteQueryStates,
} from './hooks/usePublicWebsiteData';
export {
  SeoHeadCollectorContext,
  renderSeoHeadHtml,
} from './hooks/useDocumentSeo';
export type { UseDocumentSeoOptions } from './hooks/useDocumentSeo';
