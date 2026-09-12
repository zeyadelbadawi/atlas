/**
 * Course Assignments Page (Phase 4).
 *
 * Lists every assignment belonging to a course (draft + published) for an
 * authoring user, with create/edit/delete. Grading happens elsewhere (the
 * Instructor experience); this page only ever authors the assignment
 * itself.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '@hooks';
import { useParams } from 'react-router-dom';
import { MoreHorizontal, Plus } from 'lucide-react';
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
import { isApiError } from '@api';
import { useConfirmDialog } from '@app/providers';
import {
  useAssignmentsForAuthoring,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  type AssignmentAuthoringFormData,
} from '@features/learning';
import { useCourse } from '../hooks';
import { AssignmentFormDialog } from '../components/AssignmentFormDialog';
import {
  getLessonStatusLabelKey,
  getLessonStatusTone,
} from '../utils/course-status.utils';
import { getCourseEditorTabs } from '../utils/course-navigation.utils';
import type { Assignment } from '@types';

type DialogState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly assignment: Assignment }
  | null;

export default function CourseAssignmentsPage(): JSX.Element {
  const fmt = useDateFormatter();
  const { t } = useTranslation();
  const { academyId, courseId } = useParams<{
    academyId: string;
    courseId: string;
  }>();
  const { confirm } = useConfirmDialog();

  const [dialog, setDialog] = useState<DialogState>(null);

  const { data: course } = useCourse(academyId ?? '', courseId ?? '');

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'course:list.title',
      path: buildPath(DASHBOARD_ROUTES.academyCourses, {
        academyId: academyId ?? '',
      }),
    },
    ...(course
      ? [
          {
            labelKey: 'course:assignmentAuthoring.title',
            label: course.title,
            path: buildPath(DASHBOARD_ROUTES.academyCourseDetail, {
              academyId: academyId ?? '',
              courseId: courseId ?? '',
            }),
          } satisfies BreadcrumbItem,
        ]
      : []),
    { labelKey: 'course:assignmentAuthoring.title' },
  ];

  const {
    data: assignmentsData,
    isLoading,
    error,
    refetch,
  } = useAssignmentsForAuthoring(courseId ?? '');
  const assignments = assignmentsData?.items ?? [];

  const createAssignment = useCreateAssignment(courseId ?? '');
  const updateAssignment = useUpdateAssignment(courseId ?? '');
  const deleteAssignment = useDeleteAssignment(courseId ?? '');

  const handleSubmit = async (data: AssignmentAuthoringFormData) => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      instructions: data.instructions || undefined,
      status: data.status,
      dueAt: data.dueAt ? new Date(data.dueAt).toISOString() : undefined,
      allowResubmission: data.allowResubmission,
    };

    try {
      if (dialog?.mode === 'edit') {
        await updateAssignment.mutateAsync({
          assignmentId: dialog.assignment.id,
          payload,
        });
        toast({ title: t('course:assignmentAuthoring.updated') });
      } else {
        await createAssignment.mutateAsync(payload);
        toast({ title: t('course:assignmentAuthoring.created') });
      }
      setDialog(null);
    } catch (submitError) {
      if (
        isApiError(submitError) &&
        submitError.kind === 'validation' &&
        submitError.violations?.length
      ) {
        return;
      }
      toast({
        title: t('course:assignmentAuthoring.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
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
    } catch {
      toast({
        title: t('course:assignmentAuthoring.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
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
          <Button onClick={() => setDialog({ mode: 'create' })}>
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('course:assignmentAuthoring.addAssignment')}
          </Button>
        }
      />

      {academyId && courseId ? (
        <SectionTabs items={getCourseEditorTabs(academyId, courseId)} />
      ) : null}

      {assignments.length === 0 ? (
        <EmptyState
          titleKey="course:assignmentAuthoring.empty"
          descriptionKey="course:assignmentAuthoring.emptyDescription"
          primaryAction={{
            labelKey: 'course:assignmentAuthoring.addAssignment',
            onAction: () => setDialog({ mode: 'create' }),
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
                      </p>
                    ) : null}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('course:assignmentAuthoring.menu.edit')}
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
        isPending={createAssignment.isPending || updateAssignment.isPending}
        onSubmit={handleSubmit}
        error={
          dialog?.mode === 'edit'
            ? updateAssignment.error
            : createAssignment.error
        }
      />
    </PageContainer>
  );
}
