/**
 * The retired `/dashboard/learning/*` routes (P64 Phase 1, D2 / AD-12).
 *
 * Every learner page that used to render here now lives on the academy
 * website under `/my-learning/*`. The route constants are kept — other
 * code still names them — but they all resolve to this one page, which
 * sends the visitor to the right academy host: straight there (a
 * `window.location` navigation, since it is another origin) when the
 * account has exactly one academy with a website, otherwise the chooser.
 * Only a management principal can reach this at all — a pure learner is
 * turned away at the `/dashboard` root by `RouteGuard`.
 */
import { PageContainer } from '@components/layout';
import { AcademyChooser } from '../components/AcademyChooser';

export default function LearnerSurfaceRedirectPage(): JSX.Element {
  return (
    <PageContainer className="flex justify-center py-12">
      <div className="w-full max-w-md">
        <AcademyChooser
          titleKey="auth:learnerRedirect.title"
          descriptionKey="auth:learnerRedirect.description"
          targetPath="/my-learning"
          autoNavigateSingle
        />
      </div>
    </PageContainer>
  );
}
