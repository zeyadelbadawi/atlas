/**
 * The retired `/dashboard/learning/*` routes (P64 Phase 2, D2 / AD-12).
 *
 * Every learner page that used to render here now lives on the academy
 * website under `/my/*`. Nothing is mounted at the old paths any more —
 * they resolve to this one page, which sends the visitor to the right
 * academy host: straight there (a `window.location` navigation, since it
 * is another origin) when the account has exactly one academy with a
 * website, otherwise the chooser. Only a management principal can reach
 * this at all — a pure learner is turned away at the `/dashboard` root by
 * `RouteGuard`.
 *
 * Phase 2 gives the redirect a real destination rather than one shared
 * landing page: `resolveRetiredLearnerTarget` reads the URL the visitor
 * actually asked for and returns the `/my/*` path that replaced it, so a
 * bookmarked course keeps its `:courseId` instead of dropping the visitor
 * at a generic list and asking them to find it again.
 */
import { useLocation } from 'react-router-dom';
import { PageContainer } from '@components/layout';
// Deep module path, not the `@app/routes` barrel: that barrel re-exports
// `AppRouter`, which lazily owns this page — importing it here would close
// a cycle for no benefit. Matches `AcademyChooser`'s own
// `@app/routes/route-paths` import.
import { resolveRetiredLearnerTarget } from '@app/routes/retired-learner-routes';
import { AcademyChooser } from '../components/AcademyChooser';

export default function LearnerSurfaceRedirectPage(): JSX.Element {
  const location = useLocation();

  return (
    <PageContainer className="flex justify-center py-12">
      <div className="w-full max-w-md">
        <AcademyChooser
          titleKey="auth:learnerRedirect.title"
          descriptionKey="auth:learnerRedirect.description"
          targetPath={resolveRetiredLearnerTarget(location.pathname)}
          autoNavigateSingle
        />
      </div>
    </PageContainer>
  );
}
