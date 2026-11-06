/**
 * Wizard step 5 — Assessments (W6/W7).
 *
 * Lists the course's quizzes and opens the SAME `QuizAuthoringForm` the
 * standalone quiz editor uses — in a wide side sheet, so the author never
 * leaves the wizard. A new quiz starts Published (a draft quiz is invisible
 * to learners, which is the commonest way to publish an "empty" course)
 * and goes into the unit chosen in the shared `UnitPickerField` (sent with
 * the create, which appends it at the end of the unit atomically).
 *
 * Assignments are created here too, with the SAME `AssignmentFormDialog`
 * and unit picker as the assignments page (`useSaveAssignment`: create,
 * then attach to the unit). Grading and submissions stay on that page,
 * linked from here.
 *
 * Closing the sheet with unsaved edits asks first (a sheet close is not a
 * navigation, so the route guard alone would not see it).
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { useDirtyGuard } from '@features/unsaved-changes';
import {
  useAssignmentsForAuthoring,
  useQuizForAuthoring,
  useQuizzesForAuthoring,
  type AssignmentAuthoringFormData,
} from '@features/learning';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { Assignment, CourseSection } from '@types';
import {
  sortUnits,
  useCourseSections,
  useSaveAssignment,
  useUnitPlacement,
} from '../hooks';
import { QuizAuthoringForm } from '../components/QuizAuthoringForm';
import type { RelatedLessonOption } from '../components/QuizQuestionsEditor';
import { AssignmentFormDialog } from '../components/AssignmentFormDialog';
import {
  UnitPickerField,
  UnitPlacementNote,
} from '../components/UnitPickerField';
import {
  getLessonStatusLabelKey,
  getLessonStatusTone,
} from '../utils/course-status.utils';
import { WizardStepFooter } from './WizardStepFooter';
import type { WizardStepProps } from './wizard-step.types';

type SheetState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly quizId: string }
  | null;

type AssignmentDialogState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly assignment: Assignment }
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
  const assignmentsQuery = useAssignmentsForAuthoring(course.id);
  const { data: sectionsData } = useCourseSections(academyId, course.id);
  const sections = sortUnits(sectionsData?.items);
  const sectionTitle = (id?: string | null) =>
    sections.find((section) => section.id === id)?.title;
  const unitLine = (id?: string | null) => {
    const unit = sectionTitle(id);
    return unit
      ? t('course:unitPlacement.inUnit', { unit })
      : t('course:unitPlacement.notPlaced');
  };

  const [assignmentDialog, setAssignmentDialog] =
    useState<AssignmentDialogState>(null);
  const assignmentPlacement = useUnitPlacement(academyId, course.id);
  const saveAssignment = useSaveAssignment(academyId, course.id);
  const openCreateAssignment = () => {
    assignmentPlacement.reset();
    setAssignmentDialog({ mode: 'create' });
  };
  const handleAssignmentSubmit = async (data: AssignmentAuthoringFormData) => {
    try {
      if (assignmentDialog?.mode === 'edit') {
        await saveAssignment.update(assignmentDialog.assignment.id, data);
      } else {
        await saveAssignment.create(data, assignmentPlacement.section);
      }
      setAssignmentDialog(null);
    } catch {
      // Shown once, inside the dialog (on its field or one alert).
    }
  };
  const assignments = assignmentsQuery.data?.items ?? [];
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
                      <span>{unitLine(quiz.sectionId)}</span>
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

      <section aria-labelledby="wizard-assignments-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h3
              id="wizard-assignments-title"
              className="font-display text-base font-semibold text-foreground"
            >
              {t('course:wizard.assessments.assignmentsTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('course:wizard.assessments.assignmentsDescription')}
            </p>
          </div>
          <Button type="button" onClick={openCreateAssignment}>
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('course:wizard.assessments.createAssignment')}
          </Button>
        </div>

        {assignmentsQuery.isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : assignmentsQuery.error ? (
          <ErrorState onRetry={() => assignmentsQuery.refetch()} />
        ) : assignments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t('course:wizard.assessments.assignmentsEmpty')}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {assignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                    <FileText
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="truncate">{assignment.title}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge
                      labelKey={getLessonStatusLabelKey(assignment.status)}
                      tone={getLessonStatusTone(assignment.status)}
                    />
                    <span>{unitLine(assignment.sectionId)}</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start sm:self-auto"
                  aria-label={t('course:wizard.assessments.editAssignment', {
                    title: assignment.title,
                  })}
                  onClick={() =>
                    setAssignmentDialog({ mode: 'edit', assignment })
                  }
                >
                  <Pencil className="size-4" strokeWidth={2} aria-hidden />
                  {t('course:wizard.assessments.edit')}
                </Button>
              </li>
            ))}
          </ul>
        )}

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
                lessons={lessons}
                onDirtyChange={setSheetDirty}
                onDone={closeSheet}
                onCancel={requestClose}
              />
            ) : sheet?.mode === 'edit' ? (
              <EditQuizInSheet
                courseId={course.id}
                quizId={sheet.quizId}
                sections={sections}
                lessons={lessons}
                onDirtyChange={setSheetDirty}
                onDone={closeSheet}
                onCancel={requestClose}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <AssignmentFormDialog
        open={assignmentDialog !== null}
        onOpenChange={(open) => !open && setAssignmentDialog(null)}
        mode={assignmentDialog?.mode ?? 'create'}
        assignment={
          assignmentDialog?.mode === 'edit' ? assignmentDialog.assignment : null
        }
        isPending={saveAssignment.isPending}
        onSubmit={handleAssignmentSubmit}
        error={
          assignmentDialog?.mode === 'edit'
            ? saveAssignment.updateError
            : saveAssignment.createError
        }
        unitField={
          assignmentDialog?.mode === 'edit' ? (
            <UnitPlacementNote
              sections={sections}
              sectionId={assignmentDialog.assignment.sectionId}
            />
          ) : (
            <UnitPickerField
              sections={assignmentPlacement.sections}
              value={assignmentPlacement.value}
              onChange={assignmentPlacement.setValue}
              itemType="assignment"
              disabled={saveAssignment.isPending}
            />
          )
        }
      />
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
  lessons,
  onDirtyChange,
  onDone,
  onCancel,
}: SheetBodyProps & {
  readonly academyId: string;
  readonly courseId: string;
}): JSX.Element {
  // Mounted each time the sheet opens: a fresh default (the first unit).
  const placement = useUnitPlacement(academyId, courseId);
  return (
    <QuizAuthoringForm
      courseId={courseId}
      lessons={lessons}
      defaultStatus="published"
      autoFocusTitle={false}
      onDirtyChange={onDirtyChange}
      onSaved={onDone}
      onCancel={onCancel}
      createPlacement={
        placement.section
          ? {
              sectionId: placement.section.id,
              unitTitle: placement.section.title,
            }
          : null
      }
      beforeActions={
        <UnitPickerField
          sections={placement.sections}
          value={placement.value}
          onChange={placement.setValue}
          itemType="quiz"
        />
      }
    />
  );
}

function EditQuizInSheet({
  courseId,
  quizId,
  sections,
  lessons,
  onDirtyChange,
  onDone,
  onCancel,
}: SheetBodyProps & {
  readonly courseId: string;
  readonly quizId: string;
  readonly sections: readonly CourseSection[];
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
      beforeActions={
        <UnitPlacementNote sections={sections} sectionId={quiz.sectionId} />
      }
    />
  );
}
