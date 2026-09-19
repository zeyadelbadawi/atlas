/**
 * A permanent redirect between two paths on the SAME academy website.
 *
 * `<Navigate to="/my/courses">` would be almost right and quietly wrong:
 * it drops an Arabic visitor out of `/ar` and loses the dev-preview
 * parameter, the two bugs `usePublicWebsiteHrefBuilder` exists to prevent.
 * That builder is a hook, so applying it inside a `<Route element>` needs a
 * component — this one.
 *
 * `replace`, always: a retired URL must not sit in history, or the back
 * button bounces the visitor straight through the redirect again.
 */
import { Navigate } from 'react-router-dom';
import type { PublicWebsiteLocale } from '@types';
import { usePublicWebsiteHrefBuilder } from '../utils/public-website-link-renderer';

export interface PublicWebsiteRedirectProps {
  /** The bare, unprefixed destination path. */
  readonly to: string;
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsiteRedirect({
  to,
  locale,
}: PublicWebsiteRedirectProps): JSX.Element {
  const buildHref = usePublicWebsiteHrefBuilder(locale);
  return <Navigate to={buildHref(to)} replace />;
}
