/**
 * DL-63 — a marketing page as a link from inside the app: the apex URL on
 * the dashboard host, the bare path elsewhere (`marketingHref`). Used by the
 * logo and "home" links, which are plain `<a href>`: the marketing pages
 * are static HTML on a full page load either way.
 */
import { ENV } from '@config';
import { marketingHref } from '@utils';

export function appMarketingHref(path: string): string {
  return marketingHref(path, {
    hostname: typeof window === 'undefined' ? '' : window.location.hostname,
    siteUrl: ENV.siteUrl,
    appUrl: ENV.appUrl,
  });
}
