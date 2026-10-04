/**
 * Wizard step 5 — Assessments (W6/W7).
 *
 * Lists the course's quizzes and opens the SAME `QuizAuthoringForm` the
 * standalone quiz editor uses — in a wide side sheet, so the author never
 * leaves the wizard. A new quiz starts Published (a draft quiz is invisible
 * to learners, which is the commonest way to publish an "empty" course)
 * and can be placed in a unit right away: it is created at course level
 * and then ATTACHED through the unit-curriculum endpoint, which appends it
 * at the end of the unit under the unit's row lock.
 *
 * Closing the sheet with unsaved edits asks first (a sheet close is not a
 * navigation, so the route guard alone would not see it). Assignments keep
 * their own page, linked from here.
 */
import { useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ClipboardList, ExternalLink, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { toast } from '@/hooks/use-toast';
import { useDirtyGuard } from '@features/unsaved-changes';
import {
  useQuizForAuthoring,
  useQuizzesForAuthoring,
} from '@features/learning';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { CourseSection, QuizAuthoring } from '@types';
import { useAttachUnitItem, useCourseSections } from '../hooks';
import { QuizAuthoringForm } from '../components/QuizAuthoringForm';
import type { RelatedLessonOption } from '../components/QuizQuestionsEditor';
import { WizardStepFooter } from './WizardStepFooter';
import type { WizardStepProps } from './wizard-step.types';

/** Radix `Select` rejects an empty item value. */
const NO_UNIT = '__none__';

type SheetState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly quizId: string }
  | null;

