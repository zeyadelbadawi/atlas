/**
 * Where "Finish course" leads (Task C).
 *
 * THE VERDICT IS THE SERVER'S. The page re-reads the course's completion
 * evaluation (`GET /learning/courses/:id/completion`) on arrival rather
 * than trusting what the player last knew: finishing the last activity is
 * not the same as completing the course — an earlier quiz may still be
 * failed, an assignment awaiting grading, a minimum score unmet. So the
 * page says one of two true things: "You've completed {course}", or
 * exactly what is still missing, each with a way to go and do it.
 *
 * A CERTIFICATE ONLY WHEN THERE IS ONE. A link to view it appears only
 * when the server says a certificate has been issued and its document is
 * ready. While one is being issued (`eligible`, or issued with the PDF
 * still rendering) the page says so and re-reads every few seconds — for
 * a bounded time, never forever. A course without certificates, or a
 * revoked one, shows no certificate promise at all.
 *
 * Arriving here directly, refreshing it, or arriving twice is harmless:
 * it only reads.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Award, GraduationCap, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@components/feedback';
import { useDateFormatter } from '@hooks';
import { buildPath, LEARNER_ROUTES } from '@app/routes/route-paths';
import { useCourseCompletion } from '@features/learning';
import type { CourseCompletion } from '@types';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { CourseCompletionCard } from '../components/CourseCompletionCard';
import { readErrorKind } from '../utils/read-error-kind';

/** How often, and for how long, a certificate being issued is re-read. */
export const CERTIFICATE_POLL_MS = 5_000;
export const CERTIFICATE_POLL_LIMIT = 24; // two minutes

type CertificateView = 'ready' | 'preparing' | 'none';

export function certificateView(completion: CourseCompletion): CertificateView {
  const certificate = completion.certificate;
  if (!completion.completed || !certificate.enabled) return 'none';
  if (certificate.status === 'issued' && certificate.renderStatus === 'ready')
    return 'ready';
  if (
    certificate.status === 'eligible' ||
    (certificate.status === 'issued' && certificate.renderStatus === 'pending')
  )
    return 'preparing';
  return 'none';
}

export default function LearnerCourseCompletePage(): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { buildHref } = useLearnerSurface();
  const { courseId = '' } = useParams<{ courseId: string }>();
  const polls = useRef(0);
  const [pollingExhausted, setPollingExhausted] = useState(false);

  const query = useCourseCompletion(courseId, {
    fresh: true,
    refetchInterval: (data) => {
      if (!data || certificateView(data) !== 'preparing') return false;
      if (polls.current >= CERTIFICATE_POLL_LIMIT) return false;
      polls.current += 1;
      return CERTIFICATE_POLL_MS;
    },
  });

  const view = query.data ? certificateView(query.data) : 'none';
  useEffect(() => {
    if (view === 'preparing' && polls.current >= CERTIFICATE_POLL_LIMIT)
      setPollingExhausted(true);
  }, [view, query.dataUpdatedAt]);

  const courseHref = buildHref(
    buildPath(LEARNER_ROUTES.courseProgress, { courseId })
  );

  const header = (
    <LearnerPageHeader
      section="courses"
      title={query.data?.courseTitle}
      titleKey="learning:completePage.fallbackTitle"
      trailing={{
        labelKey: 'learning:completePage.breadcrumb',
      }}
    />
  );

  if (query.error) {
    const kind = readErrorKind(query.error);
    if (kind === 'notFound' || kind === 'forbidden') {
      return (
        <>
          {header}
          <EmptyState
            icon={GraduationCap}
            titleKey="learning:learnerDashboard.courseProgress.notEnrolled.title"
            descriptionKey="learning:learnerDashboard.courseProgress.notEnrolled.description"
          />
        </>
      );
    }
    return (
      <>
        {header}
        <ErrorState kind={kind} onRetry={() => void query.refetch()} />
      </>
    );
  }

  if (!query.data) {
    return (
      <>
        {header}
        <Skeleton className="h-48 w-full" />
      </>
    );
  }

  const completion = query.data;

  if (!completion.completed) {
    return (
      <>
        {header}
        <section
          className="space-y-4"
          data-testid="course-complete-page"
          data-state="incomplete"
        >
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t('learning:completePage.notYetTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('learning:completePage.notYetDescription')}
            </p>
          </div>
          <CourseCompletionCard courseId={courseId} />
          <Button asChild variant="outline">
            <Link to={courseHref}>
              {t('learning:completePage.backToCourse')}
            </Link>
          </Button>
        </section>
      </>
    );
  }

  return (
    <>
      {header}
      <section
        className="space-y-6 rounded-lg border border-success/30 bg-success-surface p-6 text-center"
        data-testid="course-complete-page"
        data-state="completed"
        aria-labelledby="course-complete-title"
      >
        <GraduationCap className="mx-auto size-10 text-success" aria-hidden />
        <div className="space-y-2">
          <h2
            id="course-complete-title"
            className="font-display text-xl font-semibold text-foreground"
            dir="auto"
          >
            {t('learning:completePage.title', {
              course: completion.courseTitle,
            })}
          </h2>
          {completion.completedAt ? (
            <p className="text-sm text-muted-foreground">
              {t('learning:completePage.completedOn', {
                date: fmt.date(completion.completedAt),
              })}
            </p>
          ) : null}
        </div>

        {view === 'ready' ? (
          <div data-testid="course-complete-certificate" data-state="ready">
            <Button asChild>
              <Link to={buildHref(LEARNER_ROUTES.certificates)}>
                <Award className="size-4" aria-hidden />
                {t('learning:player.courseComplete.viewCertificate')}
              </Link>
            </Button>
          </div>
        ) : view === 'preparing' ? (
          <p
            role="status"
            aria-live="polite"
            data-testid="course-complete-certificate"
            data-state="preparing"
            className="flex items-center justify-center gap-2 text-sm text-foreground"
          >
            {pollingExhausted ? null : (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {pollingExhausted
              ? t('learning:completePage.certificateLater')
              : t('learning:completePage.certificatePreparing')}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link to={buildHref(`/courses/${courseId}`)}>
              <Star className="size-4" aria-hidden />
              {t('learning:player.courseComplete.rateCourse')}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to={courseHref}>
              {t('learning:completePage.backToCourse')}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to={buildHref(LEARNER_ROUTES.courses)}>
              {t('learning:learnerDashboard.nav.courses')}
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
