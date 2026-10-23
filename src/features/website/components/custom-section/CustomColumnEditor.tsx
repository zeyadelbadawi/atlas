/**
 * One column of the custom section editor (CMS phase 3c): its ordered
 * elements and the "Add element" menu.
 *
 * Each element is a collapsed row — its kind's icon and name, its words,
 * and whether it needs a fix — that opens to its fields, so twelve elements
 * never become one endless form. Reordering is by buttons (Move up / Move
 * down on the row; duplicate, move to another column and remove in its
 * menu), never by dragging only, so it works by keyboard, touch and screen
 * reader. Every control is at least 44px; focus stays on the control that
 * moved, or the row that was added.
 */
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Columns3,
  Copy,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@utils';
import type {
  CustomColumn,
  CustomElement,
  CustomElementKind,
  WebsitePage,
} from '@types';
import {
  CUSTOM_ELEMENT_KINDS,
  MAX_CUSTOM_ELEMENTS_PER_COLUMN,
} from '@/features/website/constants/website.constants';
import type { FieldErrorLookup } from '../SectionButtonsEditor';
import {
  CUSTOM_ELEMENT_META,
  customElementIssuePaths,
  customElementSummary,
} from './custom-elements';
import { CustomElementFields } from './CustomElementFields';

export interface CustomColumnEditorProps {
  readonly column: CustomColumn;
  readonly columnIndex: number;
  readonly columnCount: number;
  /** Which element is open (one at a time across the section). */
  readonly openId: string | null;
  readonly onOpen: (id: string | null) => void;
  readonly onChange: (elements: CustomElement[]) => void;
  /** Adds an element at the column's end; returns its id. */
  readonly onAdd: (kind: CustomElementKind) => string;
  /** Returns the copy's id. */
  readonly onDuplicate: (index: number) => string;
  readonly onMoveToColumn: (index: number, targetColumn: number) => void;
  /** Whether another column has room for one more element. */
  readonly canReceive: (columnIndex: number) => boolean;
  /** Gated: a message only once the field may show it. */
  readonly errorFor: FieldErrorLookup;
  /** Ungated: whether an element has a problem at all (for its row's marker). */
  readonly hasIssue: (path: string) => boolean;
  readonly showIssues: (elementBase: string) => boolean;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
  readonly locale: 'en' | 'ar';
}

