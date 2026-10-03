/**
 * Sortable-list primitives for the course builder (sections within a course,
 * items within ONE unit), built on `@dnd-kit`.
 *
 * ACCESSIBILITY CONTRACT.
 *   - Dragging starts ONLY from the dedicated handle button (it carries the
 *     dnd-kit listeners and an `aria-label` naming the row). Every other
 *     interactive child — move buttons, menus, links — never starts a drag.
 *   - Pointer and keyboard both work. The PointerSensor handles mouse, pen
 *     AND touch pointers, with an activation distance so a tap or click on
 *     the handle is not a drag; the handle is `touch-none`, so a finger on
 *     it drags instead of scrolling, while scrolling anywhere else on a
 *     phone never starts a drag (only the handle carries the listeners).
 *     The TouchSensor's press delay only matters in a browser without
 *     pointer events. Keyboard: Space/Enter to pick up, arrows to move,
 *     Space/Enter to drop, Escape to cancel.
 *   - Every phase is announced to screen readers in the current language
 *     (dnd-kit's live region + our translated announcements and
 *     instructions); dnd-kit restores focus to the handle after a drop.
 *   - The explicit move up/down buttons remain the always-available,
 *     non-drag alternative — this file does not replace them.
 *   - Under `prefers-reduced-motion` rows jump instead of sliding, and the
 *     drop highlight is a static ring, not an animation.
 *
 * Lists never share a `DndContext`, so an item can never be dragged into
 * another unit — the data model has no cross-unit move.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  Announcements,
  DragEndEvent,
  Modifier,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMediaQuery } from '@/shared/hooks';
import { cn } from '@/lib/utils';

/** Vertical lists only — keep a dragged row in its column. */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

const DROP_HIGHLIGHT_MS = 1200;

/** Handle bindings a row passes to its `DragHandle`. */
export interface DragHandleBindings {
  readonly setActivatorNodeRef: (element: HTMLElement | null) => void;
  readonly attributes: Record<string, unknown>;
  readonly listeners: Record<string, unknown> | undefined;
  readonly disabled: boolean;
}

export interface SortableRowState {
  readonly handle: DragHandleBindings;
  readonly isDragging: boolean;
}

export interface CurriculumSortableListProps<
  TItem extends { readonly id: string },
> {
  readonly items: readonly TItem[];
  /** Human label of a row, used by the screen-reader announcements. */
  readonly getLabel: (item: TItem) => string;
  /** Called with the complete new order after a successful drop that changed it. */
  readonly onReorder: (orderedIds: string[], movedId: string) => void;
  /** Disables dragging (e.g. while a conflicting write is pending). */
  readonly disabled?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly ariaBusy?: boolean;
  /** Extra classes for one row (e.g. a pending/deleting state). */
  readonly rowClassName?: (item: TItem) => string | undefined;
  readonly children: (
    item: TItem,
    index: number,
    state: SortableRowState
  ) => ReactNode;
}

