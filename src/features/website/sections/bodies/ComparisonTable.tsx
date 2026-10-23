/**
 * CMS phase 3d (batch C) — the comparison section's shared body.
 *
 * - Desktop (`md` and up): a real `<table>`: the section title as its
 *   caption, the columns as `<th scope="col">`, each row's label as
 *   `<th scope="row">`. ✓ and ✗ are icons with their word for screen
 *   readers ("Yes" / "No"), never icon-only; a cell the Owner left empty is
 *   a dash read as "Not specified". The highlighted column is tinted, its
 *   header carries a marker bar, and its header says "highlighted" to
 *   screen readers as well.
 * - Phones: one card per row — the row's label, then each column's name and
 *   value as a definition list — so every criterion is still compared side
 *   by side, with nothing to scroll sideways (the ui-ux-pro-max table rule:
 *   cards, not an overflowing table).
 * Only one of the two is displayed at a width (`display: none` hides the
 * other from assistive technology too).
 */
import { useTranslation } from 'react-i18next';
import { Check, Minus, X } from 'lucide-react';
import { cn } from '@utils';
import type {
  ResolvedComparison,
  ResolvedComparisonValue,
} from './comparison.logic';

export interface ComparisonTableClasses {
  readonly table?: string;
  /** The empty corner header and every column header. */
  readonly columnHeader?: string;
  /** Added to the highlighted column's header. */
  readonly highlightHeader?: string;
  readonly rowHeader?: string;
  readonly cell?: string;
  /** Added to every cell of the highlighted column. */
  readonly highlightCell?: string;
  /** A row's `<tr>` (e.g. a rule between rows). */
  readonly row?: string;
  /** The ✓ mark's tile, the ✗ mark's tile and the dash. */
  readonly yesMark?: string;
  readonly noMark?: string;
  readonly emptyMark?: string;
  /** A short text cell. */
  readonly text?: string;
  readonly card?: string;
  readonly cardTitle?: string;
  /** One column's line inside a card. */
  readonly cardLine?: string;
  /** Added to the highlighted column's line inside a card. */
  readonly cardLineHighlight?: string;
  readonly cardTerm?: string;
}

function Value({
  value,
  classes,
}: {
  readonly value: ResolvedComparisonValue;
  readonly classes: ComparisonTableClasses;
}): JSX.Element {
  const { t } = useTranslation();
  if (value.kind === 'text') {
    return (
      <span className={cn('break-words', classes.text)}>{value.text}</span>
    );
  }
  const Icon = value.kind === 'yes' ? Check : value.kind === 'no' ? X : Minus;
  const markClass =
    value.kind === 'yes'
      ? classes.yesMark
      : value.kind === 'no'
        ? classes.noMark
        : classes.emptyMark;
  return (
    <span
      className="inline-flex items-center"
      data-comparison-value={value.kind}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
          markClass
        )}
      >
        <Icon className="size-4" strokeWidth={2.5} />
      </span>
      <span className="sr-only">
        {t(`website:renderer.comparison.${value.kind}`)}
      </span>
    </span>
  );
}

export function ComparisonTable({
  comparison,
  caption,
  classes = {},
}: {
  readonly comparison: ResolvedComparison;
  /** The table's accessible name (the section title). */
  readonly caption: string;
  readonly classes?: ComparisonTableClasses;
}): JSX.Element {
  const { t } = useTranslation();
  const { columns, rows } = comparison;
  const highlighted = (index: number) => columns[index]?.highlighted === true;

  return (
    <div data-comparison="">
      <table
        className={cn(
          'hidden w-full table-fixed border-collapse text-start md:table',
          classes.table
        )}
      >
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            <th
              scope="col"
              className={cn(
                'w-[34%] px-5 py-4 text-start align-bottom',
                classes.columnHeader
              )}
            >
              <span className="sr-only">
                {t('website:renderer.comparison.criterion')}
              </span>
            </th>
            {columns.map((column, index) => (
              <th
                key={column.id}
                scope="col"
                data-highlighted={column.highlighted ? '' : undefined}
                className={cn(
                  'break-words px-5 py-4 text-center align-bottom',
                  classes.columnHeader,
                  highlighted(index) && classes.highlightHeader
                )}
              >
                {column.label}
                {column.highlighted ? (
                  <span className="sr-only">
                    {' '}
                    ({t('website:renderer.comparison.highlighted')})
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={classes.row}>
              <th
                scope="row"
                className={cn(
                  'break-words px-5 py-4 text-start align-middle',
                  classes.rowHeader
                )}
              >
                {row.label}
              </th>
              {row.values.map((value, index) => (
                <td
                  key={columns[index]!.id}
                  className={cn(
                    'px-5 py-4 text-center align-middle',
                    classes.cell,
                    highlighted(index) && classes.highlightCell
                  )}
                >
                  <Value value={value} classes={classes} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul role="list" className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className={cn('min-w-0 p-4', classes.card)}>
            <h3 className={cn('break-words', classes.cardTitle)}>
              {row.label}
            </h3>
            <dl className="mt-3 space-y-2">
              {row.values.map((value, index) => (
                <div
                  key={columns[index]!.id}
                  data-highlighted={highlighted(index) ? '' : undefined}
                  className={cn(
                    'flex min-h-11 items-center justify-between gap-4',
                    classes.cardLine,
                    highlighted(index) && classes.cardLineHighlight
                  )}
                >
                  <dt className={cn('min-w-0 break-words', classes.cardTerm)}>
                    {columns[index]!.label}
                  </dt>
                  <dd className="min-w-0 text-end">
                    <Value value={value} classes={classes} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
