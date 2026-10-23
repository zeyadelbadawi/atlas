/**
 * A comparison section's columns and rows (CMS phase 3d, batch C; field
 * kind `comparison`, editing the config's `columns` and `rows`).
 *
 * A grid of up to 4 × 15 cells is not edited as a grid: on a phone a table
 * of inputs is unusable. Instead (the pricing plans' pattern):
 *   - COLUMNS (2–4) are a short list, each its name in both languages and a
 *     "highlight this column" choice that keeps to one column.
 *   - ROWS (up to 15) are collapsed lines — the row's name and a summary of
 *     its values ("✓ · ✗ · Same day") — that open one at a time. Inside, the
 *     row's name, then one small group per column, stacked: Yes / No / Text
 *     as three 44px toggles, and the text in both languages when chosen.
 * Moving uses buttons (keyboard and touch, no dragging). Removing a column
 * also removes its cells from every row, so no cell ever names a column
 * that is gone. A problem inside a closed row opens it, so the field to fix
 * is on screen.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@utils';
import type {
  ComparisonCell,
  ComparisonColumn,
  ComparisonRow,
  LocalizedText,
} from '@types';
import {
  MAX_COMPARISON_CELL_TEXT_LENGTH,
  MAX_COMPARISON_COLUMN_LABEL_LENGTH,
  MAX_COMPARISON_COLUMNS,
  MAX_COMPARISON_ROW_LABEL_LENGTH,
  MAX_COMPARISON_ROWS,
  MIN_COMPARISON_COLUMNS,
} from '../constants/website.constants';
import {
  EMPTY_LOCALIZED_TEXT,
  resolveLocalizedText,
} from '../utils/localized-text.utils';
import { LocalizedTextField } from './LocalizedTextField';
import { localizedErrors, type FieldErrorLookup } from './SectionButtonsEditor';

type DraftColumn = Partial<ComparisonColumn> & { readonly id: string };
type DraftRow = Partial<ComparisonRow> & { readonly id: string };
type CellChoice = ComparisonCell['value'];

/**
 * How the form's summary names a problem under `columns` or `rows`:
 * `rows.2.cells.1.text` → "Row 3 · Cell text".
 */
export function resolveComparisonIssue(
  head: string,
  rest: readonly string[]
): {
  readonly labelKeys: readonly string[];
  readonly itemNumber?: number;
  readonly maxLength?: number;
} {
  const [index, part] = rest;
  const number = Number(index);
  if (!Number.isInteger(number)) {
    return {
      labelKeys: [
        head === 'rows'
          ? 'website:sectionEditors.comparison.rows'
          : 'website:sectionEditors.comparison.columns',
      ],
    };
  }
  if (head === 'rows') {
    return part === 'cells'
      ? {
          labelKeys: [
            'website:sectionEditors.comparison.row',
            'website:sectionEditors.comparison.cellText',
          ],
          itemNumber: number + 1,
          maxLength: MAX_COMPARISON_CELL_TEXT_LENGTH,
        }
      : {
          labelKeys: [
            'website:sectionEditors.comparison.row',
            'website:sectionEditors.comparison.rowLabel',
          ],
          itemNumber: number + 1,
          maxLength: MAX_COMPARISON_ROW_LABEL_LENGTH,
        };
  }
  return {
    labelKeys: [
      'website:sectionEditors.comparison.column',
      'website:sectionEditors.comparison.columnLabel',
    ],
    itemNumber: number + 1,
    maxLength: MAX_COMPARISON_COLUMN_LABEL_LENGTH,
  };
}

/** Every path inside one row that can carry a problem. */
function rowIssuePaths(row: DraftRow, index: number): string[] {
  const base = `rows.${index}`;
  return [
    `${base}.label.en`,
    `${base}.label.ar`,
    ...(row.cells ?? []).flatMap((_, cellIndex) => [
      `${base}.cells.${cellIndex}.text.en`,
      `${base}.cells.${cellIndex}.text.ar`,
      `${base}.cells.${cellIndex}.column`,
    ]),
  ];
}

