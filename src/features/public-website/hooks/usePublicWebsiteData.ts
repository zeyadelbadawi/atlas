/**
 * usePublicWebsiteData hook (Prompt 11).
 *
 * The one place `useResolveHostname` + `usePublishedWebsite` +
 * `usePublishedPages` are composed into a single, exhaustive state a
 * route component can switch on — used identically by the page
 * renderer, `robots.txt`, and `sitemap.xml` routes so all three treat
 * "unknown hostname"/"unavailable"/"unpublished" identically (see
 * `Reports/ARCHITECTURE.md`, Prompt 11, "Public Runtime Error States").
 *
 * `unpublished` is a real, distinct state: an Academy can exist and be
 * resolvable by hostname while its website has never been published (or
 * publish failed) — the public runtime must show a clear, safe message,
 * never a broken renderer.
 *
 * HOW `unpublished` IS DETECTED, AND WHY IT WAS UNREACHABLE BEFORE.
 * `GET /public/websites/:academyId` deliberately 404s for a site that is
 * not published — the publication condition is part of the database query
 * itself, so an unpublished configuration is indistinguishable from a
 * missing one, which is the correct security posture and is not changed
 * here. But this hook treated *any* query error as `unavailable`, so the
 * `unpublished` branch below could never be reached and every deliberately
 * unpublished Academy rendered the generic "temporarily unavailable"
 * outage page.
 *
 * The distinction it needs is already available client-side and needs no
 * new endpoint and no new field: the hostname resolved SUCCESSFULLY, so the
 * Academy exists and is reachable; a `notFound` on its published
 * configuration therefore means "this Academy has no published website",
 * whereas any other failure (5xx, network, timeout) genuinely is
 * infrastructure trouble. Those two must not be conflated: one is a
 * customer's own deliberate choice, the other is Atlas failing.
 *
 * No draft content is exposed by this: the unpublished branch carries only
 * the Academy identity the hostname resolution already returned.
 */
import { useResolveHostname } from './useResolveHostname';
import { usePublishedWebsite } from './usePublishedWebsite';
import { usePublishedPages } from './usePublishedPages';
import type { ApiError } from '@api';
import type {
  HostnameResolution,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';

export type PublicWebsiteDataState =
  | { readonly status: 'loading' }
  | { readonly status: 'not-found' }
  | { readonly status: 'unavailable' }
  | {
      readonly status: 'unpublished';
      /** Identity from the successful hostname resolution, for branding the Coming Soon page. Never draft content. */
      readonly academy: HostnameResolution;
    }
  | {
      readonly status: 'ready';
      readonly academy: HostnameResolution;
      readonly configuration: WebsiteConfiguration;
      readonly pages: readonly WebsitePage[];
    };

/**
 * Whether a query failure was specifically "this does not exist".
 *
 * Checks `kind` as well as `status` because the API client normalises
 * errors, and a transport-level failure has no HTTP status at all — which
 * must NOT be read as a 404.
 */
function isNotFound(error: unknown): boolean {
  const apiError = error as ApiError | null | undefined;
  if (!apiError) return false;
  return apiError.kind === 'notFound' || apiError.status === 404;
}

export function usePublicWebsiteData(
  lookupKey: string
): PublicWebsiteDataState {
  const hostnameQuery = useResolveHostname(lookupKey);
  const academyId = hostnameQuery.data?.academyId;

  const configQuery = usePublishedWebsite(academyId);
  const pagesQuery = usePublishedPages(academyId);

  if (hostnameQuery.isLoading) return { status: 'loading' };
  if (hostnameQuery.isError) return { status: 'unavailable' };
  if (!hostnameQuery.data) return { status: 'not-found' };

  if (configQuery.isLoading || pagesQuery.isLoading)
    return { status: 'loading' };

  const academy = hostnameQuery.data;

  // A 404 on the published configuration means the Academy exists but has
  // no published website — see the note above. Anything else is a real
  // failure and must keep reporting as one.
  if (isNotFound(configQuery.error) || isNotFound(pagesQuery.error)) {
    return { status: 'unpublished', academy };
  }
  if (configQuery.isError || pagesQuery.isError)
    return { status: 'unavailable' };
  if (!configQuery.data || !pagesQuery.data) return { status: 'unavailable' };
  if (configQuery.data.status !== 'published')
    return { status: 'unpublished', academy };

  return {
    status: 'ready',
    academy,
    configuration: configQuery.data,
    pages: pagesQuery.data,
  };
}