export function AssessmentsStep({
  academyId,
  course,
  onBack,
  onNext,
}: WizardStepProps): JSX.Element {
  const { t } = useTranslation();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [sheetDirty, setSheetDirty] = useState(false);
  const guard = useDirtyGuard(sheetDirty);

  const quizzesQuery = useQuizzesForAuthoring(course.id);
  const { data: sectionsData } = useCourseSections(academyId, course.id);
  const sections: readonly CourseSection[] = [
    ...(sectionsData?.items ?? []),
  ].sort((a, b) => a.order - b.order);
  const sectionTitle = (id?: string | null) =>
    sections.find((section) => section.id === id)?.title;
  const lessons: readonly RelatedLessonOption[] = sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      sectionTitle: section.title,
    }))
  );

  const closeSheet = useCallback(() => {
    setSheet(null);
    setSheetDirty(false);
  }, []);
  const requestClose = () => void guard.requestClose(closeSheet);

  const quizzes = quizzesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <section aria-labelledby="wizard-quizzes-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3
            id="wizard-quizzes-title"
            className="font-display text-base font-semibold text-foreground"
          >
            {t('course:wizard.assessments.quizzesTitle')}
          </h3>
          <Button type="button" onClick={() => setSheet({ mode: 'create' })}>
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('course:wizard.assessments.createQuiz')}
          </Button>
        </div>

        {quizzesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : quizzesQuery.error ? (
          <ErrorState onRetry={() => quizzesQuery.refetch()} />
        ) : quizzes.length === 0 ? (
          <EmptyState
            titleKey="course:wizard.assessments.emptyTitle"
            descriptionKey="course:wizard.assessments.emptyDescription"
            icon={ClipboardList}
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {quizzes.map((quiz) => {
              const unit = sectionTitle(quiz.sectionId);
              return (
                <li
                  key={quiz.id}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium text-foreground">
                      {quiz.title}
                    </p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge
                        labelKey={`course:lessonStatus.${quiz.status}`}
                        tone={
                          quiz.status === 'published' ? 'success' : 'neutral'
                        }
                      />
                      <span>
                        {t('course:quizAuthoring.questionCount', {
                          count: quiz.questionCount,
                        })}
                      </span>
                      <span aria-hidden>·</span>
                      <span>
                        {unit
                          ? t('course:wizard.assessments.inUnit', { unit })
                          : t('course:wizard.assessments.notPlaced')}
                      </span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start sm:self-auto"
                    aria-label={t('course:wizard.assessments.editQuiz', {
                      title: quiz.title,
                    })}
                    onClick={() => setSheet({ mode: 'edit', quizId: quiz.id })}
                  >
                    <Pencil className="size-4" strokeWidth={2} aria-hidden />
                    {t('course:wizard.assessments.edit')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="wizard-assignments-title"
        className="space-y-2 rounded-lg border border-border p-4"
      >
        <h3
          id="wizard-assignments-title"
          className="font-display text-base font-semibold text-foreground"
        >
          {t('course:wizard.assessments.assignmentsTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('course:wizard.assessments.assignmentsDescription')}
        </p>
        <Button asChild variant="link" className="h-auto p-0">
          <Link
            to={buildPath(DASHBOARD_ROUTES.academyCourseAssignments, {
              academyId,
              courseId: course.id,
            })}
          >
            {t('course:wizard.assessments.manageAssignments')}
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        </Button>
      </section>

      <WizardStepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel={t('course:wizard.continue')}
      />

      <Sheet
        open={sheet !== null}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-3xl">
          <SheetHeader className="space-y-1 border-b border-border p-6 text-start">
            <SheetTitle>
              {sheet?.mode === 'edit'
                ? t('course:wizard.assessments.sheetEditTitle')
                : t('course:wizard.assessments.sheetCreateTitle')}
            </SheetTitle>
            <SheetDescription>
              {t('course:wizard.assessments.sheetDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 sm:p-6">
            {sheet?.mode === 'create' ? (
              <CreateQuizInSheet
                academyId={academyId}
                courseId={course.id}
                sections={sections}
                lessons={lessons}
                onDirtyChange={setSheetDirty}
                onDone={closeSheet}
                onCancel={requestClose}
              />
            ) : sheet?.mode === 'edit' ? (
              <EditQuizInSheet
                courseId={course.id}
                quizId={sheet.quizId}
                lessons={lessons}
                onDirtyChange={setSheetDirty}
                onDone={closeSheet}
                onCancel={requestClose}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface SheetBodyProps {
  readonly lessons: readonly RelatedLessonOption[];
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly onDone: () => void;
  readonly onCancel: () => void;
}

function CreateQuizInSheet({
  academyId,
  courseId,
  sections,
  lessons,
  onDirtyChange,
  onDone,
  onCancel,
}: SheetBodyProps & {
  readonly academyId: string;
  readonly courseId: string;
  readonly sections: readonly CourseSection[];
}): JSX.Element {
  const { t } = useTranslation();
  const unitFieldId = useId();
  const [unitId, setUnitId] = useState<string>(sections[0]?.id ?? NO_UNIT);
  const attach = useAttachUnitItem(academyId, courseId);

  const handleSaved = async (quiz: QuizAuthoring) => {
    const unit = sections.find((section) => section.id === unitId);
    if (unit) {
      try {
        await attach.mutateAsync({
          sectionId: unit.id,
          type: 'quiz',
          itemId: quiz.id,
        });
        toast({
          title: t('course:wizard.assessments.attached', { unit: unit.title }),
        });
      } catch {
        toast({
          title: t('course:wizard.assessments.attachError'),
          variant: 'destructive',
        });
      }
    }
    onDone();
  };

  return (
    <QuizAuthoringForm
      courseId={courseId}
      lessons={lessons}
      defaultStatus="published"
      autoFocusTitle={false}
      onDirtyChange={onDirtyChange}
      onSaved={(quiz) => void handleSaved(quiz)}
      onCancel={onCancel}
      beforeActions={
        sections.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-border p-4 sm:max-w-sm">
            <Label htmlFor={unitFieldId}>
              {t('course:wizard.assessments.unitLabel')}
            </Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger id={unitFieldId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                ))}
                <SelectItem value={NO_UNIT}>
                  {t('course:wizard.assessments.unitNone')}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('course:wizard.assessments.unitHelp')}
            </p>
          </div>
        ) : null
      }
    />
  );
}

function EditQuizInSheet({
  courseId,
  quizId,
  lessons,
  onDirtyChange,
  onDone,
  onCancel,
}: SheetBodyProps & {
  readonly courseId: string;
  readonly quizId: string;
}): JSX.Element {
  const {
    data: quiz,
    isLoading,
    error,
    refetch,
  } = useQuizForAuthoring(courseId, quizId);
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !quiz) return <ErrorState onRetry={() => refetch()} />;
  return (
    <QuizAuthoringForm
      key={quiz.id}
      courseId={courseId}
      quiz={quiz}
      lessons={lessons}
      autoFocusTitle={false}
      onDirtyChange={onDirtyChange}
      onSaved={onDone}
      onCancel={onCancel}
    />
  );
}
