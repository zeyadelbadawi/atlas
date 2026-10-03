/**
 * Course Builder Page.
 *
 * Visualizes and manages a course's curriculum: sections (units) containing
 * one ordered sequence of lessons/quizzes/assignments each, with
 * create/edit/delete and two equivalent ways to reorder: drag-and-drop
 * (handle; pointer, touch or keyboard) and explicit move up/down buttons
 * (the always-available accessible alternative). Reorders are optimistic,
 * serialized, carry the order the author saw (409 on a concurrent change)
 * and report their progress inline and to screen readers. Only content
 * authoring is implemented here — student consumption of a course's
 * content is a separate module.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useIsMutating } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionTabs } from '@components/navigation';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { EmptyState, ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  useCourse,
  useCourseSections,
  useCreateCourseSection,
  useUpdateCourseSection,
  useDeleteCourseSection,
  useReorderCourseSections,
  useCreateCourseLesson,
  useUpdateCourseLesson,
  useDeleteCourseLesson,
} from '../hooks';
import { reorderSectionsMutationKey } from '../hooks/useReorderCourseSections';
import { SectionFormDialog } from '../components/SectionFormDialog';
import { LessonFormDialog } from '../components/LessonFormDialog';
import { UnitCurriculum } from '../components/UnitCurriculum';
import {
  CurriculumSortableList,
  DragHandle,
} from '../components/UnitCurriculumSortable';
import { useReorderFocus } from '../hooks/useReorderFocus';
import { LiveSessionCurriculumBlock } from '@features/live-sessions';
import { isStaleOrderError, moveItem } from '../utils/reorder.utils';
import { getCourseEditorTabs } from '../utils/course-navigation.utils';
import type {
  CourseLessonFormData,
  CourseSectionFormData,
} from '../schemas/course.schemas';
import type { CourseLesson, CourseSection } from '@types';

type SectionDialogState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly section: CourseSection }
  | null;

type LessonDialogState =
  | { readonly mode: 'create'; readonly sectionId: string }
  | {
      readonly mode: 'edit';
      readonly sectionId: string;
      readonly lesson: CourseLesson;
    }
  | null;

/** Move buttons stay focusable while a reorder is saving (focus must not drop to <body>). */
const SOFT_DISABLED =
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