export function ComparisonGridEditor({
  labelKey,
  columns: columnsValue,
  rows: rowsValue,
  onChange,
  errorFor,
}: {
  readonly labelKey: string;
  readonly columns: readonly DraftColumn[] | undefined;
  readonly rows: readonly DraftRow[] | undefined;
  readonly onChange: (patch: {
    columns?: DraftColumn[];
    rows?: DraftRow[];
  }) => void;
  readonly errorFor: FieldErrorLookup;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const columns = columnsValue ?? [];
  const rows = rowsValue ?? [];
  const locale = i18n.language === 'ar' ? 'ar' : 'en';
  const [open, setOpen] = useState<number | null>(null);
  const columnName = (column: DraftColumn, index: number) =>
    resolveLocalizedText(column.label, locale).trim() ||
    t('website:sectionEditors.comparison.untitledColumn', {
      number: index + 1,
    });
  const issueAt = (index: number) =>
    rowIssuePaths(rows[index]!, index).some(
      (path) => !!errorFor(path, labelKey)
    );
  const firstIssue = rows.findIndex((_, index) => issueAt(index));
  useEffect(() => {
    if (firstIssue !== -1) setOpen(firstIssue);
  }, [firstIssue]);

  const writeColumns = (next: DraftColumn[]) => onChange({ columns: next });
  const writeRows = (next: DraftRow[]) => onChange({ rows: next });

  const moveIn = <T,>(list: readonly T[], index: number, by: -1 | 1): T[] => {
    const next = [...list];
    const target = index + by;
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next;
  };

  const setHighlighted = (index: number, highlighted: boolean) =>
    writeColumns(
      columns.map((column, position) => {
        if (position === index) return { ...column, highlighted };
        if (!highlighted || !column.highlighted) return column;
        const rest = { ...column };
        delete rest.highlighted;
        return rest;
      })
    );

  const removeColumn = (index: number) => {
    const gone = columns[index]!.id;
    onChange({
      columns: columns.filter((_, position) => position !== index),
      rows: rows.map((row) => ({
        ...row,
        cells: (row.cells ?? []).filter((cell) => cell.column !== gone),
      })),
    });
  };

  const setCell = (
    rowIndex: number,
    columnId: string,
    cell: ComparisonCell | undefined
  ) =>
    writeRows(
      rows.map((row, position) => {
        if (position !== rowIndex) return row;
        const others = (row.cells ?? []).filter(
          (candidate) => candidate.column !== columnId
        );
        // Kept in column order, so the stored row reads like the table.
        const next = cell ? [...others, cell] : others;
        const order = columns.map((column) => column.id);
        next.sort((a, b) => order.indexOf(a.column) - order.indexOf(b.column));
        return { ...row, cells: next };
      })
    );

  const summary = (row: DraftRow) =>
    columns
      .map((column) => {
        const cell = row.cells?.find(
          (candidate) => candidate.column === column.id
        );
        if (!cell) return '–';
        if (cell.value === 'text') {
          return resolveLocalizedText(cell.text, locale) || '…';
        }
        return cell.value === 'yes' ? '✓' : '✗';
      })
      .join(' · ');

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-md border border-border p-3"
      data-testid="comparison-grid"
    >
      <h3 id={headingId} className="text-sm font-medium text-foreground">
        {t(labelKey)}
      </h3>

      {/* Columns */}
      <fieldset className="space-y-3">
        <legend className="flex w-full items-baseline justify-between gap-3 text-sm font-medium text-foreground">
          {t('website:sectionEditors.comparison.columns')}
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {t('website:sectionEditors.comparison.columnsCount', {
              count: columns.length,
              max: MAX_COMPARISON_COLUMNS,
            })}
          </span>
        </legend>
        <ol className="space-y-2">
          {columns.map((column, index) => {
            const name = columnName(column, index);
            const highlightId = `${headingId}-column-${index}-highlight`;
            return (
              <li
                key={column.id}
                data-column-index={index}
                className="space-y-3 rounded-md border border-border bg-card p-3"
              >
                <div className="flex items-center gap-1">
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                    {t('website:sectionEditors.comparison.column')} {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    disabled={index === 0}
                    onClick={() => writeColumns(moveIn(columns, index, -1))}
                    aria-label={t(
                      'website:sectionEditors.comparison.moveColumnUp',
                      {
                        name,
                      }
                    )}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    disabled={index === columns.length - 1}
                    onClick={() => writeColumns(moveIn(columns, index, 1))}
                    aria-label={t(
                      'website:sectionEditors.comparison.moveColumnDown',
                      { name }
                    )}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={columns.length <= MIN_COMPARISON_COLUMNS}
                    onClick={() => removeColumn(index)}
                    aria-label={t(
                      'website:sectionEditors.comparison.removeColumn',
                      { name }
                    )}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                <LocalizedTextField
                  id={`comparison-column-${index}`}
                  labelKey="website:sectionEditors.comparison.columnLabel"
                  value={column.label}
                  onChange={(label) =>
                    writeColumns(
                      columns.map((candidate, position) =>
                        position === index ? { ...candidate, label } : candidate
                      )
                    )
                  }
                  required
                  maxLength={MAX_COMPARISON_COLUMN_LABEL_LENGTH}
                  errors={localizedErrors(
                    errorFor,
                    `columns.${index}.label`,
                    'website:sectionEditors.comparison.columnLabel',
                    MAX_COMPARISON_COLUMN_LABEL_LENGTH
                  )}
                />
                <label
                  htmlFor={highlightId}
                  className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={highlightId}
                    checked={column.highlighted === true}
                    onCheckedChange={(checked) =>
                      setHighlighted(index, checked === true)
                    }
                  />
                  {t('website:sectionEditors.comparison.highlight')}
                </label>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted-foreground">
          {t('website:sectionEditors.comparison.columnsHint', {
            min: MIN_COMPARISON_COLUMNS,
            max: MAX_COMPARISON_COLUMNS,
          })}
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full border-dashed"
          disabled={columns.length >= MAX_COMPARISON_COLUMNS}
          onClick={() =>
            writeColumns([
              ...columns,
              { id: crypto.randomUUID(), label: EMPTY_LOCALIZED_TEXT },
            ])
          }
          data-testid="comparison-add-column"
        >
          <Plus className="size-4" aria-hidden />
          {columns.length >= MAX_COMPARISON_COLUMNS
            ? t('website:sectionEditors.comparison.columnsFull', {
                max: MAX_COMPARISON_COLUMNS,
              })
            : t('website:sectionEditors.comparison.addColumn')}
        </Button>
      </fieldset>

      {/* Rows */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            {t('website:sectionEditors.comparison.rows')}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {t('website:sectionEditors.comparison.rowsCount', {
              count: rows.length,
              max: MAX_COMPARISON_ROWS,
            })}
          </p>
        </div>
        <ol className="space-y-2">
          {rows.map((row, index) => {
            const isOpen = open === index;
            const regionId = `${headingId}-row-${index}`;
            const name =
              resolveLocalizedText(row.label, locale).trim() ||
              t('website:sectionEditors.comparison.untitledRow', {
                number: index + 1,
              });
            const hasIssue = issueAt(index);
            return (
              <li
                key={row.id}
                data-row-index={index}
                className={cn(
                  'rounded-md border bg-card',
                  hasIssue ? 'border-destructive/60' : 'border-border'
                )}
              >
                <div className="flex items-center gap-1 p-1">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={regionId}
                    onClick={() => setOpen(isOpen ? null : index)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-start hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
                        isOpen && 'rotate-180'
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {name}
                      </span>
                      {hasIssue ? (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle
                            aria-hidden
                            className="size-3.5 shrink-0"
                          />
                          {t(
                            'website:sectionEditors.comparison.needsAttention'
                          )}
                        </span>
                      ) : (
                        <span
                          className="block truncate text-xs text-muted-foreground"
                          dir="auto"
                        >
                          {summary(row)}
                        </span>
                      )}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    disabled={index === 0}
                    onClick={() => {
                      writeRows(moveIn(rows, index, -1));
                      if (open === index) setOpen(index - 1);
                      else if (open === index - 1) setOpen(index);
                    }}
                    aria-label={t(
                      'website:sectionEditors.comparison.moveRowUp',
                      {
                        name,
                      }
                    )}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    disabled={index === rows.length - 1}
                    onClick={() => {
                      writeRows(moveIn(rows, index, 1));
                      if (open === index) setOpen(index + 1);
                      else if (open === index + 1) setOpen(index);
                    }}
                    aria-label={t(
                      'website:sectionEditors.comparison.moveRowDown',
                      { name }
                    )}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      writeRows(
                        rows.filter((_, position) => position !== index)
                      );
                      setOpen(null);
                    }}
                    aria-label={t(
                      'website:sectionEditors.comparison.removeRow',
                      {
                        name,
                      }
                    )}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                {isOpen ? (
                  <div
                    id={regionId}
                    className="space-y-4 border-t border-border p-3"
                  >
                    <LocalizedTextField
                      id={`comparison-row-${index}`}
                      labelKey="website:sectionEditors.comparison.rowLabel"
                      value={row.label}
                      onChange={(label) =>
                        writeRows(
                          rows.map((candidate, position) =>
                            position === index
                              ? { ...candidate, label }
                              : candidate
                          )
                        )
                      }
                      required
                      maxLength={MAX_COMPARISON_ROW_LABEL_LENGTH}
                      errors={localizedErrors(
                        errorFor,
                        `rows.${index}.label`,
                        'website:sectionEditors.comparison.rowLabel',
                        MAX_COMPARISON_ROW_LABEL_LENGTH
                      )}
                    />
                    {columns.map((column, columnIndex) => (
                      <CellEditor
                        key={column.id}
                        idBase={`comparison-row-${index}-cell-${columnIndex}`}
                        columnName={columnName(column, columnIndex)}
                        cell={row.cells?.find(
                          (candidate) => candidate.column === column.id
                        )}
                        cellIndex={(row.cells ?? []).findIndex(
                          (candidate) => candidate.column === column.id
                        )}
                        rowIndex={index}
                        errorFor={errorFor}
                        onChange={(cell) => setCell(index, column.id, cell)}
                        columnId={column.id}
                      />
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('website:sectionEditors.comparison.noRows')}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full border-dashed"
          disabled={rows.length >= MAX_COMPARISON_ROWS}
          onClick={() => {
            writeRows([
              ...rows,
              {
                id: crypto.randomUUID(),
                label: EMPTY_LOCALIZED_TEXT,
                cells: [],
              },
            ]);
            setOpen(rows.length);
          }}
          data-testid="comparison-add-row"
        >
          <Plus className="size-4" aria-hidden />
          {rows.length >= MAX_COMPARISON_ROWS
            ? t('website:sectionEditors.comparison.rowsFull', {
                max: MAX_COMPARISON_ROWS,
              })
            : t('website:sectionEditors.comparison.addRow')}
        </Button>
      </div>
    </section>
  );
}

const CHOICES: readonly CellChoice[] = ['yes', 'no', 'text'];

/** One row's value in one column: ✓ / ✗ / text, or nothing yet (a dash). */
function CellEditor({
  idBase,
  columnName,
  columnId,
  cell,
  cellIndex,
  rowIndex,
  errorFor,
  onChange,
}: {
  readonly idBase: string;
  readonly columnName: string;
  readonly columnId: string;
  readonly cell: ComparisonCell | undefined;
  /** The cell's place in the row's stored cells (for its problems), -1 when unset. */
  readonly cellIndex: number;
  readonly rowIndex: number;
  readonly errorFor: FieldErrorLookup;
  readonly onChange: (cell: ComparisonCell | undefined) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const legendId = `${idBase}-legend`;
  const text = cell?.value === 'text' ? cell.text : undefined;
  const choose = (value: CellChoice | '') => {
    if (!value) return;
    if (value === 'text') {
      onChange({
        column: columnId,
        value,
        text: (text as LocalizedText | undefined) ?? EMPTY_LOCALIZED_TEXT,
      });
    } else {
      onChange({ column: columnId, value });
    }
  };

  return (
    <fieldset className="space-y-2 rounded-md border border-border p-3">
      <legend id={legendId} className="px-1 text-sm font-medium" dir="auto">
        {columnName}
      </legend>
      <ToggleGroup
        type="single"
        aria-labelledby={legendId}
        value={cell?.value ?? ''}
        onValueChange={(next) => choose(next as CellChoice | '')}
        className="grid grid-cols-3 gap-2"
      >
        {CHOICES.map((choice) => (
          <ToggleGroupItem
            key={choice}
            value={choice}
            data-cell-choice={choice}
            className="min-h-11 border border-border text-sm data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
          >
            {t(`website:sectionEditors.comparison.choices.${choice}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {cell ? null : (
        <p className="text-xs text-muted-foreground">
          {t('website:sectionEditors.comparison.cellUnset')}
        </p>
      )}
      {cell?.value === 'text' ? (
        <LocalizedTextField
          id={`${idBase}-text`}
          labelKey="website:sectionEditors.comparison.cellText"
          value={text}
          onChange={(next) =>
            onChange({ column: columnId, value: 'text', text: next })
          }
          required
          maxLength={MAX_COMPARISON_CELL_TEXT_LENGTH}
          errors={localizedErrors(
            errorFor,
            `rows.${rowIndex}.cells.${cellIndex}.text`,
            'website:sectionEditors.comparison.cellText',
            MAX_COMPARISON_CELL_TEXT_LENGTH
          )}
        />
      ) : null}
      {cell && cellIndex >= 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 text-muted-foreground"
          onClick={() => onChange(undefined)}
        >
          {t('website:sectionEditors.comparison.clearCell')}
        </Button>
      ) : null}
    </fieldset>
  );
}
