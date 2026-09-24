/**
 * Reporting primitives shared by the P64 Phase 4 operational pages
 * (Commerce, Content delivery).
 *
 * Small on purpose: a headline tile, a "label · count · share" breakdown
 * table, a report section card, a capped-list notice and a generated-at
 * line. The dashboard's `MetricCard` is deliberately NOT reused for the
 * tiles because these need a hint line under the value ("current backlog",
 * "p50 · p95 of 120 approvals") and no trend arrow — the platform-metrics
 * endpoints answer a single window with no comparison period.
 *
 * Accessibility rules the pages rely on:
 *   - Every number is printed; bars only restate it (never colour-only).
 *   - Breakdowns are real `<table>`s with row headers, not styled divs.
 *   - A truncated notice is `role="status"` so it is announced once.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@utils';
import { cn } from '@utils';
import type { LanguageCode } from '@types';

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

export interface StatTileProps {
  readonly label: string;
  /** Pre-formatted value. */
  readonly value: string;
  /** One line of context under the value. */
  readonly hint?: string;
  readonly icon?: LucideIcon;
  /** Marks the tile as attention-worthy — in words via `hint`, never alone. */
  readonly emphasis?: 'default' | 'warning';
  readonly className?: string;
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  emphasis = 'default',
  className,
}: StatTileProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5',
        emphasis === 'warning' && 'border-destructive/40',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground',
              emphasis === 'warning' && 'bg-destructive/10 text-destructive'
            )}
          >
            <Icon className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-1.5">
        <p
          className="font-display text-3xl font-semibold leading-none tabular-nums text-foreground"
          data-atlas-numeric="true"
        >
          {value}
        </p>
        {hint ? (
          <p
            className={cn(
              'text-xs text-muted-foreground',
              emphasis === 'warning' && 'font-medium text-destructive'
            )}
          >
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report section (a card whose title is an h2)
// ---------------------------------------------------------------------------

export interface ReportSectionProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function ReportSection({
  title,
  description,
  children,
}: ReportSectionProps): JSX.Element {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle as="h2">{title}</CardTitle>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Breakdown table
// ---------------------------------------------------------------------------

export interface BreakdownRow {
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

export interface BreakdownTableProps {
  readonly caption: string;
  readonly rows: readonly BreakdownRow[];
  /** Denominator for the share column; 0 renders every share as 0%. */
  readonly total: number;
  readonly columns: {
    readonly label: string;
    readonly count: string;
    readonly share: string;
  };
  readonly formatNumber: (value: number) => string;
  readonly formatShare: (ratio: number) => string;
  /** Row keys whose label should read as attention-worthy (in words + icon via `warningLabel`). */
  readonly warningKeys?: readonly string[];
}

/** Share of `value` within `total`, guarding 0 of 0 so it reads 0 rather than NaN. */
export function shareOf(value: number, total: number): number {
  return total === 0 ? 0 : value / total;
}

/** `Record<string, number>` → rows sorted by count, largest first, ties by key. */
export function toSortedRows(
  map: Readonly<Record<string, number>>
): readonly { readonly key: string; readonly value: number }[] {
  return Object.entries(map)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}

export function BreakdownTable({
  caption,
  rows,
  total,
  columns,
  formatNumber,
  formatShare,
  warningKeys = [],
}: BreakdownTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="pb-2 text-start font-medium">
              {columns.label}
            </th>
            <th scope="col" className="pb-2 text-end font-medium">
              {columns.count}
            </th>
            <th
              scope="col"
              className="w-1/3 pb-2 ps-4 text-end font-medium"
            >
              {columns.share}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const ratio = shareOf(row.value, total);
            const isWarning = warningKeys.includes(row.key) && row.value > 0;
            return (
              <tr key={row.key}>
                <th
                  scope="row"
                  className={cn(
                    'py-2.5 text-start font-normal text-foreground',
                    isWarning && 'font-medium text-destructive'
                  )}
                >
                  {row.label}
                </th>
                <td
                  className="py-2.5 text-end tabular-nums text-foreground"
                  data-atlas-numeric="true"
                >
                  {formatNumber(row.value)}
                </td>
                <td className="py-2.5 ps-4">
                  <div className="flex items-center justify-end gap-3">
                    <div
                      className="hidden h-2 flex-1 overflow-hidden rounded-full bg-muted sm:block"
                      role="presentation"
                    >
                      <div
                        className={cn(
                          'h-full rounded-full bg-primary',
                          isWarning && 'bg-destructive'
                        )}
                        style={{ inlineSize: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>
                    <span
                      className="w-12 shrink-0 text-end tabular-nums text-muted-foreground"
                      data-atlas-numeric="true"
                    >
                      {formatShare(ratio)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Key/value list (for a handful of named figures inside a section)
// ---------------------------------------------------------------------------

export interface FigureListItem {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}

export function FigureList({
  items,
}: {
  readonly items: readonly FigureListItem[];
}): JSX.Element {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.key} className="space-y-1">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className="text-xl font-semibold tabular-nums text-foreground"
            data-atlas-numeric="true"
          >
            {item.value}
          </dd>
          {item.hint ? (
            <dd className="text-xs text-muted-foreground">{item.hint}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Truncated notice + generated-at line
// ---------------------------------------------------------------------------

/** Says a list or sample was capped. A status so assistive tech announces it once. */
export function TruncatedNotice({
  show,
  message,
}: {
  readonly show: boolean;
  readonly message: string;
}): JSX.Element | null {
  if (!show) return null;
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
    >
      <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span>{message}</span>
    </p>
  );
}

export function GeneratedAt({
  timestamp,
  language,
}: {
  readonly timestamp: string;
  readonly language: LanguageCode;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-muted-foreground">
      {t('analytics:report.generatedAt', {
        time: formatDate(timestamp, language, 'dateTime'),
      })}
    </p>
  );
}
