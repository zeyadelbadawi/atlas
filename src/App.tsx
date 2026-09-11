/**
 * Application root.
 *
 * WHY A DATA ROUTER. This used the classic `<BrowserRouter>`, under which
 * react-router-dom v6 exposes **no** in-app navigation-blocking API:
 * `useBlocker` and `unstable_usePrompt` both throw "useBlocker must be
 * used within a data router", and `<ScrollRestoration>` is inert. That is
 * why unsaved-changes protection only ever covered tab close and refresh,
 * and why every internal navigation left the new page scrolled wherever
 * the previous one had been.
 *
 * Switching to `createBrowserRouter` is a much smaller change than it
 * looks: the single splat route below renders the existing `<AppRouter>`
 * tree unchanged, and all ~98 routes keep working as descendant
 * `<Routes>`. Nothing about the route table moved. What changes is that
 * `useBlocker` and `<ScrollRestoration>` now actually function.
 *
 * `AppProviders` stays OUTSIDE the router, exactly where it already was —
 * it was outside `<BrowserRouter>` too, and nothing inside it uses a
 * router hook (verified before making this change), so its position is
 * unchanged rather than newly risky.
 */
import {
  createBrowserRouter,
  RouterProvider,
  ScrollRestoration,
} from 'react-router-dom';
import { AppProviders } from '@app/providers';
import { AppRouter } from '@app/routes';
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
 */
function RootRoute(): JSX.Element {
  return (
    <UnsavedChangesProvider>
      <CookieConsentProvider>
        {/*
          Resets scroll to the top on PUSH navigation and restores the
          saved offset on POP (back/forward). Only functions under a data
          router, which is the other half of why this file changed.
        */}
        <ScrollRestoration />
        <AppRouter />
        <CookieConsentBanner />
        <CookiePreferencesDialog />
        <NavigationBlockDialog />
      </CookieConsentProvider>
    </UnsavedChangesProvider>
  );
}

const router = createBrowserRouter([{ path: '*', element: <RootRoute /> }]);

export default function App(): JSX.Element {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
