/**
 * Global Courses — Detail Page (P60).
 *
 * Read-only cross-tenant view of one course. Reuses the `course:` status,
 * visibility and pricing vocabulary and the existing `getCourse*Tone`
 * helpers verbatim, so a course reads the same here as it does inside its
 * own academy.
 *
 * THREE SEPARATE AUDIENCE NUMBERS, NOT ONE. Enrolled students, completed
 * students and paid orders are three existing facts from two existing
 * systems (`enrollments`, `course_orders`). They are shown side by side and
 * never added together or renamed into a single invented metric — a course
 * can have paid orders with nobody enrolled yet, and collapsing that would
 * hide the interesting case.
 */
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, GraduationCap, Receipt, CheckCircle2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDateFormatter } from '@hooks';
import { formatCurrency } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  getCourseStatusLabelKey,
  getCourseStatusTone,
  getCourseVisibilityLabelKey,
  getCourseVisibilityTone,
} from '@features/course';
import { usePlatformCourse } from '../hooks';
import type { LanguageCode } from '@types';

/** One labelled figure. `data-atlas-numeric` keeps digits LTR under RTL. */
function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold" data-atlas-numeric="true">
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function PlatformCourseDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const fmt = useDateFormatter();
  const { courseId } = useParams<{ courseId: string }>();

  const { data: course, isLoading, error, refetch } = usePlatformCourse(courseId ?? '');

  const backButton = (
    <Button asChild variant="ghost" size="sm">
      <Link to={DASHBOARD_ROUTES.platformCourses}>
        {/* `rtl:rotate-180` — a "back" arrow points the other way in Arabic. */}
        <ArrowLeft className="me-2 size-4 rtl:rotate-180" aria-hidden />
        {t('platform:courses.backToList')}
      </Link>
    </Button>
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !course) {
    return (
      <PageContainer>
        <PageHeader titleKey="platform:courses.detailTitle" actions={backButton} />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:courses.detailTitle"
        title={course.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              labelKey={getCourseStatusLabelKey(course.status)}
              tone={getCourseStatusTone(course.status)}
            />
            <StatusBadge
              labelKey={getCourseVisibilityLabelKey(course.visibility)}
              tone={getCourseVisibilityTone(course.visibility)}
            />
            {backButton}
          </div>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={GraduationCap}
            label={t('platform:courses.stats.enrolled')}
            value={course.enrolledStudents}
          />
          <StatTile
            icon={CheckCircle2}
            label={t('platform:courses.stats.completed')}
            value={course.completedStudents}
          />
          <StatTile
            icon={Receipt}
            label={t('platform:courses.stats.paidOrders')}
            value={course.paidOrders}
          />
          <StatTile
            icon={BookOpen}
            label={t('platform:courses.stats.curriculum')}
            // Two real i18next plural keys joined, not one interpolated
            // sentence: "1 lessons" is wrong in English and Arabic needs six
            // plural forms that a single `{{count}}` string cannot express.
            value={`${t('platform:courses.stats.sectionCount', {
              count: course.totalSections,
            })} · ${t('platform:courses.stats.lessonCount', {
              count: course.totalLessons,
            })}`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('platform:courses.ownership')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <DetailRow label={t('platform:courses.table.organization')}>
                  <Link
                    className="underline-offset-4 hover:underline"
                    to={buildPath(DASHBOARD_ROUTES.platformOrganizationDetail, {
                      organizationId: course.organizationId,
                    })}
                  >
                    {course.organizationName}
                  </Link>
                </DetailRow>
                <DetailRow label={t('platform:courses.table.academy')}>
                  <Link
                    className="underline-offset-4 hover:underline"
                    to={buildPath(DASHBOARD_ROUTES.platformAcademyDetail, {
                      academyId: course.academyId,
                    })}
                  >
                    {course.academyName}
                  </Link>
                </DetailRow>
                <DetailRow label={t('platform:courses.table.createdBy')}>
                  {course.createdBy ? (
                    <span className="flex flex-col items-end text-end">
                      <span>{course.createdBy.name}</span>
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {course.createdBy.email}
                      </span>
                    </span>
                  ) : (
                    // Honest, not a placeholder for a value we could look
                    // up: this course predates the creator column and no
                    // audit entry proves who made it.
                    <span className="text-muted-foreground">
                      {t('platform:courses.creatorUnknownLong')}
                    </span>
                  )}
                </DetailRow>
                <DetailRow label={t('platform:courses.table.createdAt')}>
                  {fmt.dateTime(course.createdAt)}
                </DetailRow>
                <DetailRow label={t('platform:courses.updatedAt')}>
                  {fmt.dateTime(course.updatedAt)}
                </DetailRow>
                {course.publishedAt ? (
                  <DetailRow label={t('platform:courses.publishedAt')}>
                    {fmt.dateTime(course.publishedAt)}
                  </DetailRow>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('platform:courses.catalog')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <DetailRow label={t('platform:courses.table.pricing')}>
                  {course.pricingType === 'paid' && course.pricingAmount !== undefined
                    ? formatCurrency(
                        course.pricingAmount,
                        language,
                        course.pricingCurrency ?? 'USD'
                      )
                    : t('course:pricing.free')}
                </DetailRow>
                <DetailRow label={t('platform:courses.category')}>
                  {course.categoryName ?? t('platform:courses.noCategory')}
                </DetailRow>
                <DetailRow label={t('platform:courses.slug')}>
                  <code className="text-xs" dir="ltr">
                    {course.slug}
                  </code>
                </DetailRow>
              </dl>

              {course.shortDescription || course.description ? (
                <p
                  className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground"
                  dir="auto"
                >
                  {course.shortDescription ?? course.description}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('platform:courses.instructors')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {course.instructors.length === 0 ? (
              <EmptyState
                titleKey="platform:courses.noInstructors"
                descriptionKey="platform:courses.noInstructorsDescription"
              />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {course.instructors.map((instructor) => (
                  <li
                    key={instructor.id}
                    className="rounded-md border border-border px-3 py-1.5 text-sm"
                  >
                    {instructor.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
