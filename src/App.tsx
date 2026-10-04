/**
 * Application root.
 *
 * WHY A DATA ROUTER. This used the classic `<BrowserRouter>`, under which
 * react-router-dom v6 exposes **no** in-app navigation-blocking API:
 * `useBlocker` and `unstable_usePrompt` both throw "useBlocker must be
 * used within a data router", and scroll handling had no navigation
 * lifecycle to hook into. That is
 * why unsaved-changes protection only ever covered tab close and refresh,
 * and why every internal navigation left the new page scrolled wherever
 * the previous one had been.
 *
 * Switching to `createBrowserRouter` is a much smaller change than it
 * looks: the single splat route below renders the existing `<AppRouter>`
 * tree unchanged, and all ~98 routes keep working as descendant
 * `<Routes>`. Nothing about the route table moved. What changes is that
 * `useBlocker` and route-aware scroll handling (`AppScrollManager`) work.
 *
 * `AppProviders` stays OUTSIDE the router, exactly where it already was —
 * it was outside `<BrowserRouter>` too, and nothing inside it uses a
 * router hook (verified before making this change), so its position is
 * unchanged rather than newly risky.
 *
 * SERVER RENDERING (public Academy website only,
 * Reports/SSR_ARCHITECTURE_ANALYSIS.md). The browser router is created on
 * first use rather than at import, so this module can be imported on the
 * server, which passes a memory router over the SAME `appRoutes` and the
 * request's location and snapshot. In the browser, with no props, this is
 * exactly the tree it always was.
 */
import {
  createBrowserRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router-dom';
import type { DehydratedState, QueryClient } from '@tanstack/react-query';
import {
  HydrationSnapshotProvider,
  RequestLocationProvider,
  useRequestLocation,
  type HydrationSnapshot,
  type RequestLocation,
} from '@hooks';
import { ENV } from '@config';
import { resolvePublicWebsiteContext } from '@utils';
import type { LanguageCode } from '@types';
import { AppProviders } from '@app/providers';
// The module itself, not the `@app/routes` barrel (which re-exports the
// dashboard's guards).
import { AppRouter } from '@app/routes/AppRouter';
import { AppScrollManager } from '@app/routes/AppScrollManager';
import {
  NavigationBlockDialog,
  UnsavedChangesProvider,
} from '@features/unsaved-changes';
import {
  CookieConsentBanner,
  CookieConsentProvider,
  CookiePreferencesDialog,
} from '@features/legal';

/**
 * Everything that needs router context but is not itself a route.
 *
 * Consent sits here, inside the router, because the preferences dialog
 * links to the Privacy Policy — someone deciding what to consent to must
 * be able to read what they are consenting to, and a `<Link>` outside a
 * router throws. The banner and dialog are mounted once rather than per
 * layout so the choice is offered on every surface, including the tenant
 * and academy public sites, which do not use `PublicLayout`.
 *
 * On an Academy's public website the banner and dialog are rendered by the
 * website router instead (`PublicWebsiteConsentLayer`), inside a scope that
 * wears that Academy's palette: mounted here they sat outside every website
 * scope and took the dashboard's teal and its dark mode. The host decision
 * is the one `AppRouter` makes, from the same request location, so the
 * server and the browser agree. The provider stays here, so there is one
 * consent state for the banner, the dialog and the footer links.
 */
function RootRoute(): JSX.Element {
  const { hostname, search } = useRequestLocation();
  const isAcademyWebsite =
    resolvePublicWebsiteContext(
      hostname,
      search,
      ENV.platformBaseDomain,
      ENV.isDevelopment
    ).mode === 'academy-website';
  return (
    <UnsavedChangesProvider>
      <CookieConsentProvider>
        {/*
          Top on a new page, untouched on a query-only change (tabs,
          filters), the saved offset on Back/Forward once the page is tall
          enough to hold it — see AppScrollManager.
        */}
        <AppScrollManager />
        <AppRouter />
        {!isAcademyWebsite && (
          <>
            <CookieConsentBanner />
            <CookiePreferencesDialog />
          </>
        )}
        <NavigationBlockDialog />
      </CookieConsentProvider>
    </UnsavedChangesProvider>
  );
}

export const appRoutes: RouteObject[] = [{ path: '*', element: <RootRoute /> }];

type AppRouterInstance = ReturnType<typeof createBrowserRouter>;

let browserRouter: AppRouterInstance | undefined;

function getBrowserRouter(): AppRouterInstance {
  browserRouter ??= createBrowserRouter(appRoutes);
  return browserRouter;
}

export interface AppProps {
  /** Server only: a memory router over `appRoutes` at the request's URL. */
  readonly router?: AppRouterInstance;
  /** Server only: the request's host, origin and query. */
  readonly requestLocation?: RequestLocation;
  /** What the page was server-rendered with (server, and the browser while it hydrates). */
  readonly hydrationSnapshot?: HydrationSnapshot | null;
  readonly initialLanguage?: LanguageCode;
  readonly queryClient?: QueryClient;
  readonly dehydratedState?: DehydratedState;
}

export default function App({
  router,
  requestLocation,
  hydrationSnapshot = null,
  initialLanguage,
  queryClient,
  dehydratedState,
}: AppProps = {}): JSX.Element {
  // The same wrappers on the server and in the browser, so the two trees
  // match exactly when a server-rendered page hydrates.
  return (
    <RequestLocationProvider value={requestLocation ?? null}>
      <HydrationSnapshotProvider value={hydrationSnapshot}>
        <AppProviders
          initialLanguage={initialLanguage}
          queryClient={queryClient}
          dehydratedState={dehydratedState}
        >
          <RouterProvider router={router ?? getBrowserRouter()} />
        </AppProviders>
      </HydrationSnapshotProvider>
    </RequestLocationProvider>
  );
}
