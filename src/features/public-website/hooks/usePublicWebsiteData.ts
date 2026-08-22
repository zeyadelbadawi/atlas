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
 */
import { useResolveHostname } from './useResolveHostname';
import { usePublishedWebsite } from './usePublishedWebsite';
import { usePublishedPages } from './usePublishedPages';
import type { HostnameResolution, WebsiteConfiguration, WebsitePage } from '@types';

export type PublicWebsiteDataState =
  | { readonly status: 'loading' }
  | { readonly status: 'not-found' }
  | { readonly status: 'unavailable' }
  | { readonly status: 'unpublished' }
  | {
      readonly status: 'ready';
      readonly academy: HostnameResolution;
      readonly configuration: WebsiteConfiguration;
      readonly pages: readonly WebsitePage[];
    };

export function usePublicWebsiteData(lookupKey: string): PublicWebsiteDataState {
  const hostnameQuery = useResolveHostname(lookupKey);
  const academyId = hostnameQuery.data?.academyId;

  const configQuery = usePublishedWebsite(academyId);
  const pagesQuery = usePublishedPages(academyId);

  if (hostnameQuery.isLoading) return { status: 'loading' };
  if (hostnameQuery.isError) return { status: 'unavailable' };
  if (!hostnameQuery.data) return { status: 'not-found' };

  if (configQuery.isLoading || pagesQuery.isLoading) return { status: 'loading' };
  if (configQuery.isError || pagesQuery.isError) return { status: 'unavailable' };
  if (!configQuery.data || !pagesQuery.data) return { status: 'unavailable' };
  if (configQuery.data.status !== 'published') return { status: 'unpublished' };

  const academy = hostnameQuery.data;

  return {
    status: 'ready',
    academy,
    configuration: configQuery.data,
    pages: pagesQuery.data,
  };
}
