/**
 * `/my/certificates` — deliberately empty until Phase 3 (§E.1).
 *
 * The route exists now, in Phase 2, on purpose. Certificates are issued by
 * Phase 3's eligibility evaluator (AD-11, D6), so there is nothing to list
 * yet — but the section is named in the navigation, the Overview links to
 * it, and a learner who finishes a course this month will look for it. An
 * empty state that SAYS certificates arrive later is a promise; a 404 is a
 * bug report.
 *
 * This is the one section whose emptiness is the final answer rather than a
 * placeholder, which is why it does not carry a `data:` marker.
 */
import { Award } from 'lucide-react';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';

export default function LearnerCertificatesPage(): JSX.Element {
  return (
    <>
      <LearnerPageHeader
        section="certificates"
        titleKey="learning:learnerDashboard.certificates.title"
        descriptionKey="learning:learnerDashboard.certificates.subtitle"
      />

      <LearnerSectionPlaceholder
        icon={Award}
        titleKey="learning:learnerDashboard.certificates.empty.title"
        descriptionKey="learning:learnerDashboard.certificates.empty.description"
      />
    </>
  );
}
