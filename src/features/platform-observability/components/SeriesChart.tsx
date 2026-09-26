/**
 * A time-series line chart for one or more label sets, with a legend, a
 * crosshair tooltip listing every series, and a table view.
 *
 * Honesty rules:
 *   - A `null` point is a GAP in the line (`connectNulls={false}`), never
 *     a drop to zero, and "Not reported" in the tooltip and the table.
 *   - No series → an explicit "no data points in this period" state.
 *
 * Direction: time runs with the reading direction — in Arabic the x-axis
 * is reversed and the value axis moves to the right-hand side.
 */
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartLine, Table2 } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { formatDate } from '@utils';
import type { LanguageCode, MetricRange, Series } from '@types';
import {
  describeLabels,
  formatUnitValue,
  type ValueUnit,
} from '../utils/observability-format';
import { MAX_CHART_SERIES, SERIES_PALETTE } from '../utils/series-palette';

export interface SeriesChartProps {
  readonly series: readonly Series[];
  readonly unit: ValueUnit;
  readonly range: MetricRange;
  /** Accessible name of the chart and caption of its table. */
  readonly title: string;
  /** Dims the chart while a new window loads, instead of a skeleton flash. */
  readonly isRefreshing?: boolean;
}

/**
 * Declares the validated palette as custom properties, with its own dark
 * steps under the dashboard's `.dark` class (selected, not auto-flipped).
 */
const PALETTE_CSS = [
  `.obs-series-scope{${SERIES_PALETTE.map((c, i) => `--obs-series-${i}:${c.light};`).join('')}}`,
  `.dark .obs-series-scope{${SERIES_PALETTE.map((c, i) => `--obs-series-${i}:${c.dark};`).join('')}}`,
].join('');

function SeriesPaletteStyle(): JSX.Element {
  return <style>{PALETTE_CSS}</style>;
}

interface Row {
  readonly t: number;
  readonly [seriesKey: string]: number | null;
}

/** Label keys whose values actually differ between series — the rest is noise. */
function distinguishingKeys(series: readonly Series[]): readonly string[] {
  if (series.length < 2) return [];
  const keys = new Set(series.flatMap((s) => Object.keys(s.labels)));
  return [...keys].filter(
    (key) => new Set(series.map((s) => s.labels[key] ?? '')).size > 1
  );
}

function seriesName(
  series: Series,
  keys: readonly string[],
  fallback: string
): string {
  if (keys.length === 0) return fallback;
  const picked = Object.fromEntries(
    keys.filter((k) => k in series.labels).map((k) => [k, series.labels[k]])
  );
  return describeLabels(picked) || fallback;
}

function tickFormat(range: MetricRange): 'time' | 'short' {
  return range === '1h' || range === '6h' || range === '24h' ? 'time' : 'short';
}

