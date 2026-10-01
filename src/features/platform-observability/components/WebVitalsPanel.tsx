/**
 * Observability › Metrics › Real-user performance (P6).
 *
 * p75 Core Web Vitals from sampled real visits, by page type and device
 * class, with the sample count behind every figure. A rating is spelled
 * out in words (never colour alone), and a thin sample says so instead of
 * being rated. No source → the same SourceNotice the rest of the console
 * uses; no samples → says that collection is off unless enabled.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@utils';
import type {
  LanguageCode,
  WebVitalMetric,
  WebVitalsRange,
  WebVitalsRow,
} from '@types';
import { useWebVitals } from '../hooks/usePlatformObservability';
import { SourceNotice } from './SourceNotice';
import { QueryError } from './QueryStates';

const METRICS: readonly WebVitalMetric[] = ['LCP', 'INP', 'CLS'];
const RANGES: readonly WebVitalsRange[] = ['24h', '7d'];

function formatValue(row: WebVitalsRow, language: LanguageCode): string {
  return row.metric === 'CLS'
    ? formatNumber(row.p75, language, { maximumFractionDigits: 3 })
    : `${formatNumber(row.p75, language)} ms`;
}

export function WebVitalsPanel(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const [range, setRange] = useState<WebVitalsRange>('7d');
  const query = useWebVitals(range);
  const data = query.data;

  // One table row per page type × device; one cell per metric.
  const groups = new Map<string, Map<WebVitalMetric, WebVitalsRow>>();
  for (const row of data?.rows ?? []) {
    const key = `${row.route}|${row.device}`;
    if (!groups.has(key)) groups.set(key, new Map());
    groups.get(key)!.set(row.metric, row);
  }
  const routeLabel = (route: string) =>
    t(`platformObservability:webVitals.routes.${route.replace(':', '_')}`, {
      defaultValue: route,
    });

  return (
    <Card data-testid="web-vitals-panel">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-4" aria-hidden />
          {t('platformObservability:webVitals.title')}
        </CardTitle>
        <div
          role="group"
          aria-label={t('platformObservability:webVitals.rangeLabel')}
          className="flex gap-1"
        >
          {RANGES.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={value === range ? 'default' : 'outline'}
              aria-pressed={value === range}
              onClick={() => setRange(value)}
            >
              {t(`platformObservability:webVitals.range.${value}`)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('platformObservability:webVitals.description')}
        </p>
        {query.error ? (
          <QueryError
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : !data ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t('platformObservability:webVitals.loading')}
          </p>
        ) : data.state !== 'ok' ? (
          <SourceNotice source="prometheus" state={data.state} />
        ) : groups.size === 0 ? (
          <p className="text-sm text-foreground">
            {t('platformObservability:webVitals.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs text-muted-foreground">
                  <th scope="col" className="py-2 text-start font-medium">
                    {t('platformObservability:webVitals.columns.route')}
                  </th>
                  <th scope="col" className="py-2 text-start font-medium">
                    {t('platformObservability:webVitals.columns.device')}
                  </th>
                  {METRICS.map((metric) => (
                    <th
                      key={metric}
                      scope="col"
                      className="py-2 text-start font-medium"
                    >
                      {t(`platformObservability:webVitals.columns.${metric}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...groups.entries()].map(([key, cells]) => {
                  const [route, device] = key.split('|');
                  return (
                    <tr key={key} className="border-b border-border align-top">
                      <th
                        scope="row"
                        className="py-2 pe-3 text-start font-medium text-foreground"
                      >
                        {routeLabel(route)}
                      </th>
                      <td className="py-2 pe-3">
                        {t(`platformObservability:webVitals.device.${device}`)}
                      </td>
                      {METRICS.map((metric) => {
                        const cell = cells.get(metric);
                        return (
                          <td
                            key={metric}
                            className="py-2 pe-3"
                            data-testid={`web-vital-${key}-${metric}`}
                          >
                            {cell ? (
                              <>
                                <span className="font-medium text-foreground">
                                  {formatValue(cell, language)}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {t(
                                    `platformObservability:webVitals.rating.${cell.rating}`
                                  )}
                                  {' · '}
                                  {t(
                                    'platformObservability:webVitals.samples',
                                    {
                                      count: cell.samples,
                                      formatted: formatNumber(
                                        cell.samples,
                                        language
                                      ),
                                    }
                                  )}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
