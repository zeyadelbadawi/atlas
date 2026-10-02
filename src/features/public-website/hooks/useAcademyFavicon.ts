/**
 * The Academy's own favicon on its public website (2 Oct 2026).
 *
 * `index.html` declares the platform's `/favicon.svg`, and nothing ever
 * replaced it, so an Owner's uploaded favicon never showed. The backend
 * serves it at `public/websites/:academyId/favicon?v=<version>` (the
 * version changes with the favicon, so browsers' favicon caches pick up a
 * new upload) and names the version in the hostname resolution. This hook
 * puts that link in the head for every page of the Academy's site and
 * sets the platform icon aside while it does; with no favicon the head is
 * left exactly as it was. A server-rendered page already carries the same
 * tag (`renderSeoHeadHtml`), which is adopted rather than duplicated.
 */
import { useEffect } from 'react';
import { ENV } from '@config';
import type { HostnameResolution } from '@types';

export const ACADEMY_FAVICON_ATTR = 'data-atlas-favicon';

export function academyFaviconHref(
  academy: Pick<HostnameResolution, 'academyId' | 'faviconVersion'> | undefined,
  apiBaseUrl: string = ENV.apiBaseUrl
): string | undefined {
  if (!academy?.faviconVersion) return undefined;
  return `${apiBaseUrl.replace(/\/+$/, '')}/public/websites/${encodeURIComponent(
    academy.academyId
  )}/favicon?v=${encodeURIComponent(academy.faviconVersion)}`;
}

export function useAcademyFavicon(href: string | undefined): void {
  useEffect(() => {
    if (!href) return;
    const defaults = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>(
        `link[rel~="icon"]:not([${ACADEMY_FAVICON_ATTR}])`
      )
    );
    defaults.forEach((link) => link.remove());

    const link =
      document.head.querySelector<HTMLLinkElement>(
        `link[${ACADEMY_FAVICON_ATTR}]`
      ) ?? document.createElement('link');
    link.rel = 'icon';
    link.href = href;
    link.setAttribute(ACADEMY_FAVICON_ATTR, 'true');
    if (!link.isConnected) document.head.appendChild(link);

    return () => {
      link.remove();
      defaults.forEach((node) => document.head.appendChild(node));
    };
  }, [href]);
}
