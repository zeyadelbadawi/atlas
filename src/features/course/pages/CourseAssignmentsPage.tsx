/**
 * Course Assignments Page (Phase 4).
 *
 * Lists every assignment belonging to a course (draft + published) for an
 * authoring user, with create/edit/delete. Grading happens elsewhere (the
 * Instructor experience); this page only ever authors the assignment
 * itself.
 *
 * A new assignment is placed in the unit chosen in the dialog
 * (`UnitPickerField`; the unit in `?sectionId=` when the page was opened
 * from one, else the first) — see `useSaveAssignment`. Each row says which
 * unit its assignment is in.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useActionFailureToast, useDateFormatter } from '@hooks';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileCheck2, MoreHorizontal, Plus } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionTabs } from '@components/navigation';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import {
  useAssignmentsForAuthoring,
  useDeleteAssignment,
  type AssignmentAuthoringFormData,
} from '@features/learning';
import { useCourse, useSaveAssignment, useUnitPlacement } from '../hooks';
import { AssignmentFormDialog } from '../components/AssignmentFormDialog';
import {
  UnitPickerField,
  UnitPlacementNote,
} from '../components/UnitPickerField';
import {
  getLessonStatusLabelKey,
  getLessonStatusTone,
} from '../utils/course-status.utils';
import {
  useCourseEditorLeadCrumbs,
  useCourseEditorTabs,
} from '../hooks/useCourseEditorTabs';
import type { Assignment } from '@types';

type DialogState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly assignment: Assignment }
  | null;

export default function CourseAssignmentsPage(): JSX.Element {
  const fmt = useDateFormatter();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId, courseId } = useParams<{
    academyId: string;
    courseId: string;
  }>();
  const editorTabs = useCourseEditorTabs(academyId ?? '', courseId ?? '');
  const { confirm } = useConfirmDialog();
  const failureToast = useActionFailureToast();

  const [dialog, setDialog] = useState<DialogState>(null);

  const { data: course } = useCourse(academyId ?? '', courseId ?? '');

  const leadCrumbs = useCourseEditorLeadCrumbs(
    academyId ?? '',
    courseId ?? '',
    course?.title,
    'course:assignmentAuthoring.title'
  );
  const breadcrumbs: readonly BreadcrumbItem[] = [
    ...leadCrumbs,
    { labelKey: 'course:assignmentAuthoring.title' },
  ];

  const {
    data: assignmentsData,
    isLoading,
    error,
    refetch,
  } = useAssignmentsForAuthoring(courseId ?? '');
  const assignments = assignmentsData?.items ?? [];

  const [searchParams] = useSearchParams();
  const placement = useUnitPlacement(academyId ?? '', courseId ?? '', {
    preferredSectionId: searchParams.get('sectionId'),
  });
  const save = useSaveAssignment(academyId ?? '', courseId ?? '');
  const deleteAssignment = useDeleteAssignment(courseId ?? '');

  const openCreate = () => {
    placement.reset();
    setDialog({ mode: 'create' });
  };

  const handleSubmit = async (data: AssignmentAuthoringFormData) => {
    try {
      if (dialog?.mode === 'edit') {
        await save.update(dialog.assignment.id, data);
      } else {
        await save.create(data, placement.section);
      }
      setDialog(null);
    } catch {
      // B3 (V05) — shown once, inside the dialog: on its field or in one
      // alert with the real reason.
    }
  };

  /*
    P64 Phase 1 — the way an Owner/Manager reaches an assignment's
    SUBMISSIONS (and from there, grading). Same reasoning as the quiz
    attempts link on `CourseQuizzesPage`: `assertCanReviewCourse` admits
    the academy's owner and managers, the review pages already existed,
    and the route guard's `instructor.submission.view` is already carried
    by both `ORGANIZATION_OWNER_PERMISSIONS` and
    `ORGANIZATION_MANAGER_PERMISSIONS` — no permission constant needed
    widening, only a door.
  */
  const goToSubmissions = (assignmentId: string) => {
    if (!courseId) return;
    navigate(
      buildPath(DASHBOARD_ROUTES.instructorSubmissions, {
        courseId,
        assignmentId,
      })
    );
  };

  const unitLabel = (sectionId?: string) => {
    const unit = sectionId
      ? placement.sections.find((section) => section.id === sectionId)
      : undefined;
    if (sectionId && !unit) return null; // units still loading
    return unit
      ? t('course:unitPlacement.inUnit', { unit: unit.title })
      : t('course:unitPlacement.notPlaced');
  };

  const handleDelete = async (assignment: Assignment) => {
    const confirmed = await confirm({
      titleKey: 'course:assignmentAuthoring.deleteConfirm.title',
      descriptionKey: 'course:assignmentAuthoring.deleteConfirm.description',
      confirmLabelKey: 'course:assignmentAuthoring.deleteConfirm.confirmLabel',
      cancelLabelKey: 'course:assignmentAuthoring.deleteConfirm.cancelLabel',
      values: { title: assignment.title },
      intent: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteAssignment.mutateAsync(assignment.id);
      toast({ title: t('course:assignmentAuthoring.deleted') });
    } catch (deleteError) {
      failureToast(deleteError, 'course:assignmentAuthoring.deleteError');
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="course:assignmentAuthoring.title"
          descriptionKey="course:assignmentAuthoring.subtitle"
          breadcrumbs={breadcrumbs}
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={course?.title}
        titleKey="course:assignmentAuthoring.title"
        descriptionKey="course:assignmentAuthoring.subtitle"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('course:assignmentAuthoring.addAssignment')}
          </Button>
        }
      />

      {academyId && courseId ? <SectionTabs items={editorTabs} /> : null}

      {assignments.length === 0 ? (
        <EmptyState
          titleKey="course:assignmentAuthoring.empty"
          descriptionKey="course:assignmentAuthoring.emptyDescription"
          primaryAction={{
            labelKey: 'course:assignmentAuthoring.addAssignment',
            onAction: openCreate,
            icon: Plus,
          }}
        />
      ) : (
        <ol className="space-y-3">
          {assignments.map((assignment) => (
            <li key={assignment.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {assignment.title}
                      </span>
                      <StatusBadge
                        labelKey={getLessonStatusLabelKey(assignment.status)}
                        tone={getLessonStatusTone(assignment.status)}
                      />
                    </div>
                    {assignment.dueAt ? (
                      <p className="text-xs text-muted-foreground">
                        {t('course:assignmentAuthoring.dueLabel', {
                          date: fmt.dateTime(assignment.dueAt),
                        })}
                        {' · '}
                        {t(
                          assignment.latePolicy === 'block'
                            ? 'course:assignmentAuthoring.latePolicyBadge.block'
                            : 'course:assignmentAuthoring.latePolicyBadge.accept_flagged'
                        )}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {unitLabel(assignment.sectionId)}
                    </p>
                    {assignment.requiredForCompletion ? (
                      <StatusBadge
                        labelKey="course:assignmentAuthoring.requiredForCompletionBadge"
                        tone="info"
                      />
                    ) : null}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t(
                          'course:assignmentAuthoring.menu.actionsFor',
                          {
                            title: assignment.title,
                          }
                        )}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setDialog({ mode: 'edit', assignment })}
                      >
                        {t('course:assignmentAuthoring.menu.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => goToSubmissions(assignment.id)}
                      >
                        <FileCheck2 className="size-4" aria-hidden />
                        {t('course:assignmentAuthoring.menu.reviewSubmissions')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => void handleDelete(assignment)}
                      >
                        {t('course:assignmentAuthoring.menu.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <AssignmentFormDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        mode={dialog?.mode ?? 'create'}
        assignment={dialog?.mode === 'edit' ? dialog.assignment : null}
        isPending={save.isPending}
        onSubmit={handleSubmit}
        error={dialog?.mode === 'edit' ? save.updateError : save.createError}
        unitField={
          dialog?.mode === 'edit' ? (
            <UnitPlacementNote
              sections={placement.sections}
              sectionId={dialog.assignment.sectionId}
            />
          ) : (
            <UnitPickerField
              sections={placement.sections}
              value={placement.value}
              onChange={placement.setValue}
              itemType="assignment"
              disabled={save.isPending}
            />
          )
        }
      />
    </PageContainer>
  );
}
