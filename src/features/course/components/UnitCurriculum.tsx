/**
 * UnitCurriculum (P52) — the unified, ordered curriculum of ONE unit.
 *
 * Renders a unit's lessons, quizzes and assignments as a single ordered
 * sequence (never separate per-type lists) and lets the author reorder them
 * — by drag-and-drop (handle; pointer, touch or keyboard) or with the
 * explicit move up/down buttons, which stay as the non-drag alternative —
 * add existing quizzes/assignments, create lessons, and remove items.
 *
 * The order is authoritative: every move persists to the backend via
 * `reorderUnitItems`, optimistically (the row is in place at once and keeps
 * focus), with the order the author saw sent as `expectedOrderedIds`. A
 * failure rolls back and says so; a concurrent change (409) refetches and
 * says that instead. While a write that changes this unit is in flight, the
 * controls that would conflict with it are disabled and the affected row
 * shows what is happening; status changes are announced politely.
 *
 * Items never move between units (the data model has no cross-unit move):
 * each unit is its own drag context. Lessons keep their create/edit/delete
 * dialogs (callbacks — this component owns no lesson form). Live Sessions
 * remain deferred and are only ever shown read-only if one already exists.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMutating } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  FileText,
  HelpCircle,
  Loader2,
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
import { useConfirmDialog } from '@app/providers';
import { cn } from '@/lib/utils';
import {
  useUnitItems,
  useAvailableContent,
  useAttachUnitItem,
  useDetachUnitItem,
  useReorderUnitItems,
} from '../hooks';
import { reorderUnitItemsMutationKey } from '../hooks/useUnitCurriculum';
import { isStaleOrderError, moveItem } from '../utils/reorder.utils';
import {
  getLessonStatusLabelKey,
  getLessonStatusTone,
} from '../utils/course-status.utils';
import { AttachContentDialog } from './AttachContentDialog';
import { CurriculumSortableList, DragHandle } from './UnitCurriculumSortable';
import { useReorderFocus } from '../hooks/useReorderFocus';
import type {
  CourseLesson,
  CourseSection,
  CurriculumItem,
  CurriculumItemType,
} from '@types';

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

/** Shared by move buttons whose action is momentarily unavailable but must stay focusable. */
const SOFT_DISABLED =
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

export interface UnitCurriculumProps {
  readonly academyId: string;
  readonly courseId: string;
  readonly section: CourseSection;
  readonly onAddLesson: (sectionId: string) => void;
  readonly onEditLesson: (sectionId: string, lesson: CourseLesson) => void;
  readonly onDeleteLesson: (sectionId: string, lesson: CourseLesson) => void;
  /** The lesson of this unit currently being deleted by the page, if any. */
  readonly pendingLessonId?: string;
  /** Freezes every write control of the unit (e.g. while the unit itself is being deleted). */
  readonly locked?: boolean;
}