export function SeriesChart({
  series,
  unit,
  range,
  title,
  isRefreshing = false,
}: SeriesChartProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const isRtl = i18n.dir(i18n.language) === 'rtl';
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  const keys = useMemo(() => distinguishingKeys(series), [series]);
  const names = useMemo(
    () =>
      series.map((s, index) =>
        seriesName(
          s,
          keys,
          series.length === 1
            ? title
            : t('platformObservability:chart.seriesFallback', {
                index: index + 1,
              })
        )
      ),
    [series, keys, title, t]
  );

  const rows = useMemo<readonly Row[]>(() => {
    const byTime = new Map<number, Record<string, number | null>>();
    series.forEach((s, index) => {
      for (const point of s.points) {
        const time = Date.parse(point.t);
        if (!Number.isFinite(time)) continue;
        const row = byTime.get(time) ?? {};
        row[`s${index}`] =
          typeof point.v === 'number' && Number.isFinite(point.v)
            ? point.v
            : null;
        byTime.set(time, row);
      }
    });
    return [...byTime.entries()]
      .sort(([a], [b]) => a - b)
      .map(([time, values]) => ({ t: time, ...values }) as Row);
  }, [series]);

  const charted = series.slice(0, MAX_CHART_SERIES);
  const overflow = series.length - charted.length;

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        charted.map((_, index) => [
          `s${index}`,
          { label: names[index], color: `var(--obs-series-${index})` },
        ])
      ),
    [charted, names]
  );

  const format = (value: number | null | undefined, compact = false) =>
    formatUnitValue(value ?? null, unit, language, t, { compact }) ??
    t('platformObservability:values.notReported');

  const formatTime = (time: number, full = false) =>
    formatDate(
      time,
      language,
      full ? 'dateTime' : tickFormat(range) === 'time' ? 'time' : 'short'
    );

  if (series.length === 0 || rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {t('platformObservability:chart.noData')}
      </p>
    );
  }

  return (
    <figure className="obs-series-scope space-y-3">
      <SeriesPaletteStyle />
      <figcaption className="sr-only">{title}</figcaption>
      <div className="flex flex-wrap items-start justify-between gap-2">
        {charted.length > 1 ? (
          <ul
            className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
            aria-label={t('platformObservability:chart.legend')}
          >
            {charted.map((_, index) => (
              <li key={index} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-0.5 w-3 rounded-full"
                  style={{
                    backgroundColor: `var(--obs-series-${index})`,
                  }}
                />
                <span dir="auto">{names[index]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((value) => !value)}
        >
          {showTable ? (
            <ChartLine className="size-3.5" aria-hidden />
          ) : (
            <Table2 className="size-3.5" aria-hidden />
          )}
          {showTable
            ? t('platformObservability:chart.showChart')
            : t('platformObservability:chart.showTable')}
        </Button>
      </div>

      {showTable ? (
        <div
          id={tableId}
          className="max-h-72 overflow-auto rounded-md border border-border"
        >
          <table className="w-full text-xs">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t('platformObservability:chart.time')}
                </th>
                {series.map((_, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="px-3 py-2 text-end font-medium"
                    dir="auto"
                  >
                    {names[index]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.t}>
                  <th
                    scope="row"
                    className="whitespace-nowrap px-3 py-1.5 text-start font-normal tabular-nums"
                  >
                    {formatTime(row.t, true)}
                  </th>
                  {series.map((_, index) => (
                    <td
                      key={index}
                      className="whitespace-nowrap px-3 py-1.5 text-end tabular-nums"
                      data-atlas-numeric="true"
                    >
                      {format(row[`s${index}`])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          id={tableId}
          role="img"
          aria-label={t('platformObservability:chart.ariaLabel', {
            title,
            count: series.length,
          })}
          className={isRefreshing ? 'opacity-60 transition-opacity' : undefined}
        >
          <ChartContainer config={config} className="aspect-auto h-56 w-full">
            <LineChart
              data={rows as Row[]}
              margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
            >
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                reversed={isRtl}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border-strong))' }}
                tickFormatter={(value: number) => formatTime(value)}
                minTickGap={32}
              />
              <YAxis
                orientation={isRtl ? 'right' : 'left'}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value: number) => format(value, true)}
              />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--border-strong))', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="min-w-40 space-y-1 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                      <p className="text-muted-foreground">
                        {formatTime(Number(label), true)}
                      </p>
                      {charted.map((_, index) => {
                        const row = payload[0]?.payload as Row | undefined;
                        return (
                          <p key={index} className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className="h-0.5 w-3 shrink-0 rounded-full"
                              style={{
                                backgroundColor: `var(--obs-series-${index})`,
                              }}
                            />
                            <span className="font-semibold tabular-nums text-foreground">
                              {format(row?.[`s${index}`])}
                            </span>
                            {charted.length > 1 ? (
                              <span
                                className="truncate text-muted-foreground"
                                dir="auto"
                              >
                                {names[index]}
                              </span>
                            ) : null}
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {charted.map((_, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={`s${index}`}
                  name={names[index]}
                  stroke={`var(--obs-series-${index})`}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: 'hsl(var(--card))',
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>
      )}

      {overflow > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t('platformObservability:chart.moreSeries', { count: overflow })}
        </p>
      ) : null}
    </figure>
  );
}
