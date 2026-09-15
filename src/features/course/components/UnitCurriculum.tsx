/**
 * UnitCurriculum (P52) — the unified, ordered curriculum of ONE unit.
 *
 * Renders a unit's lessons, quizzes and assignments as a single ordered
 * sequence (never separate per-type lists) and lets the author reorder them
 * freely, add existing quizzes/assignments, create lessons, and remove
 * items. The order is authoritative: every move persists to the backend via
 * `reorderUnitItems` — nothing is kept only in browser state.
 *
 * Lessons keep their existing create/edit/delete dialogs (passed in as
 * callbacks so this component owns no lesson form). Quizzes/assignments are
 * attached/detached here; their own authoring stays on their own pages.
 * Live Sessions remain deferred and are only ever shown read-only if one
 * already exists.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  FileText,
  HelpCircle,
  MoreHorizontal,
  Plus,
  Radio,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@components/data-display';
import { EmptyState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  useUnitItems,
  useAvailableContent,
  useAttachUnitItem,
  useDetachUnitItem,
  useReorderUnitItems,
} from '../hooks';
import { moveItem } from '../utils/reorder.utils';
import { getLessonStatusLabelKey, getLessonStatusTone } from '../utils/course-status.utils';
import { AttachContentDialog } from './AttachContentDialog';
import type { CourseLesson, CourseSection, CurriculumItem, CurriculumItemType } from '@types';

const TYPE_ICON: Record<CurriculumItemType, LucideIcon> = {
  lesson: FileText,
  quiz: HelpCircle,
  assignment: ClipboardList,
  live_session: Radio,
};

const TYPE_LABEL_KEY: Record<CurriculumItemType, string> = {
  lesson: 'course:builder.itemType.lesson',
  quiz: 'course:builder.itemType.quiz',
  assignment: 'course:builder.itemType.assignment',
  live_session: 'course:builder.itemType.liveSession',
};

export interface UnitCurriculumProps {
  readonly academyId: string;
  readonly courseId: string;
  readonly section: CourseSection;
  readonly onAddLesson: (sectionId: string) => void;
  readonly onEditLesson: (sectionId: string, lesson: CourseLesson) => void;
  readonly onDeleteLesson: (sectionId: string, lesson: CourseLesson) => void;
}

export function UnitCurriculum({
  academyId,
  courseId,
  section,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: UnitCurriculumProps): JSX.Element {
  const { t } = useTranslation();
  const [attachType, setAttachType] = useState<'quiz' | 'assignment' | null>(null);

  const itemsQuery = useUnitItems(academyId, courseId, section.id);
  const availableQuery = useAvailableContent(academyId, courseId, attachType !== null);
  const reorder = useReorderUnitItems(academyId, courseId);
  const attach = useAttachUnitItem(academyId, courseId);
  const detach = useDetachUnitItem(academyId, courseId);

  const items = itemsQuery.data ?? [];
  const lessonsById = new Map(section.lessons.map((l) => [l.id, l]));

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const reordered = moveItem(items, index, direction);
    try {
      await reorder.mutateAsync({
        sectionId: section.id,
        payload: { orderedIds: reordered.map((i) => i.id) },
      });
    } catch {
      toast({
        title: t('course:builder.reorderError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleAttach = async (itemId: string) => {
    if (!attachType) return;
    try {
      await attach.mutateAsync({ sectionId: section.id, type: attachType, itemId });
      setAttachType(null);
    } catch {
      toast({
        title: t('course:builder.attach.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleDetach = async (item: CurriculumItem) => {
    if (item.type !== 'quiz' && item.type !== 'assignment') return;
    try {
      await detach.mutateAsync({ sectionId: section.id, type: item.type, itemId: item.id });
    } catch {
      toast({
        title: t('course:builder.attach.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const addMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t('course:builder.addContent')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onAddLesson(section.id)}>
          {t('course:builder.addLesson')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAttachType('quiz')}>
          {t('course:builder.addExistingQuiz')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAttachType('assignment')}>
          {t('course:builder.addExistingAssignment')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (itemsQuery.isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <EmptyState
          titleKey="course:builder.emptyUnit"
          descriptionKey="course:builder.emptyUnitDescription"
          className="py-6"
        />
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => {
            const Icon = TYPE_ICON[item.type];
            const lesson = item.type === 'lesson' ? lessonsById.get(item.id) : undefined;
            return (
              <li
                key={`${item.type}:${item.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate text-sm font-medium text-foreground">
                    {index + 1}. {item.title}
                  </span>
                  <StatusBadge
                    labelKey={TYPE_LABEL_KEY[item.type]}
                    tone="info"
                  />
                  <StatusBadge
                    labelKey={getLessonStatusLabelKey(
                      item.status === 'published' ? 'published' : 'draft',
                    )}
                    tone={getLessonStatusTone(
                      item.status === 'published' ? 'published' : 'draft',
                    )}
                  />
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => handleMove(index, 'up')}
                    aria-label={t('course:builder.lessonMenu.moveUp')}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === items.length - 1 || reorder.isPending}
                    onClick={() => handleMove(index, 'down')}
                    aria-label={t('course:builder.lessonMenu.moveDown')}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('course:builder.itemMenu.actions')}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {item.type === 'lesson' && lesson ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => onEditLesson(section.id, lesson)}
                          >
                            {t('course:builder.lessonMenu.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDeleteLesson(section.id, lesson)}
                          >
                            {t('course:builder.lessonMenu.delete')}
                          </DropdownMenuItem>
                        </>
                      ) : item.type === 'quiz' || item.type === 'assignment' ? (
                        <DropdownMenuItem onClick={() => void handleDetach(item)}>
                          {t('course:builder.itemMenu.removeFromUnit')}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem disabled>
                          {t('course:builder.itemMenu.liveSessionDeferred')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap gap-2">{addMenu}</div>

      <AttachContentDialog
        open={attachType !== null}
        onOpenChange={(open) => !open && setAttachType(null)}
        type={attachType ?? 'quiz'}
        sectionId={section.id}
        available={availableQuery.data ?? []}
        isAttaching={attach.isPending}
        onAttach={handleAttach}
      />
    </div>
  );
}