export function UnitCurriculum({
  academyId,
  courseId,
  section,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  pendingLessonId,
  locked = false,
}: UnitCurriculumProps): JSX.Element {
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const [attachType, setAttachType] = useState<'quiz' | 'assignment' | null>(
    null
  );
  const [movingId, setMovingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const itemsQuery = useUnitItems(academyId, courseId, section.id);
  const availableQuery = useAvailableContent(
    academyId,
    courseId,
    attachType !== null
  );
  const reorder = useReorderUnitItems(academyId, courseId, section.id);
  const attach = useAttachUnitItem(academyId, courseId);
  const detach = useDetachUnitItem(academyId, courseId);
  // Every queued reorder of this unit, not just the latest `mutate` call.
  const isReordering =
    useIsMutating({ mutationKey: reorderUnitItemsMutationKey(section.id) }) > 0;

  const items = itemsQuery.data ?? [];
  const ids = items.map((item) => item.id);
  const focus = useReorderFocus(ids);
  const lessonsById = new Map(section.lessons.map((l) => [l.id, l]));

  const detachingId = detach.isPending ? detach.variables?.itemId : undefined;
  const attachingId = attach.isPending ? attach.variables?.itemId : undefined;
  const busyItemId = detachingId ?? pendingLessonId;
  // A write that changes the SET of items conflicts with a reorder (it would
  // be refused as stale) and vice versa, so each disables the other.
  const setChanging = locked || !!busyItemId || attach.isPending;
  const reorderLocked = setChanging || isReordering;

  const persistOrder = async (
    orderedIds: string[],
    movedId: string,
    focusCandidates: readonly string[]
  ) => {
    const previousIds = ids;
    const moved = items.find((item) => item.id === movedId);
    setMovingId(movedId);
    setAnnouncement(
      `${t('course:builder.order.moved', {
        title: moved?.title ?? '',
        position: orderedIds.indexOf(movedId) + 1,
        total: orderedIds.length,
      })} ${t('course:builder.order.saving')}`
    );
    focus.requestFocus(focusCandidates, orderedIds);
    try {
      await reorder.mutateAsync({
        orderedIds,
        expectedOrderedIds: previousIds,
      });
      setAnnouncement(t('course:builder.order.saved'));
    } catch (error) {
      if (isStaleOrderError(error)) {
        // The hook rolled back and refetches the authoritative order.
        setAnnouncement(t('course:builder.reorderConflict'));
        toast({
          title: t('course:builder.reorderConflict'),
          variant: 'destructive',
        });
        focus.requestFocus(focusCandidates, null);
      } else {
        setAnnouncement(t('course:builder.order.failed'));
        toast({
          title: t('course:builder.reorderError'),
          description: t('course:builder.order.failed'),
          variant: 'destructive',
        });
        focus.requestFocus(focusCandidates, previousIds);
      }
    } finally {
      setMovingId(null);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (reorderLocked) return;
    const item = items[index];
    const reordered = moveItem(items, index, direction).map((i) => i.id);
    const opposite = direction === 'up' ? 'down' : 'up';
    void persistOrder(reordered, item.id, [
      `${item.id}:${direction}`,
      `${item.id}:${opposite}`,
      `${item.id}:handle`,
    ]);
  };

  const handleDrop = (orderedIds: string[], movedId: string) => {
    if (reorderLocked) return;
    void persistOrder(orderedIds, movedId, [`${movedId}:handle`]);
  };

  const handleAttach = async (itemId: string) => {
    if (!attachType) return;
    try {
      await attach.mutateAsync({
        sectionId: section.id,
        type: attachType,
        itemId,
      });
      setAttachType(null);
    } catch {
      toast({
        title: t('course:builder.attach.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
    }
  };

  const handleDetach = async (item: CurriculumItem) => {
    if (item.type !== 'quiz' && item.type !== 'assignment') return;
    const confirmed = await confirm({
      titleKey: 'course:builder.detachConfirm.title',
      descriptionKey: 'course:builder.detachConfirm.description',
      confirmLabelKey: 'course:builder.detachConfirm.confirmLabel',
      cancelLabelKey: 'course:builder.detachConfirm.cancelLabel',
      values: { title: item.title },
    });
    if (!confirmed) return;
    try {
      await detach.mutateAsync({
        sectionId: section.id,
        type: item.type,
        itemId: item.id,
      });
      toast({ title: t('course:builder.itemDetached') });
    } catch {
      toast({
        title: t('course:builder.attach.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
    }
  };

  const addMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={locked || isReordering}>
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
      {/* One persistent polite region per unit: moves, saves and failures. */}
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>

      {items.length === 0 ? (
        <EmptyState
          titleKey="course:builder.emptyUnit"
          descriptionKey="course:builder.emptyUnitDescription"
          className="py-6"
        />
      ) : (
        <CurriculumSortableList
          items={items}
          getLabel={(item) => item.title}
          onReorder={handleDrop}
          disabled={reorderLocked}
          className="space-y-2"
          ariaLabel={section.title}
          ariaBusy={isReordering || !!busyItemId}
          rowClassName={(item) =>
            item.id === busyItemId
              ? 'pointer-events-none opacity-60'
              : undefined
          }
        >
          {(item, index, { handle, isDragging }) => {
            const Icon = TYPE_ICON[item.type];
            const lesson =
              item.type === 'lesson' ? lessonsById.get(item.id) : undefined;
            const rowBusy = item.id === busyItemId;
            const isSaving = item.id === movingId;
            return (
              <div
                aria-busy={rowBusy || isSaving || undefined}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors motion-reduce:transition-none',
                  !isDragging && 'hover:border-primary/40',
                  isSaving && 'border-primary/40'
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <DragHandle
                    handle={handle}
                    isDragging={isDragging}
                    label={t('course:builder.dnd.itemHandle', {
                      title: item.title,
                    })}
                    focusRef={focus.register(`${item.id}:handle`)}
                  />
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="truncate text-sm font-medium text-foreground">
                    {index + 1}. {item.title}
                  </span>
                  <StatusBadge
                    labelKey={TYPE_LABEL_KEY[item.type]}
                    tone="info"
                  />
                  <StatusBadge
                    labelKey={getLessonStatusLabelKey(
                      item.status === 'published' ? 'published' : 'draft'
                    )}
                    tone={getLessonStatusTone(
                      item.status === 'published' ? 'published' : 'draft'
                    )}
                  />
                  {isSaving || rowBusy ? (
                    // Visible twin of the live region above (announced there).
                    <span
                      aria-hidden
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                    >
                      <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                      {isSaving
                        ? t('course:builder.order.saving')
                        : item.id === detachingId
                          ? t('course:builder.removing')
                          : t('course:builder.deleting')}
                    </span>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    ref={focus.register(`${item.id}:up`)}
                    variant="ghost"
                    size="icon"
                    className={SOFT_DISABLED}
                    disabled={index === 0 || rowBusy}
                    aria-disabled={reorderLocked || undefined}
                    onClick={() => handleMove(index, 'up')}
                    aria-label={t('course:builder.lessonMenu.moveUp')}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    ref={focus.register(`${item.id}:down`)}
                    variant="ghost"
                    size="icon"
                    className={SOFT_DISABLED}
                    disabled={index === items.length - 1 || rowBusy}
                    aria-disabled={reorderLocked || undefined}
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
                        disabled={rowBusy || setChanging || isReordering}
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
                        <DropdownMenuItem
                          onClick={() => void handleDetach(item)}
                        >
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
              </div>
            );
          }}
        </CurriculumSortableList>
      )}

      <div className="flex flex-wrap gap-2">{addMenu}</div>

      <AttachContentDialog
        open={attachType !== null}
        onOpenChange={(open) => !open && setAttachType(null)}
        type={attachType ?? 'quiz'}
        sectionId={section.id}
        available={availableQuery.data ?? []}
        isAttaching={attach.isPending}
        attachingItemId={attachingId}
        onAttach={handleAttach}
      />
    </div>
  );
}
