/**
 * Course Settings Page.
 *
 * Course-level lifecycle management: status/visibility summary, the
 * publish/unpublish workflow, and course deletion. Identity fields (title,
 * descriptions, thumbnail, category, pricing) are edited on the Course Edit
 * page — this page owns lifecycle, not content, the same way Academy
 * Settings stays separate from Academy Profile.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  useCourse,
  useCourseSections,
  useDeleteCourse,
  usePublishCourse,
  useUnpublishCourse,
} from '../hooks';
import {
  getCourseStatusLabelKey,
  getCourseStatusTone,
  getCourseVisibilityLabelKey,
  getCourseVisibilityTone,
} from '../utils/course-status.utils';

export default function CourseSettingsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId, courseId } = useParams<{
    academyId: string;
    courseId: string;
  }>();
  const { confirm } = useConfirmDialog();
  const [justPublished, setJustPublished] = useState(false);

  const {
    data: course,
    isLoading,
    error: loadError,
    refetch,
  } = useCourse(academyId ?? '', courseId ?? '');
  const { data: sectionsData } = useCourseSections(
    academyId ?? '',
    courseId ?? ''
  );

  const { mutateAsync: publishCourse, isPending: isPublishing } =
    usePublishCourse(academyId ?? '');
  const { mutateAsync: unpublishCourse, isPending: isUnpublishing } =
    useUnpublishCourse(academyId ?? '');
  const { mutateAsync: deleteCourse, isPending: isDeleting } = useDeleteCourse(
    academyId ?? ''
  );

  const sections = sectionsData?.items ?? [];
  const totalSections = sections.length;
  const totalLessons = sections.reduce(
    (sum, section) => sum + section.lessons.length,
    0
  );
  const hasCurriculum = totalLessons > 0;

  const handlePublish = async () => {
    if (!courseId) return;
    const confirmed = await confirm({
      titleKey: 'course:settings.publishDialog.title',
      descriptionKey: hasCurriculum
        ? 'course:settings.publishDialog.descriptionWithCurriculum'
        : 'course:settings.publishDialog.descriptionNoCurriculum',
      confirmLabelKey: 'course:settings.publishDialog.confirmLabel',
      cancelLabelKey: 'course:settings.publishDialog.cancelLabel',
      intent: 'default',
    });
    if (!confirmed) return;

    try {
      await publishCourse(courseId);
      toast({ title: t('course:settings.publishSuccess') });
      setJustPublished(true);
    } catch {
      toast({
        title: t('course:settings.publishError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleUnpublish = async () => {
    if (!courseId) return;
    const confirmed = await confirm({
      titleKey: 'course:settings.unpublishDialog.title',
      descriptionKey: 'course:settings.unpublishDialog.description',
      confirmLabelKey: 'course:settings.unpublishDialog.confirmLabel',
      cancelLabelKey: 'course:settings.unpublishDialog.cancelLabel',
      intent: 'default',
    });
    if (!confirmed) return;

    try {
      await unpublishCourse(courseId);
      toast({ title: t('course:settings.unpublishSuccess') });
      setJustPublished(false);
    } catch {
      toast({
        title: t('course:settings.unpublishError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!courseId || !academyId || !course) return;
    const confirmed = await confirm({
      titleKey: 'course:settings.deleteCourseConfirm.title',
      descriptionKey: 'course:settings.deleteCourseConfirm.description',
      confirmLabelKey: 'course:settings.deleteCourseConfirm.confirmLabel',
      cancelLabelKey: 'course:settings.deleteCourseConfirm.cancelLabel',
      values: { title: course.title },
      intent: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteCourse(courseId);
      toast({ title: t('course:settings.deleteCourseSuccess') });
      navigate(buildPath(DASHBOARD_ROUTES.academyCourses, { academyId }));
    } catch {
      toast({
        title: t('course:settings.deleteCourseError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (loadError || !course) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="course:settings.title"
          descriptionKey="course:settings.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        titleKey="course:settings.title"
        descriptionKey="course:settings.subtitle"
      />

      <div className="space-y-6">
        {justPublished && (
          <Card className="border-success/30 bg-success-surface">
            <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="size-4 shrink-0 text-success"
                  aria-hidden
                />
                <p className="text-sm text-foreground">
                  {t('course:settings.publishSuccessNextStepDescription')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  academyId &&
                  navigate(
                    `${DASHBOARD_ROUTES.academy}?academyId=${academyId}`
                  )
                }
              >
                {t('course:settings.backToAcademy')}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('course:settings.general')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('course:settings.currentStatus')}
              </p>
              <StatusBadge
                labelKey={getCourseStatusLabelKey(course.status)}
                tone={getCourseStatusTone(course.status)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('course:settings.currentVisibility')}
              </p>
              <StatusBadge
                labelKey={getCourseVisibilityLabelKey(course.visibility)}
                tone={getCourseVisibilityTone(course.visibility)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('course:builder.title')}
              </p>
              <p className="text-sm font-medium text-foreground">
                {t('course:settings.curriculumSummary', {
                  sections: totalSections,
                  lessons: totalLessons,
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('course:settings.publishing')}</CardTitle>
          </CardHeader>
          <CardContent>
            {course.status === 'published' ? (
              <Button
                variant="outline"
                onClick={handleUnpublish}
                disabled={isUnpublishing}
              >
                {isUnpublishing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('course:settings.unpublishAction')}
              </Button>
            ) : (
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('course:settings.publishAction')}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t('course:settings.dangerZone')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('course:settings.deleteCourse')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
