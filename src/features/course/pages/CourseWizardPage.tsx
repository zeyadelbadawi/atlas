/**
 * Course Wizard Page (W6) — guided course creation, Create → Publish.
 *
 * Two addresses render it:
 *   - `…/courses/create` — CREATE mode: only Basics is available; it
 *     creates the draft (idempotently) and REPLACES the URL with
 *   - `…/courses/:courseId/setup?step=<step>` — SETUP mode: every step.
 *
 * THE STEP LIVES IN THE URL, so refresh, a shared link and "Continue
 * setup" (no `step` → the first incomplete step) all land correctly.
 * Each form step saves only its changed fields when the author continues;
 * Curriculum and Assessments save per action. The stepper's completion
 * marks are derived from the saved course and the server's readiness
 * verdict, never from "visited".
 *
 * UNSAVED WORK. A step form registers with the unsaved-changes registry, so
 * leaving the wizard (another page, refresh, tab close) is guarded by the
 * app-wide dialog/`beforeunload`. Moving between steps is not a route
 * change, so `goToStep` asks itself before discarding edits. Step changes
 * REPLACE the history entry: the browser's Back leaves the wizard through
 * the guarded path instead of silently dropping a dirty step.
 *
 * Audience: academy owners and managers (`course.update`, plus the
 * server's own `assertCanManage`). Instructors keep the classic builder.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useConfirmDialog } from '@app/providers';
import { useUnsavedChangesRegistry } from '@features/unsaved-changes';
import { courseKeys } from '@services/query';
import type { BreadcrumbItem, Course } from '@types';
import { useCourse, usePublishReadiness } from '../hooks';
import {
  COURSE_WIZARD_STEPS,
  deriveCourseWizardStepStates,
  firstIncompleteCourseWizardStep,
  nextCourseWizardStep,
  parseCourseWizardStep,
  previousCourseWizardStep,
  stepIndex,
  type CourseWizardStep,
} from '../wizard/course-wizard.steps';
import { CourseWizardStepper } from '../wizard/CourseWizardStepper';
import { BasicsStep } from '../wizard/BasicsStep';
import { DetailsStep } from '../wizard/DetailsStep';
import { MediaStep } from '../wizard/MediaStep';
import { CurriculumStep } from '../wizard/CurriculumStep';
import { AssessmentsStep } from '../wizard/AssessmentsStep';
import { PricingStep } from '../wizard/PricingStep';
import { ReviewStep } from '../wizard/ReviewStep';
import { PublishStep } from '../wizard/PublishStep';
import type { WizardStepProps } from '../wizard/wizard-step.types';

const LOCKED_BEFORE_CREATE: readonly CourseWizardStep[] =
  COURSE_WIZARD_STEPS.filter((step) => step !== 'basics');

/** Resolved at render time (not a module-scope table) so an import cycle can never capture an undefined step. */
function stepComponent(
  step: Exclude<CourseWizardStep, 'basics'>
): (props: WizardStepProps) => JSX.Element {
  switch (step) {
    case 'details':
      return DetailsStep;
    case 'media':
      return MediaStep;
    case 'curriculum':
      return CurriculumStep;
    case 'assessments':
      return AssessmentsStep;
    case 'pricing':
      return PricingStep;
    case 'review':
      return ReviewStep;
    case 'publish':
      return PublishStep;
  }
}

