/**
 * The top-level route decision: is this page load an Academy's public
 * website or the Atlas application?
 *
 * Each side is its own lazily loaded module, so an Academy website never
 * downloads the dashboard (its route table, guards, layouts and their
 * dependencies) before it can paint, and the dashboard never downloads
 * the website runtime (Reports/LCP_ROOT_CAUSE.md).
 */
import { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { ENV } from '@config';
import { getCurrentPublicWebsiteContext } from '@utils';
import { ErrorBoundary } from '@app/providers/error/ErrorBoundary';
import { RouteFallback } from './RouteFallback';

const PublicWebsiteRouter = lazy(
  () => import('@features/public-website/PublicWebsiteRouter')
);
const AtlasAppRoutes = lazy(() => import('./AtlasAppRoutes'));

export function AppRouter(): JSX.Element {
  const location = useLocation();

  // Resolved ONCE per page load — the hostname a visitor is on cannot
  // change while this SPA instance is running. When no Platform base
  // domain is configured, this always resolves to `{ mode: 'atlas-app' }`
  // — see `Reports/ARCHITECTURE.md`, Prompt 11, "No Real Atlas Domain
  // Yet".
  const publicWebsiteContext = getCurrentPublicWebsiteContext(
    ENV.platformBaseDomain,
    ENV.isDevelopment
  );

  if (publicWebsiteContext.mode === 'academy-website') {
    return (
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<RouteFallback />}>
          <PublicWebsiteRouter context={publicWebsiteContext} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <AtlasAppRoutes />
    </Suspense>
  );
}
