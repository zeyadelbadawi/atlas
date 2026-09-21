/**
 * `/my` — the learner dashboard home (P64 Phase 2 §E.1).
 *
 * ANSWERS "WHAT SHOULD I DO NEXT?" BEFORE ANYTHING ELSE, and the section
 * order on the page is that answer: continue learning, then what is due,
 * then what came back, then what the academy is telling everyone.
 * Certificates sit at the bottom because in Phase 2 they are a promise
 * rather than a list.
 *
 * ONE REQUEST, NOT SIX. `GET /learning/overview` is a deliberate
 * aggregate: the point of this page is to be readable in one glance, and
 * six independent queries means six loading states resolving in six
 * different orders — on a phone, a page that rearranges itself three
 * times before it settles.
 *
 * CERTIFICATES ARE AN HONEST ZERO. The contract reports `{ available:
 * false, count: 0 }` rather than omitting the field, so this can say
 * "not being issued yet" instead of rendering an empty list that reads as
 * "you have earned none". Phase 3 flips `available`, and this section
 * starts listing without a frontend change.
 */
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  CalendarClock,
  LayoutDashboard,
  Megaphone,
  PlayCircle,
  Trophy,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { readErrorKind } from '../utils/read-error-kind';
import { useDateFormatter } from '@hooks';
import { buildPath, LEARNER_ROUTES } from '@app/routes/route-paths';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerProgressRing } from '../components/LearnerProgressRing';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { useLearnerOverview } from '../hooks';
import { learnerAssessmentStateLabel } from '../utils/assessment-state.utils';

