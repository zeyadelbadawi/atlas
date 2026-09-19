/**
 * `/academy-chooser` (P64 Phase 1, AD-5 / AD-12).
 *
 * Where `RouteGuard` sends a `learner` principal holding a session on the
 * platform host: the management dashboard is not theirs (D2), so instead
 * of a 403 they get the list of academy websites they can learn on, and a
 * sign-out. Rendered inside the authentication layout, outside the
 * dashboard chrome — no sidebar, no organization switcher, none of the
 * management furniture a learner should never see.
 */
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import { AcademyChooser } from '../components/AcademyChooser';

export default function AcademyChooserPage(): JSX.Element {
  return (
    <AcademyChooser
      titleKey="auth:academyChooser.title"
      descriptionKey="auth:academyChooser.description"
      // P64 Phase 2 — the learner dashboard home, not the retired
      // `/my-learning`. Both arrive in the same place (that URL redirects),
      // but a learner who has just been told "this host is not for you"
      // should not then be bounced a second time on arrival.
      targetPath={LEARNER_ROUTES.root}
      showSignOut
    />
  );
}
