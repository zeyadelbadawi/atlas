/**
 * The top-level route decision: is this page load an Academy's public
 * website or the Atlas application?
 *
 * Each side is its own lazily loaded module, so an Academy website never
 * downloads the dashboard (its route table, guards, layouts and their
 * dependencies) before it can paint, and the dashboard never downloads
 * the website runtime (Reports/LCP_ROOT_CAUSE.md).
 */
import { Suspense, lazy, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ENV } from '@config';
import { resolvePublicWebsiteContext } from '@utils';
import { useRequestLocation } from '@hooks';
import { ErrorBoundary } from '@app/providers/error/ErrorBoundary';
import { RouteFallback } from './RouteFallback';
import {
  loadedPublicWebsiteRouter,
  preloadPublicWebsiteRouter,
} from './public-website-router-loader';

const LazyPublicWebsiteRouter = lazy(() =>
  preloadPublicWebsiteRouter().then((component) => ({ default: component }))
);
const AtlasAppRoutes = lazy(() => import('./AtlasAppRoutes'));

export function AppRouter(): JSX.Element {
  const location = useLocation();
  const requestLocation = useRequestLocation();
  // Chosen once per mount: switching from the lazy wrapper to the loaded
  // component later would remount the whole website.
  // (`public-website-router-loader.ts` explains why it matters.)
  const [LoadedPublicWebsiteRouter] = useState(loadedPublicWebsiteRouter);

  // Resolved ONCE per page load — the hostname a visitor is on cannot
  // change while this SPA instance is running. When no Platform base
  // domain is configured, this always resolves to `{ mode: 'atlas-app' }`
  // — see `Reports/ARCHITECTURE.md`, Prompt 11, "No Real Atlas Domain
  // Yet".
  const publicWebsiteContext = resolvePublicWebsiteContext(
    requestLocation.hostname,
    requestLocation.search,
    ENV.platformBaseDomain,
    ENV.isDevelopment
  );

  if (publicWebsiteContext.mode === 'academy-website') {
    return (
      <ErrorBoundary resetKey={location.pathname}>
        {LoadedPublicWebsiteRouter ? (
          <LoadedPublicWebsiteRouter context={publicWebsiteContext} />
        ) : (
          <Suspense fallback={<RouteFallback />}>
            <LazyPublicWebsiteRouter context={publicWebsiteContext} />
          </Suspense>
        )}
      </ErrorBoundary>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <AtlasAppRoutes />
    </Suspense>
  );
}