export function CustomColumnEditor({
  column,
  columnIndex,
  columnCount,
  openId,
  onOpen,
  onChange,
  onAdd,
  onDuplicate,
  onMoveToColumn,
  canReceive,
  errorFor,
  hasIssue,
  showIssues,
  pages,
  academyId,
  locale,
}: CustomColumnEditorProps): JSX.Element {
  const { t } = useTranslation();
  const headingId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const focusRequest = useRef<string | null>(null);
  // Where focus goes when a menu closes after its action (a new or copied
  // row, the next row after a removal), instead of a trigger that moved.
  const menuFocus = useRef<string | null>(null);
  const restoreMenuFocus = (event: Event) => {
    const selector = menuFocus.current;
    if (!selector) return;
    menuFocus.current = null;
    event.preventDefault();
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(selector)?.focus()
    );
  };
  const toggleOf = (id: string) =>
    `[data-element-id="${id}"] [data-element-toggle]`;
  const elements = column.elements;
  const full = elements.length >= MAX_CUSTOM_ELEMENTS_PER_COLUMN;
  const over = elements.length > MAX_CUSTOM_ELEMENTS_PER_COLUMN;
  const columnNumber = columnIndex + 1;

  // After a move, keep focus on a usable control of the row that moved.
  useEffect(() => {
    const request = focusRequest.current;
    if (!request || !listRef.current) return;
    focusRequest.current = null;
    const target = listRef.current.querySelector<HTMLElement>(request);
    target?.focus();
  });

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= elements.length) return;
    const next = [...elements];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const id = elements[index]!.id;
    const edge = target === 0 || target === elements.length - 1;
    focusRequest.current = `[data-element-id="${id}"] [data-move="${
      edge ? (by === -1 ? 'down' : 'up') : by === -1 ? 'up' : 'down'
    }"]`;
    onChange(next);
  };

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-md border border-border p-3"
      data-custom-column-editor={columnNumber}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h4 id={headingId} className="text-sm font-medium text-foreground">
          {columnCount > 1
            ? t('website:sectionEditors.custom.columnNumber', {
                number: columnNumber,
              })
            : t('website:sectionEditors.custom.elements')}
        </h4>
        <p
          className={cn(
            'text-xs tabular-nums',
            over ? 'font-medium text-destructive' : 'text-muted-foreground'
          )}
        >
          {t('website:sectionEditors.custom.count', {
            count: elements.length,
            max: MAX_CUSTOM_ELEMENTS_PER_COLUMN,
          })}
        </p>
      </div>

      {over ? (
        <p className="text-xs text-destructive" role="alert">
          {t('website:sectionEditors.custom.tooMany', {
            max: MAX_CUSTOM_ELEMENTS_PER_COLUMN,
          })}
        </p>
      ) : null}

      {elements.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          {t('website:sectionEditors.custom.emptyColumn')}
        </p>
      ) : (
        <ol ref={listRef} className="space-y-2">
          {elements.map((element, index) => {
            const meta = CUSTOM_ELEMENT_META[element.kind];
            const Icon = meta.icon;
            const kindLabel = t(meta.labelKey);
            const isOpen = openId === element.id;
            const base = `columns.${columnIndex}.elements.${index}`;
            const regionId = `${headingId}-element-${element.id}`;
            const summary = customElementSummary(element, locale);
            const name = summary ? `${kindLabel}: ${summary}` : kindLabel;
            const flagged =
              showIssues(base) &&
              customElementIssuePaths(element, base).some(hasIssue);
            return (
              <li
                key={element.id}
                data-element-id={element.id}
                data-element-kind={element.kind}
                className={cn(
                  'rounded-md border bg-card',
                  flagged ? 'border-destructive/60' : 'border-border'
                )}
              >
                <div className="flex items-center gap-1 p-1">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={regionId}
                    data-element-toggle=""
                    onClick={() => onOpen(isOpen ? null : element.id)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-start hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
                        isOpen && 'rotate-180'
                      )}
                    />
                    <Icon
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {kindLabel}
                      </span>
                      {flagged ? (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle
                            aria-hidden
                            className="size-3.5 shrink-0"
                          />
                          {t('website:sectionEditors.custom.needsAttention')}
                        </span>
                      ) : summary ? (
                        <span
                          className="block truncate text-xs text-muted-foreground"
                          dir="auto"
                        >
                          {summary}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    data-move="up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={t('website:sectionEditors.custom.moveUp', {
                      name,
                    })}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    data-move="down"
                    disabled={index === elements.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={t('website:sectionEditors.custom.moveDown', {
                      name,
                    })}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 shrink-0"
                        aria-label={t('website:sectionEditors.custom.more', {
                          name,
                        })}
                      >
                        <MoreVertical className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onCloseAutoFocus={restoreMenuFocus}
                    >
                      <DropdownMenuItem
                        className="min-h-11 gap-2"
                        disabled={full}
                        onSelect={() => {
                          menuFocus.current = toggleOf(onDuplicate(index));
                        }}
                      >
                        <Copy className="size-4" aria-hidden />
                        {t('website:sectionEditors.custom.duplicate')}
                      </DropdownMenuItem>
                      {Array.from({ length: columnCount }, (_, target) =>
                        target === columnIndex ? null : (
                          <DropdownMenuItem
                            className="min-h-11 gap-2"
                            key={target}
                            disabled={!canReceive(target)}
                            onSelect={() => {
                              menuFocus.current = toggleOf(element.id);
                              onMoveToColumn(index, target);
                            }}
                          >
                            <Columns3 className="size-4" aria-hidden />
                            {t('website:sectionEditors.custom.moveToColumn', {
                              number: target + 1,
                            })}
                          </DropdownMenuItem>
                        )
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="min-h-11 gap-2 text-destructive focus:text-destructive"
                        onSelect={() => {
                          const neighbour =
                            elements[index + 1] ?? elements[index - 1];
                          menuFocus.current = neighbour
                            ? toggleOf(neighbour.id)
                            : `[data-testid="custom-add-element-${columnNumber}"]`;
                          onChange(
                            elements.filter((_, position) => position !== index)
                          );
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        {t('website:sectionEditors.custom.remove')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {isOpen ? (
                  <div
                    id={regionId}
                    role="group"
                    aria-label={name}
                    className="space-y-4 border-t border-border p-3"
                  >
                    <CustomElementFields
                      element={element}
                      base={base}
                      fieldId={`custom-${element.id}`}
                      onChange={(next) =>
                        onChange(
                          elements.map((candidate, position) =>
                            position === index ? next : candidate
                          )
                        )
                      }
                      errorFor={errorFor}
                      pages={pages}
                      academyId={academyId}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full border-dashed"
            disabled={full}
            data-testid={`custom-add-element-${columnNumber}`}
          >
            <Plus className="size-4" aria-hidden />
            {full
              ? t('website:sectionEditors.custom.full', {
                  max: MAX_CUSTOM_ELEMENTS_PER_COLUMN,
                })
              : columnCount > 1
                ? t('website:sectionEditors.custom.addToColumn', {
                    number: columnNumber,
                  })
                : t('website:sectionEditors.custom.add')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56"
          onCloseAutoFocus={restoreMenuFocus}
        >
          {CUSTOM_ELEMENT_KINDS.map((kind) => {
            const { icon: Icon, labelKey } = CUSTOM_ELEMENT_META[kind];
            return (
              <DropdownMenuItem
                className="min-h-11 gap-2"
                key={kind}
                data-element-kind-option={kind}
                onSelect={() => {
                  menuFocus.current = toggleOf(onAdd(kind));
                }}
              >
                <Icon className="size-4" aria-hidden />
                {t(labelKey)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </section>
  );
}
