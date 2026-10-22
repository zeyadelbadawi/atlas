/**
 * The visual editor's list of the page's sections, top to bottom.
 *
 * Selecting a row selects the section (and the canvas scrolls to it).
 * Rows reorder by dragging their handle — or, since dragging must never be
 * the only way (WCAG 2.2 "Dragging Movements"), with Move up / Move down,
 * which is also what a phone offers. "+" between rows adds a section right
 * there. A section that is hidden, or needs attention before the page can
 * be saved, says so in its row.
 */
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@utils';
import { CurriculumSortableList, DragHandle } from '@features/course';
import type { SectionInstance } from '@types';
import { SECTION_METADATA } from '../sections/section-metadata.registry';
import { countSampleItems } from '../utils/sample-content.utils';

export interface StructurePanelProps {
  readonly sections: readonly SectionInstance[];
  readonly selectedId?: string;
  readonly canManage: boolean;
  /** Sections the page cannot be saved with yet (too long, or invalid). */
  readonly attentionIds: ReadonlySet<string>;
  readonly onSelect: (id: string) => void;
  readonly onReorder: (from: number, to: number) => void;
  readonly onMove: (index: number, direction: -1 | 1) => void;
  readonly onDuplicate: (id: string) => void;
  readonly onToggleEnabled: (id: string) => void;
  readonly onDelete: (id: string) => void;
  /** Opens the section library to add a section at `index`. */
  readonly onAddAt: (index: number) => void;
}

export function StructurePanel({
  sections,
  selectedId,
  canManage,
  attentionIds,
  onSelect,
  onReorder,
  onMove,
  onDuplicate,
  onToggleEnabled,
  onDelete,
  onAddAt,
}: StructurePanelProps): JSX.Element {
  const { t } = useTranslation();
  const labelOf = (section: SectionInstance) =>
    t(SECTION_METADATA[section.type].labelKey);

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {t('website:visualEditor.structure.empty')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('website:visualEditor.structure.emptyHint')}
        </p>
        {canManage ? (
          <Button type="button" onClick={() => onAddAt(0)}>
            <Plus className="size-4" aria-hidden />
            {t('website:visualEditor.add.button')}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {canManage ? (
        <AddHere
          label={t('website:visualEditor.add.atStart')}
          onClick={() => onAddAt(0)}
        />
      ) : null}
      <CurriculumSortableList
        items={sections}
        getLabel={labelOf}
        disabled={!canManage}
        ariaLabel={t('website:visualEditor.structure.title')}
        className="space-y-1"
        onReorder={(orderedIds, movedId) => {
          const from = sections.findIndex((section) => section.id === movedId);
          const to = orderedIds.indexOf(movedId);
          if (from >= 0 && to >= 0) onReorder(from, to);
        }}
      >
        {(section, index, { handle, isDragging }) => {
          const metadata = SECTION_METADATA[section.type];
          const Icon = metadata.icon;
          const label = labelOf(section);
          const isSelected = section.id === selectedId;
          const isHidden =
            !section.enabled ||
            (!section.visibility.desktop &&
              !section.visibility.tablet &&
              !section.visibility.mobile);
          return (
            <>
              <div
                className={cn(
                  'group flex min-h-11 items-center gap-1 rounded-lg border px-1 transition-colors motion-reduce:transition-none',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-border hover:bg-accent/40',
                  isDragging && 'bg-background'
                )}
                data-testid={`structure-row-${section.id}`}
                data-selected={isSelected || undefined}
              >
                {canManage ? (
                  <DragHandle
                    handle={handle}
                    isDragging={isDragging}
                    label={t('website:visualEditor.actions.drag', {
                      section: label,
                    })}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => onSelect(section.id)}
                  aria-current={isSelected ? 'true' : undefined}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'truncate text-sm',
                      isSelected ? 'font-semibold' : 'font-medium',
                      isHidden ? 'text-muted-foreground' : 'text-foreground'
                    )}
                  >
                    {label}
                  </span>
                  {isHidden ? (
                    <EyeOff
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-label={t('website:visualEditor.badges.hidden')}
                    />
                  ) : null}
                  {countSampleItems(section) > 0 ? (
                    <Badge
                      variant="secondary"
                      className="shrink-0 px-1.5 py-0 text-[11px]"
                    >
                      {t('website:visualEditor.badges.sample')}
                    </Badge>
                  ) : null}
                  {attentionIds.has(section.id) ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-destructive px-1.5 py-0 text-[11px] text-destructive"
                      data-testid={`attention-${section.id}`}
                    >
                      {t('website:visualEditor.badges.attention')}
                    </Badge>
                  ) : null}
                </button>
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-muted-foreground"
                        aria-label={t('website:visualEditor.actions.more', {
                          section: label,
                        })}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={index === 0}
                        onSelect={() => onMove(index, -1)}
                      >
                        <ArrowUp className="size-4" aria-hidden />
                        {t('website:visualEditor.actions.moveUp')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={index === sections.length - 1}
                        onSelect={() => onMove(index, 1)}
                      >
                        <ArrowDown className="size-4" aria-hidden />
                        {t('website:visualEditor.actions.moveDown')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onDuplicate(section.id)}
                      >
                        <Copy className="size-4" aria-hidden />
                        {t('website:visualEditor.actions.duplicate')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onToggleEnabled(section.id)}
                      >
                        {section.enabled ? (
                          <EyeOff className="size-4" aria-hidden />
                        ) : (
                          <Eye className="size-4" aria-hidden />
                        )}
                        {section.enabled
                          ? t('website:visualEditor.actions.hide')
                          : t('website:visualEditor.actions.show')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => onDelete(section.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        {t('website:visualEditor.actions.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
              {canManage ? (
                <AddHere
                  label={t('website:visualEditor.add.after', {
                    section: label,
                  })}
                  onClick={() => onAddAt(index + 1)}
                />
              ) : null}
            </>
          );
        }}
      </CurriculumSortableList>
    </div>
  );
}

/**
 * A slim "+" between two rows. Quiet until the pointer or keyboard focus
 * reaches it, always visible where there is no hover (touch screens).
 */
function AddHere({
  label,
  onClick,
}: {
  readonly label: string;
  readonly onClick: () => void;
}): JSX.Element {
  return (
    <div className="group/add relative flex h-3 items-center justify-center">
      <span
        aria-hidden
        className="absolute inset-x-3 h-px bg-primary opacity-0 transition-opacity group-hover/add:opacity-60 group-focus-within/add:opacity-60 motion-reduce:transition-none"
      />
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="relative z-10 flex size-6 items-center justify-center rounded-full border border-primary/40 bg-background text-primary opacity-0 shadow-sm transition-opacity hover:bg-primary hover:text-primary-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/add:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
