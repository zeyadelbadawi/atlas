/**
 * Early public-website requests (Reports/LCP_ROOT_CAUSE.md, fix B).
 *
 * On an Academy website the hostname — and so the first request — is
 * known the moment the page loads, but the data hooks only run after the
 * app has downloaded, booted and rendered. `startPublicWebsitePrefetch`
 * (called from `main.tsx`) issues the same requests the hooks would make,
 * in parallel with the app's own code and translations:
 *
 *   resolve(lookupKey) → configuration(academyId) + pages(academyId)
 *
 * Each hook's `queryFn` takes its early request once (`takePrefetched`)
 * and otherwise fetches normally, so React Query's caching, error
 * handling and retries are unchanged: a failed early request is a failed
 * first attempt, retried like any other.
 */
import type { HostnameResolution } from '@types';
import { publicWebsiteService } from './PublicWebsiteService';

const inFlight = new Map<string, Promise<unknown>>();

function remember<T>(key: string, request: Promise<T>): Promise<T> {
  // Observed here so an early failure isn't an unhandled rejection before
  // its hook takes it; the hook still receives the rejection.
  request.catch(() => undefined);
  inFlight.set(key, request);
  return request;
}

export const prefetchKeys = {
  resolve: (lookupKey: string) => `resolve:${lookupKey}`,
  configuration: (academyId: string) => `configuration:${academyId}`,
  pages: (academyId: string) => `pages:${academyId}`,
};

export interface PublicWebsitePrefetchOptions {
  /** Called with the hostname lookup's answer (e.g. to start the Academy's theme). */
  readonly onResolved?: (resolution: HostnameResolution) => void;
}

/** Starts resolve → configuration + pages for this page load. */
export function startPublicWebsitePrefetch(
  lookupKey: string,
  options: PublicWebsitePrefetchOptions = {}
): void {
  // Browser only: this map is module state, which on a server would be
  // shared by every request (Reports/SSR_ARCHITECTURE_ANALYSIS.md §4 #7).
  if (typeof window === 'undefined') return;
  if (!lookupKey || inFlight.has(prefetchKeys.resolve(lookupKey))) return;
  const resolved = remember(
    prefetchKeys.resolve(lookupKey),
    publicWebsiteService.resolveHostname(lookupKey)
  );
  void resolved.then(
    (resolution) => {
      if (!resolution) return;
      remember(
        prefetchKeys.configuration(resolution.academyId),
        publicWebsiteService.getPublishedWebsite(resolution.academyId)
      );
      remember(
        prefetchKeys.pages(resolution.academyId),
        publicWebsiteService.getPublishedPages(resolution.academyId)
      );
      options.onResolved?.(resolution);
    },
    () => undefined
  );
}

/** The early request for `key`, once; `undefined` when there is none. */
export function takePrefetched<T>(key: string): Promise<T> | undefined {
  if (typeof window === 'undefined') return undefined;
  const request = inFlight.get(key) as Promise<T> | undefined;
  inFlight.delete(key);
  return request;
}
