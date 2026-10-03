/**
 * Course Create Page.
 *
 * Guided course creation with form validation and a next-step prompt into
 * the Course Builder once the course exists. The form itself is
 * `CourseCreateForm`, shared with the New Customer Onboarding shell.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { CourseCreateForm } from '../components/CourseCreateForm';
import type { BreadcrumbItem, Course } from '@types';
import { cn, MIRROR_IN_RTL } from '@utils';
import { useResetScrollOnReveal } from '@hooks';

export default function CourseCreatePage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const [createdCourse, setCreatedCourse] = useState<Course | null>(null);
  // The form's submit sits at the bottom of a long page; the success card
  // replaces it in place, so without this the card renders above the
  // viewport and the user sees an empty page (Task 5).
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  useResetScrollOnReveal(!!createdCourse, successHeadingRef);

  const handleCancel = () => {
    if (academyId)
      navigate(buildPath(DASHBOARD_ROUTES.academyCourses, { academyId }));
  };

  if (createdCourse && academyId) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="course:create.title"
          descriptionKey="course:create.subtitle"
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-pill bg-success-surface text-success">
              <BookOpen className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="space-y-1.5">
              <h3
                ref={successHeadingRef}
                tabIndex={-1}
                className="font-display text-base font-semibold text-foreground focus:outline-none"
              >
                {t('course:create.success')}
              </h3>
              <p className="text-sm font-medium text-muted-foreground">
                {t('course:create.successNextStepTitle')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('course:create.successNextStepDescription')}
              </p>
            </div>
            <Button
              onClick={() =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.academyCourseBuilder, {
                    academyId,
                    courseId: createdCourse.id,
                  })
                )
              }
            >
              {t('course:create.continueToBuilder')}
              <ArrowRight
                className={cn('size-4', MIRROR_IN_RTL)}
                strokeWidth={2}
                aria-hidden
              />
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'course:list.title',
      path: buildPath(DASHBOARD_ROUTES.academyCourses, {
        academyId: academyId ?? '',
      }),
    },
    { labelKey: 'course:create.title' },
  ];

  return (
    <PageContainer>
      <PageHeader
        titleKey="course:create.title"
        descriptionKey="course:create.subtitle"
        breadcrumbs={breadcrumbs}
      />

      <CourseCreateForm
        academyId={academyId ?? ''}
        onCreated={setCreatedCourse}
        onCancel={handleCancel}
      />
    </PageContainer>
  );
}