export default function LearnerOverviewPage(): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const { buildHref } = useLearnerSurface();
  const { data, isLoading, error, refetch } = useLearnerOverview();

  const header = (
    <LearnerPageHeader
      section="overview"
      titleKey="learning:learnerDashboard.overview.title"
      descriptionKey="learning:learnerDashboard.overview.subtitle"
    />
  );

  if (error) {
    return (
      <>
        {header}
        <ErrorState
          kind={readErrorKind(error)}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        {header}
        <div className="space-y-4" role="status" aria-live="polite">
          <span className="sr-only">
            {t('learning:learnerDashboard.overview.loading')}
          </span>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    );
  }

  const isEmpty =
    !data ||
    (data.continueLearning.length === 0 &&
      data.upcomingDeadlines.length === 0 &&
      data.recentResults.length === 0 &&
      data.announcements.length === 0);

  if (isEmpty) {
    return (
      <>
        {header}
        <LearnerSectionPlaceholder
          icon={LayoutDashboard}
          titleKey="learning:learnerDashboard.overview.empty.title"
          descriptionKey="learning:learnerDashboard.overview.empty.description"
        />
      </>
    );
  }

  return (
    <>
      {header}

      {/* Continue learning — the answer to the one question. */}
      {data.continueLearning.length > 0 ? (
        <section
          aria-labelledby="overview-continue-heading"
          className="space-y-3"
        >
          <h2
            id="overview-continue-heading"
            className="font-display text-base font-semibold text-foreground"
          >
            {t('learning:learnerDashboard.overview.continue.title')}
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            {data.continueLearning.map((item) => {
              const courseHref = buildHref(
                buildPath(LEARNER_ROUTES.courseProgress, {
                  courseId: item.courseId,
                })
              );
              const continueHref = item.nextItemId
                ? buildHref(
                    buildPath(LEARNER_ROUTES.playerLesson, {
                      courseId: item.courseId,
                      lessonId: item.nextItemId,
                    })
                  )
                : courseHref;

              return (
                <Card key={item.courseId}>
                  <CardContent className="flex items-center gap-4 pt-6">
                    <LearnerProgressRing
                      value={item.percentage}
                      label={t('learning:player.progress.label', {
                        course: item.courseTitle,
                      })}
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-sm font-semibold text-foreground">
                        <Link
                          to={courseHref}
                          className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {item.courseTitle}
                        </Link>
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.nextItemTitle
                          ? t(
                              'learning:learnerDashboard.overview.continue.nextIs',
                              { title: item.nextItemTitle }
                            )
                          : t('learning:progress.completedOf', {
                              completed: item.completedLessons,
                              total: item.totalLessons,
                            })}
                      </p>

                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => navigate(continueHref)}
                      >
                        <PlayCircle className="size-4" aria-hidden />
                        {t('learning:learnerDashboard.actions.continue')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* What is due. */}
      {data.upcomingDeadlines.length > 0 ? (
        <section
          aria-labelledby="overview-deadlines-heading"
          className="space-y-3"
        >
          <h2
            id="overview-deadlines-heading"
            className="font-display text-base font-semibold text-foreground"
          >
            {t('learning:learnerDashboard.overview.deadlines.title')}
          </h2>

          <ul className="space-y-2">
            {data.upcomingDeadlines.map((deadline) => (
              <li
                key={`${deadline.type}-${deadline.id}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <CalendarClock
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-foreground">
                    <Link
                      to={buildHref(
                        buildPath(LEARNER_ROUTES.playerActivity, {
                          courseId: deadline.courseId,
                          itemId: deadline.id,
                        })
                      )}
                      className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {deadline.title}
                    </Link>
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {deadline.courseTitle}
                  </p>
                </div>
                <div className="text-end">
                  <p className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmt.dateTime(deadline.dueAt)}
                  </p>
                  {deadline.overdue ? (
                    <Badge variant="destructive" className="mt-1">
                      {t('learning:player.itemState.overdue')}
                    </Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* What came back. */}
      {data.recentResults.length > 0 ? (
        <section
          aria-labelledby="overview-results-heading"
          className="space-y-3"
        >
          <h2
            id="overview-results-heading"
            className="font-display text-base font-semibold text-foreground"
          >
            {t('learning:learnerDashboard.overview.results.title')}
          </h2>

          <ul className="space-y-2">
            {data.recentResults.map((result) => (
              <li
                key={`${result.type}-${result.id}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <Trophy
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-foreground">
                    <Link
                      to={buildHref(
                        buildPath(LEARNER_ROUTES.playerActivity, {
                          courseId: result.courseId,
                          itemId: result.id,
                        })
                      )}
                      className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {result.title}
                    </Link>
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {result.courseTitle} ·{' '}
                    {learnerAssessmentStateLabel(result.status, t)}
                  </p>
                </div>
                {result.score !== null ? (
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                    {t('learning:learnerDashboard.assessments.score', {
                      score: result.score,
                    })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* What the academy is telling everyone. */}
      {data.announcements.length > 0 ? (
        <section
          aria-labelledby="overview-announcements-heading"
          className="space-y-3"
        >
          <h2
            id="overview-announcements-heading"
            className="font-display text-base font-semibold text-foreground"
          >
            {t('learning:learnerDashboard.overview.announcements.title')}
          </h2>

          <ul className="space-y-2">
            {data.announcements.map((announcement) => (
              <li
                key={announcement.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Megaphone className="size-4" aria-hidden />
                    {announcement.title}
                  </h3>
                  {announcement.publishedAt ? (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmt.date(announcement.publishedAt)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {announcement.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Certificates — a promise until Phase 3 issues any. */}
      <section
        aria-labelledby="overview-certificates-heading"
        className="rounded-lg border border-dashed border-border p-4"
      >
        <h2
          id="overview-certificates-heading"
          className="flex items-center gap-2 font-display text-sm font-semibold text-foreground"
        >
          <Award className="size-4" aria-hidden />
          {t('learning:learnerDashboard.nav.certificates')}
        </h2>
        {/*
          `available` is typed as the literal `false` in the Phase 2
          contract, so this renders the honest "not yet" and nothing else.
          Phase 3 widens the field, and the branch it needs is added then
          — writing a dead one now would be a branch nobody could test.
        */}
        <p className="mt-1 text-sm text-muted-foreground">
          {t('learning:learnerDashboard.overview.certificates.comingSoon')}
        </p>
      </section>
    </>
  );
}
