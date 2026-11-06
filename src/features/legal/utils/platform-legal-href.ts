/**
 * B9 (UX audit) V05 — where the platform's Terms of Service and Privacy
 * Policy live, as an absolute URL that works from any host.
 *
 * Academy websites don't route `/terms` or `/privacy-policy` (every path
 * there is the academy's own site, so those were a "page not found"). The
 * documents are the platform's, on its marketing site (`VITE_SITE_URL`,
 * `/ar/...` in Arabic). Without a configured site URL (local development)
 * they are the app's own pages on this origin, which in development is the
 * platform app whenever the academy preview parameter is absent.
 */
import { ENV } from '@config';
import { PUBLIC_ROUTES } from '@app/routes/route-paths';

export type PlatformLegalDocument = 'terms' | 'privacy';

const PATHS: Readonly<Record<PlatformLegalDocument, string>> = {
  terms: PUBLIC_ROUTES.terms,
  privacy: PUBLIC_ROUTES.privacyPolicy,
};

export function platformLegalHref(
  document: PlatformLegalDocument,
  language: string | undefined,
  siteUrl: string | undefined = ENV.siteUrl
): string {
  const origin =
    siteUrl ?? (typeof window === 'undefined' ? '' : window.location.origin);
  const prefix = language?.startsWith('ar') ? '/ar' : '';
  return `${origin.replace(/\/+$/, '')}${prefix}${PATHS[document]}`;
}
