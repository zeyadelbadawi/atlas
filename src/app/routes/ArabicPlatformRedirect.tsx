/**
 * `/ar/...` on the platform host, inside the app.
 *
 * On a full page load the edge answers these itself (B1: the static Arabic
 * pages, or the Arabic 404). Reached by client-side navigation, a kept
 * page's Arabic address (`/ar/contact`, `/ar/privacy-policy`, `/ar/terms`)
 * forwards to its in-app page, keeping its query (`?topic=`) and hash;
 * anything else forwards to `/ar` (the static Arabic home, fetched by
 * `StaticMarketingRedirect`). The static marketing pages' Arabic twins
 * (`/ar/pricing`…) have their own routes. Replaces the history entry, so
 * Back does not bounce.
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