function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function CurriculumSortableList<TItem extends { readonly id: string }>({
  items,
  getLabel,
  onReorder,
  disabled = false,
  className,
  ariaLabel,
  ariaBusy,
  rowClassName,
  children,
}: CurriculumSortableListProps<TItem>): JSX.Element {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [droppedId, setDroppedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const byId = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );

  useEffect(() => {
    if (!droppedId) return undefined;
    const timer = window.setTimeout(
      () => setDroppedId(null),
      DROP_HIGHLIGHT_MS
    );
    return () => window.clearTimeout(timer);
  }, [droppedId]);

  const labelOf = useCallback(
    (id: UniqueIdentifier) => {
      const item = byId.get(String(id));
      return item ? getLabel(item) : String(id);
    },
    [byId, getLabel]
  );
  const positionOf = useCallback(
    (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1,
    [ids]
  );

  const announcements: Announcements = useMemo(
    () => ({
      onDragStart: ({ active }) =>
        t('course:builder.dnd.pickedUp', {
          title: labelOf(active.id),
          position: positionOf(active.id),
          total: ids.length,
        }),
      onDragOver: ({ active, over }) =>
        over
          ? t('course:builder.dnd.movedOver', {
              title: labelOf(active.id),
              position: positionOf(over.id),
              total: ids.length,
            })
          : undefined,
      onDragEnd: ({ active, over }) =>
        !over || over.id === active.id
          ? t('course:builder.dnd.droppedUnchanged', {
              title: labelOf(active.id),
            })
          : t('course:builder.dnd.dropped', {
              title: labelOf(active.id),
              position: positionOf(over.id),
              total: ids.length,
            }),
      onDragCancel: ({ active }) =>
        t('course:builder.dnd.cancelled', {
          title: labelOf(active.id),
          position: positionOf(active.id),
          total: ids.length,
        }),
    }),
    [t, labelOf, positionOf, ids.length]
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    setDroppedId(String(active.id));
    onReorder(arrayMove(ids, from, to), String(active.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: t('course:builder.dnd.instructions'),
        },
      }}
    >
      <SortableContext
        items={ids}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <ol
          className={className}
          aria-label={ariaLabel}
          aria-busy={ariaBusy || undefined}
        >
          {items.map((item, index) => (
            <SortableRow
              key={item.id}
              id={item.id}
              index={index}
              disabled={disabled}
              roleDescription={t('course:builder.dnd.roleDescription')}
              reducedMotion={reducedMotion}
              justDropped={droppedId === item.id}
              className={rowClassName?.(item)}
            >
              {(state) => children(item, index, state)}
            </SortableRow>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

interface SortableRowProps {
  readonly id: string;
  readonly index: number;
  readonly disabled: boolean;
  readonly roleDescription: string;
  readonly reducedMotion: boolean;
  readonly justDropped: boolean;
  readonly className?: string;
  readonly children: (state: SortableRowState) => ReactNode;
}

function SortableRow({
  id,
  index,
  disabled,
  roleDescription,
  reducedMotion,
  justDropped,
  className,
  children,
}: SortableRowProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    over,
    activeIndex,
  } = useSortable({
    id,
    disabled,
    attributes: { roleDescription },
    transition: reducedMotion ? null : undefined,
  });

  // Insertion indicator: on the row currently targeted, a bar on the side
  // the dragged row will land on.
  const isTarget =
    over?.id === id && activeIndex !== -1 && activeIndex !== index;
  const indicator = isTarget
    ? activeIndex > index
      ? 'before'
      : 'after'
    : null;

  // Stable while dnd-kit's own values are, so the handle's ref callback
  // is not detached and re-attached on every render.
  const handle = useMemo<DragHandleBindings>(
    () => ({
      setActivatorNodeRef,
      attributes: attributes as unknown as Record<string, unknown>,
      listeners: listeners as Record<string, unknown> | undefined,
      disabled,
    }),
    [setActivatorNodeRef, attributes, listeners, disabled]
  );

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: reducedMotion ? undefined : transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-sortable-id={id}
      data-sortable-index={index}
      data-dragging={isDragging || undefined}
      className={cn(
        'relative rounded-lg',
        isDragging && 'z-10 bg-background shadow-lg ring-2 ring-primary/60',
        justDropped && !isDragging && 'ring-2 ring-primary/40',
        className
      )}
    >
      {indicator ? (
        <span
          aria-hidden
          data-insertion-indicator={indicator}
          className={cn(
            'pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-primary',
            indicator === 'before' ? '-top-1.5' : '-bottom-1.5'
          )}
        />
      ) : null}
      {children({ handle, isDragging })}
    </li>
  );
}

export interface DragHandleProps {
  readonly handle: DragHandleBindings;
  readonly label: string;
  readonly isDragging?: boolean;
  /** Registers the handle for focus restoration (see `useReorderFocus`). */
  readonly focusRef?: (element: HTMLElement | null) => void;
}

/** The only element that starts a drag. A real `<button>` with a translated name. */
export function DragHandle({
  handle,
  label,
  isDragging,
  focusRef,
}: DragHandleProps): JSX.Element {
  const { setActivatorNodeRef } = handle;
  const setRefs = useCallback(
    (element: HTMLButtonElement | null) => {
      setActivatorNodeRef(element);
      focusRef?.(element);
    },
    [setActivatorNodeRef, focusRef]
  );

  return (
    <button
      type="button"
      ref={setRefs}
      {...handle.attributes}
      {...(handle.listeners ?? {})}
      aria-label={label}
      className={cn(
        'inline-flex size-9 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground transition-colors motion-reduce:transition-none',
        'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        handle.disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-grab active:cursor-grabbing',
        isDragging && 'cursor-grabbing bg-accent text-accent-foreground'
      )}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}
