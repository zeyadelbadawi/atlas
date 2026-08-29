/**
 * Public website link builder.
 *
 * Found missing during a real browser acceptance test: the dashboard had
 * no clickable "visit your website" affordance anywhere — `WebsiteDomainTab`
 * only ever rendered the subdomain as plain, non-clickable text (and only
 * once a platform base domain is configured, which it isn't in local dev
 * — `PLATFORM_BASE_DOMAIN` is commented out in `atlas-backend/.env`), and
 * every other surface (`WebsitePublishBar`, `ProvisioningStatusPage`,
 * `WebsitePreviewPage`) either shows no URL at all or documents in its own
 * comment that it deliberately doesn't. This is the one place that builds
 * a REAL, working link an owner/manager can actually click, in every
 * environment:
 *
 * - **Development** (`ENV.isDevelopment`): the platform has no real
 *   subdomain routing locally (`{subdomain}.localhost` does not resolve
 *   to this dev server, confirmed against `resolvePublicWebsiteContext`'s
 *   own `isLocalOrIpHost` early-return) — the only URL shape that
 *   actually renders the academy's public site in dev is the existing,
 *   intended `DEV_OVERRIDE_PARAM` query-param override
 *   (`features/public-website/utils/hostname-resolution.utils.ts`),
 *   which needs only `academy.slug` — no platform base domain required.
 * - **Production/staging with a configured platform base domain**: the
 *   real `{subdomain}.{platformBaseDomain}` URL.
 * - **Production/staging with NO platform base domain configured yet**:
 *   `undefined` — there is genuinely no URL to offer yet (matches
 *   `WebsiteDomainTab`'s existing "not configured yet" empty state;
 *   never fabricates a link that would 404).
 */
import { ENV } from '@config';
import { DEV_OVERRIDE_PARAM } from '@features/public-website';

export function getAcademyPublicWebsiteUrl(academySlug: string): string | undefined {
  if (ENV.isDevelopment) {
    const url = new URL(window.location.origin);
    url.searchParams.set(DEV_OVERRIDE_PARAM, academySlug);
    return url.toString();
  }

  if (ENV.platformBaseDomain) {
    return `https://${academySlug}.${ENV.platformBaseDomain}/`;
  }

  return undefined;
}
