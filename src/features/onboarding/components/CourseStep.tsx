/**
 * Setup — First course (recommended; Skip allowed).
 *
 * The SAME form as `CourseCreatePage` (`CourseCreateForm`) creates a draft
 * course; afterwards the owner can open it in the course builder or carry
 * on with setup. The step completes when the server counts a course.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { CourseCreateForm } from '@features/course';
import type { Course } from '@types';
import { useResetScrollOnReveal } from '@hooks';
import { OnboardingStepFrame } from './OnboardingStepFrame';
import { StepPanel } from './StepPanel';
import { findStep } from '../utils/onboarding-status.utils';
import { BlockedNotice } from './BlockedNotice';
import type { OnboardingStepProps } from './step.types';

export function CourseStep({
  status,
  eyebrow,
  onBack,
  onNext,
  goTo,
  refresh,
}: OnboardingStepProps): JSX.Element {
  const { t } = useTranslation();
  const step = findStep(status, 'course');
  const academy = status.academy;
  const [createdCourse, setCreatedCourse] = useState<Course | null>(null);
  // The success panel replaces the long form in place (Task 5).
  useResetScrollOnReveal(!!createdCourse);
  const isBlocked = step?.status === 'blocked' || !academy;
  const isComplete = step?.status === 'complete' || !!createdCourse;

  const renderBody = (): JSX.Element => {
    if (isBlocked || !academy) {
      return <BlockedNotice waitingOn="academy" goTo={goTo} />;
    }
    if (createdCourse) {
      return (
        <StepPanel
          icon={BookOpen}
          tone="success"
          title={t('onboarding:course.createdTitle')}
          description={t('onboarding:course.createdDescription')}
          testId="course-created"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link
                to={buildPath(DASHBOARD_ROUTES.academyCourseBuilder, {
                  academyId: academy.id,
                  courseId: createdCourse.id,
                })}
              >
                {t('onboarding:course.openBuilder')}
              </Link>
            </Button>
          }
        />
      );
    }
    if (step?.status === 'complete') {
      return (
        <StepPanel
          icon={BookOpen}
          tone="success"
          title={t('onboarding:course.alreadyTitle')}
          description={t('onboarding:course.alreadyDescription')}
          testId="course-exists"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link
                to={buildPath(DASHBOARD_ROUTES.academyCourses, {
                  academyId: academy.id,
                })}
              >
                {t('onboarding:course.viewCourses')}
              </Link>
            </Button>
          }
        />
      );
    }
    return (
      <CourseCreateForm
        academyId={academy.id}
        onCreated={(course) => {
          setCreatedCourse(course);
          void refresh();
        }}
      />
    );
  };

  return (
    <OnboardingStepFrame
      stepKey="course"
      eyebrow={eyebrow}
      title={t('onboarding:steps.course.title')}
      description={t('onboarding:steps.course.description')}
      onBack={onBack}
      onSkip={isComplete ? undefined : onNext}
      onContinue={isComplete ? onNext : undefined}
      continueIsPrimary={isComplete}
    >
      {renderBody()}
    </OnboardingStepFrame>
  );
}