export default function CourseWizardPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const registry = useUnsavedChangesRegistry();
  const { academyId = '', courseId } = useParams<{
    academyId: string;
    courseId?: string;
  }>();
  const isCreate = !courseId;
  const [searchParams, setSearchParams] = useSearchParams();

  const courseQuery = useCourse(academyId, courseId ?? '', {
    enabled: !isCreate,
  });
  const readinessQuery = usePublishReadiness(academyId, courseId ?? '', {
    enabled: !isCreate,
  });
  const course = courseQuery.data;
  const readiness = readinessQuery.data;
  const states = deriveCourseWizardStepStates(course, readiness);

  const requested = parseCourseWizardStep(searchParams.get('step'));
  const readinessSettled = !!readiness || readinessQuery.isError;
  const step: CourseWizardStep | null = isCreate
    ? 'basics'
    : (requested ??
      (course && readinessSettled
        ? firstIncompleteCourseWizardStep(states)
        : null));

  const writeStep = useCallback(
    (next: CourseWizardStep) =>
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          params.set('step', next);
          return params;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  // No (or an unknown) `step`: resume at the first incomplete step once the
  // data that decides it has arrived, and put it in the URL.
  useEffect(() => {
    if (!isCreate && !requested && step) writeStep(step);
  }, [isCreate, requested, step, writeStep]);

  const goToStep = useCallback(
    async (next: CourseWizardStep) => {
      if (registry?.isDirtyNow()) {
        const discard = await confirm({
          titleKey: 'common:unsavedChanges.title',
          descriptionKey: 'common:unsavedChanges.description',
          confirmLabelKey: 'common:unsavedChanges.leave',
          cancelLabelKey: 'common:unsavedChanges.stay',
          intent: 'destructive',
        });
        if (!discard) return;
      }
      writeStep(next);
    },
    [registry, confirm, writeStep]
  );

  // A new step (or arriving from Create) starts at the top with focus on
  // its heading, so keyboard and screen-reader users know where they are.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<CourseWizardStep | null>(null);
  const arrivedFromCreate =
    (location.state as { created?: boolean } | null)?.created === true;
  useEffect(() => {
    if (!step) return;
    const changed =
      previousStep.current !== null && previousStep.current !== step;
    const firstAfterCreate = previousStep.current === null && arrivedFromCreate;
    previousStep.current = step;
    if (!changed && !firstAfterCreate) return;
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, arrivedFromCreate]);

  const coursesPath = buildPath(DASHBOARD_ROUTES.academyCourses, { academyId });

  const handleCreated = (created: Course) => {
    queryClient.setQueryData(courseKeys.detail(academyId, created.id), created);
    navigate(
      `${buildPath(DASHBOARD_ROUTES.academyCourseWizard, {
        academyId,
        courseId: created.id,
      })}?step=details`,
      { replace: true, state: { created: true } }
    );
  };

  const breadcrumbs: readonly BreadcrumbItem[] = [
    { labelKey: 'course:list.title', path: coursesPath },
    ...(course
      ? [
          {
            labelKey: 'course:wizard.title',
            label: course.title,
            path: buildPath(DASHBOARD_ROUTES.academyCourseDetail, {
              academyId,
              courseId: course.id,
            }),
          } satisfies BreadcrumbItem,
        ]
      : []),
    {
      labelKey: isCreate ? 'course:wizard.createTitle' : 'course:wizard.title',
    },
  ];

  const header = (
    <PageHeader
      titleKey={isCreate ? 'course:wizard.createTitle' : 'course:wizard.title'}
      descriptionKey="course:wizard.subtitle"
      breadcrumbs={breadcrumbs}
    />
  );

  if (!isCreate && courseQuery.error) {
    return (
      <PageContainer>
        {header}
        <ErrorState onRetry={() => courseQuery.refetch()} />
      </PageContainer>
    );
  }

  if (!step || (!isCreate && !course)) {
    return (
      <PageContainer>
        {header}
        <div
          className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
          aria-busy
        >
          <Skeleton className="h-12 w-full lg:h-80" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  const index = stepIndex(step);
  const previous = previousCourseWizardStep(step);
  const next = nextCourseWizardStep(step);

  let body: JSX.Element;
  if (step === 'basics') {
    body = (
      <BasicsStep
        // The form is seeded once per course; a new course is a new form.
        key={course?.id ?? 'new'}
        academyId={academyId}
        course={course}
        onCreated={handleCreated}
        onCancel={() => navigate(coursesPath)}
        onNext={() => void goToStep('details')}
      />
    );
  } else {
    const StepComponent = stepComponent(step);
    body = (
      <StepComponent
        academyId={academyId}
        course={course!}
        readiness={readiness}
        readinessLoading={readinessQuery.isFetching}
        readinessError={readinessQuery.isError}
        onRetryReadiness={() => void readinessQuery.refetch()}
        onBack={previous ? () => void goToStep(previous) : undefined}
        onNext={() => {
          if (next) void goToStep(next);
        }}
        goToStep={(target) => void goToStep(target)}
      />
    );
  }

  return (
    <PageContainer>
      {header}
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CourseWizardStepper
            current={step}
            states={states}
            lockedSteps={isCreate ? LOCKED_BEFORE_CREATE : []}
            onSelect={(target) => void goToStep(target)}
          />
        </aside>
        <Card className="min-w-0">
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('course:wizard.stepOf', {
                current: index + 1,
                total: COURSE_WIZARD_STEPS.length,
              })}
            </p>
            <h2
              ref={headingRef}
              tabIndex={-1}
              data-testid="wizard-step-heading"
              className="font-display text-lg font-semibold text-foreground focus:outline-none"
            >
              {t(`course:wizard.steps.${step}.title`)}
            </h2>
            <CardDescription>
              {t(`course:wizard.steps.${step}.description`)}
            </CardDescription>
          </CardHeader>
          <CardContent>{body}</CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
