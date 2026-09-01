/**
 * Public Website Router (Prompt 11).
 *
 * The entire public-runtime route tree — mounted by `AppRouter` INSTEAD
 * OF the normal dashboard/auth/marketing tree whenever
 * `resolvePublicWebsiteContext` decides the current hostname is an
 * Academy website, never alongside it (so there is no path collision
 * with Atlas's own `/` marketing route — see `Reports/ARCHITECTURE.md`,
 * Prompt 11, "Public Runtime Mounting").
 *
 * There is exactly one data-driven catch-all page route: which
 * `WebsitePage` renders is resolved from `pathname` at runtime
 * (`resolvePathToPage`), not from a fixed set of `<Route path>` entries
 * — Custom Pages and the Home/About/Courses/FAQs/Contact core pages all
 * flow through the same one path, matching how they are genuinely
 * data, not compile-time routes.
 */
import { Route, Routes } from 'react-router-dom';
import { PublicWebsiteStatus } from './components/PublicWebsiteStatus';
import { PublicWebsitePage } from './components/PublicWebsitePage';
import { PublicWebsiteRobotsRoute } from './components/PublicWebsiteRobotsRoute';
import { PublicWebsiteSitemapRoute } from './components/PublicWebsiteSitemapRoute';
import { PublicWebsiteSignInPage } from './components/PublicWebsiteSignInPage';
import { PublicWebsiteSignUpPage } from './components/PublicWebsiteSignUpPage';
import { usePublicWebsiteData } from './hooks/usePublicWebsiteData';
import type { PublicWebsiteContext } from './utils/hostname-resolution.utils';

export interface PublicWebsiteRouterProps {
  readonly context: Extract<PublicWebsiteContext, { mode: 'academy-website' }>;
}

/** `window.location.hostname` for a real subdomain/custom-domain visit (both cases the context's `value` already equals it); the dev-override slug in local development only. */
function resolveLookupKey(context: PublicWebsiteRouterProps['context']): string {
  return context.lookupType === 'dev-override' ? context.value : window.location.hostname;
}

function PublicWebsiteShell({ lookupKey }: { readonly lookupKey: string }): JSX.Element {
  const data = usePublicWebsiteData(lookupKey);

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  return <PublicWebsitePage data={data} />;
}

export function PublicWebsiteRouter({ context }: PublicWebsiteRouterProps): JSX.Element {
  const lookupKey = resolveLookupKey(context);

  return (
    <Routes>
      <Route path="/robots.txt" element={<PublicWebsiteRobotsRoute lookupKey={lookupKey} />} />
      <Route path="/sitemap.xml" element={<PublicWebsiteSitemapRoute lookupKey={lookupKey} />} />
      {/* Phase 1 (Extended Scope, Decision 11, dependency C) — two
          separate pages, matching the confirmed product requirement,
          reached before the data-driven catch-all so they are never
          shadowed by a Custom Page happening to share the same slug. */}
      <Route path="/sign-in" element={<PublicWebsiteSignInPage lookupKey={lookupKey} />} />
      <Route path="/sign-up" element={<PublicWebsiteSignUpPage lookupKey={lookupKey} />} />
      <Route path="*" element={<PublicWebsiteShell lookupKey={lookupKey} />} />
    </Routes>
  );
}

/** Default export so `AppRouter` can `lazy()`-load this route tree exactly like every other top-level route component. */
export default PublicWebsiteRouter;
