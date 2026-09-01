/**
 * Shared `WebsiteLinkRenderer` for every public-runtime page (Prompt 11;
 * extracted in Phase 1, Extended Scope, dependency C, so the new Sign
 * In/Sign Up pages use the exact same real-navigation behavior
 * `PublicWebsitePage` already established, instead of a second, drifting
 * copy: internal targets use react-router's `Link` (client-side, no full
 * reload), external targets use a plain `<a target="_blank">`.
 *
 * Found during Phase 1 (Extended Scope, dependency C) real browser
 * testing: an internal `<Link to="/sign-in">` (or any other in-site link)
 * clicked while previewing a site via `DEV_OVERRIDE_PARAM` dropped that
 * query param on navigation — client-side routing to a bare path carries
 * no hostname, and dev-override is the ONE case where the Academy's
 * identity lives in the query string rather than the real hostname. A
 * real subdomain/custom-domain deployment carries Academy identity in the
 * hostname itself and is entirely unaffected; this only preserves the
 * param when it's already present, so production behavior is unchanged.
 */
import { Link, useSearchParams } from 'react-router-dom';
import type { WebsiteLinkRenderer } from '@features/website';
import { DEV_OVERRIDE_PARAM } from './hostname-resolution.utils';

export function usePublicWebsiteLinkRenderer(): WebsiteLinkRenderer {
  const [searchParams] = useSearchParams();
  const devSlug = searchParams.get(DEV_OVERRIDE_PARAM);

  return ({ href, external, className, children }) => {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
        </a>
      );
    }

    const to = devSlug ? `${href}?${DEV_OVERRIDE_PARAM}=${encodeURIComponent(devSlug)}` : href;
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  };
}
