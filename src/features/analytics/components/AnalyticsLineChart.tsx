/**
 * A single-series line chart for one Analytics time-series metric.
 * Thin wrapper around the shared `ChartContainer` (recharts) — the first
 * real consumer of that shared chart primitive.
 */
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { EmptyState } from '@components/feedback';
import type { AnalyticsTimeSeriesPoint } from '@types';
import type { LanguageCode } from '@types';

export interface AnalyticsLineChartProps {
  readonly points: readonly AnalyticsTimeSeriesPoint[];
  readonly metricLabelKey: string;
  readonly language: LanguageCode;
}

export function AnalyticsLineChart({
  points,
  metricLabelKey,
  language,
}: AnalyticsLineChartProps): JSX.Element {
  const { t } = useTranslation();

  if (points.length === 0) {
    return <EmptyState titleKey="analytics:charts.empty" />;
  }

  const config: ChartConfig = {
    value: { label: t(metricLabelKey), color: 'hsl(var(--primary))' },
  };

  const data = points.map((point) => ({
    date: new Date(point.date).toLocaleDateString(language, { month: 'short', day: 'numeric' }),
    value: point.value,
  }));

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}
