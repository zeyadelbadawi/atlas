/**
 * Answers a retired academy-website learner URL
 * (`RETIRED_ACADEMY_LEARNER_ROUTES`) with a client-side redirect to its
 * `/my/*` replacement, carrying `:courseId` / `:lessonId` across —
 * `/my-learning/courses/c-1/learn/l-9` becomes `/my/courses/c-1/learn/l-9`,
 * in this locale, with the dev-preview parameter preserved by
 * `usePublicWebsiteHrefBuilder`.
 *
 * `PublicWebsiteRedirect` takes a literal `to`; this one resolves it from
 * the URL, which is what a template with parameters needs.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { resolveRetiredAcademyLearnerTarget } from '@app/routes/retired-learner-routes';
import type { PublicWebsiteLocale } from '@types';
import { usePublicWebsiteHrefBuilder } from '../utils/public-website-link-renderer';

export interface PublicWebsiteRetiredLearnerRedirectProps {
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsiteRetiredLearnerRedirect({
  locale,
}: PublicWebsiteRetiredLearnerRedirectProps): JSX.Element {
  const location = useLocation();
  const buildHref = usePublicWebsiteHrefBuilder(locale);
  const unprefixed =
    locale === 'en'
      ? location.pathname
      : location.pathname.replace(/^\/ar/, '') || '/';

  return (
    <Navigate
      to={buildHref(resolveRetiredAcademyLearnerTarget(unprefixed))}
      replace
    />
  );
}