export default function CourseBuilderPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId, courseId } = useParams<{
    academyId: string;
    courseId: string;
  }>();
  const { confirm } = useConfirmDialog();

  const [sectionDialog, setSectionDialog] = useState<SectionDialogState>(null);
  const [lessonDialog, setLessonDialog] = useState<LessonDialogState>(null);

  const { data: course } = useCourse(academyId ?? '', courseId ?? '');

  // The middle crumb (the course's own name) only joins the trail once the
  // course has loaded — before that, "Courses -> Course Builder" is still
  // a complete, honest trail rather than a placeholder label.
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
            labelKey: 'course:builder.title',
            label: course.title,
            path: buildPath(DASHBOARD_ROUTES.academyCourseDetail, {
              academyId: academyId ?? '',
              courseId: courseId ?? '',
            }),
          } satisfies BreadcrumbItem,
        ]
      : []),
    { labelKey: 'course:builder.title' },
  ];

  const {
    data: sectionsData,
    isLoading,
    error,
    refetch,
  } = useCourseSections(academyId ?? '', courseId ?? '');

  const sections = [...(sectionsData?.items ?? [])].sort(
    (a, b) => a.order - b.order
  );

  const createSection = useCreateCourseSection(academyId ?? '', courseId ?? '');
  const updateSection = useUpdateCourseSection(academyId ?? '', courseId ?? '');
  const deleteSection = useDeleteCourseSection(academyId ?? '', courseId ?? '');
  const reorderSections = useReorderCourseSections(
    academyId ?? '',
    courseId ?? ''
  );

  const createLesson = useCreateCourseLesson(academyId ?? '', courseId ?? '');
  const updateLesson = useUpdateCourseLesson(academyId ?? '', courseId ?? '');
  const deleteLesson = useDeleteCourseLesson(academyId ?? '', courseId ?? '');

  // Every queued section reorder of this course (not only the latest call).
  const isReorderingSections =
    useIsMutating({
      mutationKey: reorderSectionsMutationKey(courseId ?? ''),
    }) > 0;
  const deletingSectionId = deleteSection.isPending
    ? deleteSection.variables
    : undefined;
  const deletingLessonId = deleteLesson.isPending
    ? deleteLesson.variables?.lessonId
    : undefined;
  // Deleting a section changes the set being ordered, so the two exclude
  // each other.
  const sectionReorderLocked = isReorderingSections || !!deletingSectionId;
  const sectionIds = sections.map((section) => section.id);
  const sectionFocus = useReorderFocus(sectionIds);
  const [movingSectionId, setMovingSectionId] = useState<string | null>(null);
  const [sectionAnnouncement, setSectionAnnouncement] = useState('');

  const handleSectionSubmit = async (data: CourseSectionFormData) => {
    try {
      if (sectionDialog?.mode === 'edit') {
        await updateSection.mutateAsync({
          sectionId: sectionDialog.section.id,
          payload: data,
        });
        toast({ title: t('course:builder.sectionUpdated') });
      } else {
        await createSection.mutateAsync(data);
        toast({ title: t('course:builder.sectionCreated') });
      }
      setSectionDialog(null);
    } catch (error) {
      if (
        isApiError(error) &&
        error.kind === 'validation' &&
        error.violations?.length
      ) {
        return;
      }
      toast({
        title: t('course:builder.sectionError'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSection = async (section: CourseSection) => {
    const confirmed = await confirm({
      titleKey: 'course:builder.deleteSectionConfirm.title',
      descriptionKey: 'course:builder.deleteSectionConfirm.description',
      confirmLabelKey: 'course:builder.deleteSectionConfirm.confirmLabel',
      cancelLabelKey: 'course:builder.deleteSectionConfirm.cancelLabel',
      values: { title: section.title },
      intent: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteSection.mutateAsync(section.id);
      toast({ title: t('course:builder.sectionDeleted') });
    } catch {
      toast({
        title: t('course:builder.sectionError'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
    }
  };

  const persistSectionOrder = async (
    orderedIds: string[],
    movedId: string,
    focusCandidates: readonly string[]
  ) => {
    const previousIds = sectionIds;
    const moved = sections.find((section) => section.id === movedId);
    setMovingSectionId(movedId);
    setSectionAnnouncement(
      `${t('course:builder.order.moved', {
        title: moved?.title ?? '',
        position: orderedIds.indexOf(movedId) + 1,
        total: orderedIds.length,
      })} ${t('course:builder.order.saving')}`
    );
    sectionFocus.requestFocus(focusCandidates, orderedIds);
    try {
      await reorderSections.mutateAsync({
        orderedIds,
        expectedOrderedIds: previousIds,
      });
      setSectionAnnouncement(t('course:builder.order.saved'));
    } catch (error) {
      if (isStaleOrderError(error)) {
        // Rolled back by the hook, which also refetches the current order.
        setSectionAnnouncement(t('course:builder.reorderConflict'));
        toast({
          title: t('course:builder.reorderConflict'),
          variant: 'destructive',
        });
        sectionFocus.requestFocus(focusCandidates, null);
      } else {
        setSectionAnnouncement(t('course:builder.order.failed'));
        toast({
          title: t('course:builder.reorderError'),
          description: t('course:builder.order.failed'),
          variant: 'destructive',
        });
        sectionFocus.requestFocus(focusCandidates, previousIds);
      }
    } finally {
      setMovingSectionId(null);
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    // Double-clicks while a reorder is saving are ignored rather than sent
    // as a second reorder built on the same (now stale) order.
    if (sectionReorderLocked) return;
    const section = sections[index];
    const reordered = moveItem(sections, index, direction).map((s) => s.id);
    const opposite = direction === 'up' ? 'down' : 'up';
    void persistSectionOrder(reordered, section.id, [
      `${section.id}:${direction}`,
      `${section.id}:${opposite}`,
      `${section.id}:handle`,
    ]);
  };

  const handleDropSection = (orderedIds: string[], movedId: string) => {
    if (sectionReorderLocked) return;
    void persistSectionOrder(orderedIds, movedId, [`${movedId}:handle`]);
  };

  const handleLessonSubmit = async (data: CourseLessonFormData) => {
    if (!lessonDialog) return;
    const payload = {
      title: data.title,
      description: data.description || undefined,
      contentType: data.contentType,
      contentUrl: data.contentUrl || undefined,
      status: data.status,
    };

    try {
      if (lessonDialog.mode === 'edit') {
        await updateLesson.mutateAsync({
          sectionId: lessonDialog.sectionId,
          lessonId: lessonDialog.lesson.id,
          payload,
        });
        toast({ title: t('course:builder.lessonUpdated') });
      } else {
        await createLesson.mutateAsync({
          sectionId: lessonDialog.sectionId,
          payload,
        });
        toast({ title: t('course:builder.lessonCreated') });
      }
      setLessonDialog(null);
    } catch (error) {
      // A validation error is shown inline, on the field that caused it,
      // via `useServerValidation` inside `LessonFormDialog` — a generic
      // toast on top would just repeat "something's wrong" without
      // saying what.
      if (
        isApiError(error) &&
        error.kind === 'validation' &&
        error.violations?.length
      ) {
        return;
      }
      toast({
        title: t('course:builder.lessonError'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLesson = async (
    sectionId: string,
    lesson: CourseLesson
  ) => {
    const confirmed = await confirm({
      titleKey: 'course:builder.deleteLessonConfirm.title',
      descriptionKey: 'course:builder.deleteLessonConfirm.description',
      confirmLabelKey: 'course:builder.deleteLessonConfirm.confirmLabel',
      cancelLabelKey: 'course:builder.deleteLessonConfirm.cancelLabel',
      values: { title: lesson.title },
      intent: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteLesson.mutateAsync({ sectionId, lessonId: lesson.id });
      toast({ title: t('course:builder.lessonDeleted') });
    } catch {
      toast({
        title: t('course:builder.lessonError'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="course:builder.title"
          descriptionKey="course:builder.subtitle"
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
        titleKey="course:builder.title"
        descriptionKey="course:builder.subtitle"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={() => setSectionDialog({ mode: 'create' })}>
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('course:builder.addSection')}
          </Button>
        }
      />

      {academyId && courseId ? (
        <SectionTabs items={getCourseEditorTabs(academyId, courseId)} />
      ) : null}

      {sections.length === 0 ? (
        <EmptyState
          titleKey="course:builder.emptyCurriculum"
          descriptionKey="course:builder.emptyCurriculumDescription"
          primaryAction={{
            labelKey: 'course:builder.addSection',
            onAction: () => setSectionDialog({ mode: 'create' }),
            icon: Plus,
          }}
        />
      ) : (
        <>
          {/* One persistent polite region for section moves/saves/failures. */}
          <p
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {sectionAnnouncement}
          </p>
          <CurriculumSortableList
            items={sections}
            getLabel={(section) => section.title}
            onReorder={handleDropSection}
            disabled={sectionReorderLocked}
            className="space-y-4"
            ariaLabel={t('course:builder.title')}
            ariaBusy={isReorderingSections || !!deletingSectionId}
            rowClassName={(section) =>
              section.id === deletingSectionId
                ? 'pointer-events-none opacity-60'
                : undefined
            }
          >
            {(section, sectionIndex, { handle, isDragging }) => {
              const isDeleting = section.id === deletingSectionId;
              const isSaving = section.id === movingSectionId;
              return (
                <Card
                  aria-busy={isDeleting || isSaving || undefined}
                  className={cn(
                    'transition-colors motion-reduce:transition-none',
                    isSaving && 'border-primary/40',
                    isDragging && 'border-primary/60'
                  )}
                >
                  <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                    <div className="flex min-w-0 items-start gap-2">
                      <DragHandle
                        handle={handle}
                        isDragging={isDragging}
                        label={t('course:builder.dnd.sectionHandle', {
                          title: section.title,
                        })}
                        focusRef={sectionFocus.register(`${section.id}:handle`)}
                      />
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-display text-base font-semibold text-foreground">
                          {sectionIndex + 1}. {section.title}
                        </h3>
                        {section.description ? (
                          <p className="text-sm text-muted-foreground">
                            {section.description}
                          </p>
                        ) : null}
                        {isSaving || isDeleting ? (
                          // Visible twin of the live region (announced there).
                          <p
                            aria-hidden
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                            {isSaving
                              ? t('course:builder.order.saving')
                              : t('course:builder.deleting')}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        ref={sectionFocus.register(`${section.id}:up`)}
                        variant="ghost"
                        size="icon"
                        className={SOFT_DISABLED}
                        disabled={sectionIndex === 0 || isDeleting}
                        aria-disabled={sectionReorderLocked || undefined}
                        onClick={() => handleMoveSection(sectionIndex, 'up')}
                        aria-label={t('course:builder.sectionMenu.moveUp', {
                          title: section.title,
                        })}
                      >
                        <ArrowUp className="size-4" aria-hidden />
                      </Button>
                      <Button
                        ref={sectionFocus.register(`${section.id}:down`)}
                        variant="ghost"
                        size="icon"
                        className={SOFT_DISABLED}
                        disabled={
                          sectionIndex === sections.length - 1 || isDeleting
                        }
                        aria-disabled={sectionReorderLocked || undefined}
                        onClick={() => handleMoveSection(sectionIndex, 'down')}
                        aria-label={t('course:builder.sectionMenu.moveDown', {
                          title: section.title,
                        })}
                      >
                        <ArrowDown className="size-4" aria-hidden />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isDeleting || isReorderingSections}
                            aria-label={t('course:builder.sectionMenu.edit')}
                          >
                            <MoreHorizontal className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              setSectionDialog({ mode: 'edit', section })
                            }
                          >
                            {t('course:builder.sectionMenu.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => void handleDeleteSection(section)}
                          >
                            {t('course:builder.sectionMenu.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/*
                      P52 — the unified, ordered curriculum of this unit:
                      lessons + quizzes + assignments in ONE sequence the
                      author can reorder freely. Live Sessions render in the
                      deferred block below (Coming Soon), never installable.
                    */}
                    <UnitCurriculum
                      academyId={academyId ?? ''}
                      courseId={courseId ?? ''}
                      section={section}
                      pendingLessonId={
                        deleteLesson.variables?.sectionId === section.id
                          ? deletingLessonId
                          : undefined
                      }
                      locked={isDeleting}
                      onAddLesson={(sectionId) =>
                        setLessonDialog({ mode: 'create', sectionId })
                      }
                      onEditLesson={(sectionId, lesson) =>
                        setLessonDialog({ mode: 'edit', sectionId, lesson })
                      }
                      onDeleteLesson={(sectionId, lesson) =>
                        void handleDeleteLesson(sectionId, lesson)
                      }
                    />

                    {/*
                      Phase 12 — Live Sessions are a first-class curriculum
                      activity, so they are listed and created HERE, in the
                      unit they belong to, exactly like lessons. Sending an
                      instructor to a separate page to schedule one would
                      make it feel like a different product.
                    */}
                    <LiveSessionCurriculumBlock
                      academyId={academyId ?? ''}
                      courseId={courseId ?? ''}
                      sectionId={section.id}
                    />
                  </CardContent>
                </Card>
              );
            }}
          </CurriculumSortableList>
        </>
      )}

      <SectionFormDialog
        open={sectionDialog !== null}
        onOpenChange={(open) => !open && setSectionDialog(null)}
        mode={sectionDialog?.mode ?? 'create'}
        defaultValues={
          sectionDialog?.mode === 'edit'
            ? {
                title: sectionDialog.section.title,
                description: sectionDialog.section.description ?? '',
              }
            : undefined
        }
        isPending={createSection.isPending || updateSection.isPending}
        onSubmit={handleSectionSubmit}
        error={
          sectionDialog?.mode === 'edit'
            ? updateSection.error
            : createSection.error
        }
      />

      <LessonFormDialog
        open={lessonDialog !== null}
        onOpenChange={(open) => !open && setLessonDialog(null)}
        mode={lessonDialog?.mode ?? 'create'}
        defaultValues={
          lessonDialog?.mode === 'edit'
            ? {
                title: lessonDialog.lesson.title,
                description: lessonDialog.lesson.description ?? '',
                contentType: lessonDialog.lesson.contentType,
                contentUrl: lessonDialog.lesson.contentUrl ?? '',
                status: lessonDialog.lesson.status,
              }
            : undefined
        }
        isPending={createLesson.isPending || updateLesson.isPending}
        onSubmit={handleLessonSubmit}
        academyId={academyId}
        error={
          lessonDialog?.mode === 'edit'
            ? updateLesson.error
            : createLesson.error
        }
      />
    </PageContainer>
  );
}
