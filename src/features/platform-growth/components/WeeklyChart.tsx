/**
 * G1 — the last 12 weeks (Saturday–Friday, Cairo): sign-ups, onboardings
 * and paid conversions per week. Accessible by construction:
 *   - each series has its own line style (solid / dashed / dotted) and
 *     marker shape as well as its own colour, and a visible legend that
 *     shows the same style, so nothing depends on colour alone;
 *   - a table view with the same numbers (toggle), and the chart's
 *     accessible name says so;
 *   - time runs with the reading direction (the x-axis is reversed and the
 *     value axis moves to the right in Arabic);
 *   - no animation (nothing to reduce for reduced-motion users).
 * Colours are the first three slots of the validated categorical palette
 * the monitoring charts use (light/dark steps), declared as custom
 * properties scoped to this chart.
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
import { useLanguage } from '@hooks';
import { formatNumber } from '@utils';
import type { CapacityWeek } from '../types';
import { K, formatDay } from '../utils/growth.utils';

const SERIES = [
  {
    key: 'signups',
    light: '#2a78d6',
    dark: '#3987e5',
    dash: undefined,
    shape: 'circle',
  },
  {
    key: 'onboardings',
    light: '#eb6834',
    dark: '#d95926',
    dash: '6 4',
    shape: 'square',
  },
  {
    key: 'paidConversions',
    light: '#1baf7a',
    dark: '#199e70',
    dash: '2 3',
    shape: 'diamond',
  },
] as const;
type SeriesKey = (typeof SERIES)[number]['key'];

const PALETTE_CSS = [
  `.growth-series-scope{${SERIES.map((s, i) => `--growth-series-${i}:${s.light};`).join('')}}`,
  `.dark .growth-series-scope{${SERIES.map((s, i) => `--growth-series-${i}:${s.dark};`).join('')}}`,
].join('');

function Marker({
  shape,
  cx,
  cy,
  color,
}: {
  readonly shape: (typeof SERIES)[number]['shape'];
  readonly cx?: number;
  readonly cy?: number;
  readonly color: string;
}): JSX.Element | null {
  if (cx === undefined || cy === undefined) return null;
  if (shape === 'square')
    return <rect x={cx - 3.5} y={cy - 3.5} width={7} height={7} fill={color} />;
  if (shape === 'diamond')
    return (
      <path
        d={`M${cx} ${cy - 4.5}L${cx + 4.5} ${cy}L${cx} ${cy + 4.5}L${cx - 4.5} ${cy}Z`}
        fill={color}
      />
    );
  return <circle cx={cx} cy={cy} r={3.5} fill={color} />;
}

function LegendSample({ index }: { readonly index: number }): JSX.Element {
  const series = SERIES[index];
  const color = `var(--growth-series-${index})`;
  return (
    <svg width="28" height="10" aria-hidden className="shrink-0">
      <line
        x1="1"
        y1="5"
        x2="27"
        y2="5"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={series.dash}
        strokeLinecap="round"
      />
      <Marker shape={series.shape} cx={14} cy={5} color={color} />
    </svg>
  );
}

export function WeeklyChart({
  weeks,
}: {
  readonly weeks: readonly CapacityWeek[];
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const isRtl = i18n.dir(i18n.language) === 'rtl';
  const [showTable, setShowTable] = useState(false);
  const viewId = useId();
  const n = (value: number) => formatNumber(value, language);
  const label = (key: SeriesKey) => t(`${K}capacity.chart.series.${key}`);
  const title = t(`${K}capacity.chart.title`);

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        SERIES.map((series, index) => [
          series.key,
          {
            label: t(`${K}capacity.chart.series.${series.key}`),
            color: `var(--growth-series-${index})`,
          },
        ])
      ),
    [t]
  );
  const rows = useMemo(() => weeks.map((week) => ({ ...week })), [weeks]);

  if (weeks.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {t(`${K}capacity.chart.empty`)}
      </p>
    );
  }

  return (
    <figure className="growth-series-scope space-y-3">
      <style>{PALETTE_CSS}</style>
      <figcaption className="sr-only">{title}</figcaption>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
          aria-label={t(`${K}capacity.chart.legend`)}
        >
          {SERIES.map((series, index) => (
            <li key={series.key} className="flex items-center gap-1.5">
              <LegendSample index={index} />
              <span>{label(series.key)}</span>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 gap-1.5 px-3 text-xs"
          aria-expanded={showTable}
          aria-controls={viewId}
          onClick={() => setShowTable((value) => !value)}
        >
          {showTable ? (
            <ChartLine className="size-4" aria-hidden />
          ) : (
            <Table2 className="size-4" aria-hidden />
          )}
          {showTable ? t(`${K}common.showChart`) : t(`${K}common.showTable`)}
        </Button>
      </div>

      {showTable ? (
        <div
          id={viewId}
          className="max-h-80 overflow-auto rounded-md border border-border"
        >
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t(`${K}capacity.chart.week`)}
                </th>
                {SERIES.map((series) => (
                  <th
                    key={series.key}
                    scope="col"
                    className="px-3 py-2 text-end font-medium"
                  >
                    {label(series.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {weeks.map((week) => (
                <tr key={week.start}>
                  <th
                    scope="row"
                    className="whitespace-nowrap px-3 py-2 text-start font-normal"
                  >
                    {formatDay(week.start, language)}
                  </th>
                  {SERIES.map((series) => (
                    <td
                      key={series.key}
                      className="px-3 py-2 text-end tabular-nums"
                      data-atlas-numeric="true"
                    >
                      {n(week[series.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          id={viewId}
          role="img"
          aria-label={t(`${K}capacity.chart.ariaLabel`, {
            count: weeks.length,
          })}
        >
          <ChartContainer config={config} className="aspect-auto h-60 w-full">
            <LineChart
              data={rows}
              margin={{ top: 8, right: 12, bottom: 0, left: 12 }}
            >
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="start"
                reversed={isRtl}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border-strong))' }}
                tickFormatter={(value: string) =>
                  formatDay(value, language, 'short')
                }
                minTickGap={24}
              />
              <YAxis
                orientation={isRtl ? 'right' : 'left'}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={(value: number) => n(value)}
              />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--border-strong))', strokeWidth: 1 }}
                content={({ active, payload, label: start }) => {
                  if (!active || !payload?.length) return null;
                  const week = payload[0]?.payload as CapacityWeek | undefined;
                  if (!week) return null;
                  return (
                    <div className="min-w-44 space-y-1 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                      <p className="text-muted-foreground">
                        {t(`${K}capacity.chart.weekOf`, {
                          date: formatDay(String(start), language),
                        })}
                      </p>
                      {SERIES.map((series, index) => (
                        <p key={series.key} className="flex items-center gap-2">
                          <LegendSample index={index} />
                          <span className="font-semibold tabular-nums text-foreground">
                            {n(week[series.key])}
                          </span>
                          <span className="text-muted-foreground">
                            {label(series.key)}
                          </span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              {SERIES.map((series, index) => (
                <Line
                  key={series.key}
                  type="linear"
                  dataKey={series.key}
                  name={label(series.key)}
                  stroke={`var(--growth-series-${index})`}
                  strokeWidth={2}
                  strokeDasharray={series.dash}
                  dot={(props: { cx?: number; cy?: number; key?: string }) => (
                    <Marker
                      key={props.key}
                      shape={series.shape}
                      cx={props.cx}
                      cy={props.cy}
                      color={`var(--growth-series-${index})`}
                    />
                  )}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: 'hsl(var(--card))',
                  }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </figure>
  );
}
