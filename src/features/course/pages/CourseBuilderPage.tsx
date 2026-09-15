/**
 * Course Builder Page.
 *
 * Visualizes and manages a course's curriculum: sections containing lessons,
 * with create/edit/delete and explicit (keyboard-accessible) reordering.
 * Only content authoring is implemented here — student consumption of a
 * course's content is a separate, future module.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Link as LinkIcon,
  MoreHorizontal,
  Plus,
  Video,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionTabs } from '@components/navigation';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
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
  useReorderCourseLessons,
} from '../hooks';
import { SectionFormDialog } from '../components/SectionFormDialog';
import { LessonFormDialog } from '../components/LessonFormDialog';
import { UnitCurriculum } from '../components/UnitCurriculum';
import { LiveSessionCurriculumBlock } from '@features/live-sessions';
import {
  getLessonStatusLabelKey,
  getLessonStatusTone,
} from '../utils/course-status.utils';
import { moveItem } from '../utils/reorder.utils';
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

const CONTENT_TYPE_ICON = {
  text: FileText,
  video: Video,
  file: LinkIcon,
} as const;

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
  const reorderLessons = useReorderCourseLessons(
    academyId ?? '',
    courseId ?? ''
  );

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
        description: t('errors:generic'),
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
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    const reordered = moveItem(sections, index, direction);
    try {
      await reorderSections.mutateAsync({
        orderedIds: reordered.map((section) => section.id),
      });
    } catch {
      toast({
        title: t('course:builder.reorderError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
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
        description: t('errors:generic'),
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
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleMoveLesson = async (
    section: CourseSection,
    lessonIndex: number,
    direction: 'up' | 'down'
  ) => {
    const sortedLessons = [...section.lessons].sort(
      (a, b) => a.order - b.order
    );
    const reordered = moveItem(sortedLessons, lessonIndex, direction);
    try {
      await reorderLessons.mutateAsync({
        sectionId: section.id,
        payload: { orderedIds: reordered.map((lesson) => lesson.id) },
      });
    } catch {
      toast({
        title: t('course:builder.reorderError'),
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
        <ol className="space-y-4">
          {sections.map((section, sectionIndex) => {
            const lessons = [...section.lessons].sort(
              (a, b) => a.order - b.order
            );

            return (
              <li key={section.id}>
                <Card>
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <h3 className="font-display text-base font-semibold text-foreground">
                        {sectionIndex + 1}. {section.title}
                      </h3>
                      {section.description ? (
                        <p className="text-sm text-muted-foreground">
                          {section.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={sectionIndex === 0}
                        onClick={() => handleMoveSection(sectionIndex, 'up')}
                        aria-label={t('course:builder.sectionMenu.moveUp')}
                      >
                        <ArrowUp className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={sectionIndex === sections.length - 1}
                        onClick={() => handleMoveSection(sectionIndex, 'down')}
                        aria-label={t('course:builder.sectionMenu.moveDown')}
                      >
                        <ArrowDown className="size-4" aria-hidden />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
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
              </li>
            );
          })}
        </ol>
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
