/**
 * `/ar/...` on the platform host (owner decision D6).
 *
 * The only Arabic page the platform host has is the holding page at `/ar`.
 * A kept page's Arabic address (`/ar/contact`, `/ar/privacy-policy`,
 * `/ar/terms`) forwards to that page, keeping its query (`?topic=`) and
 * hash; anything else — the retired marketing pages' Arabic twins included
 * — forwards to `/ar`. Replaces the history entry, so Back does not bounce.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { PUBLIC_ROUTES } from './route-paths';
import { resolveArabicPlatformTarget } from './retired-marketing-routes';

export function ArabicPlatformRedirect(): JSX.Element {
  const { pathname, search, hash } = useLocation();
  const target = resolveArabicPlatformTarget(pathname);
  return (
    <Navigate
      to={
        target === PUBLIC_ROUTES.homeAr ? target : `${target}${search}${hash}`
      }
      replace
    />
  );
}
