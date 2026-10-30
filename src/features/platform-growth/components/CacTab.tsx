/**
 * G1 — CAC tab: cost per paying academy by channel, per Cairo month
 * (signup-month cohorts: a March sign-up that pays in April counts in
 * March), plus the whole range. Cash spend only; founder time is not a
 * cost. Channel rows hide channels with no activity unless asked; the
 * blended row includes sign-ups with no known source. The range lives in
 * the URL (`?tab=cac&from=YYYY-MM&to=YYYY-MM`).
 */
import { useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Info, LineChart as LineChartIcon } from 'lucide-react';
import { EmptyState, ErrorState } from '@components/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@hooks';
import { cn, formatNumber, formatPercentage } from '@utils';
import { useGrowthCac } from '../hooks/usePlatformGrowth';
import type { CacChannelRow, CacReport, CacTotals, MonthRange } from '../types';
import {
  K,
  defaultCacRange,
  formatMonth,
  formatMoney,
  rangeProblem,
} from '../utils/growth.utils';
import { MonthRangePicker } from './MonthRangePicker';
import { useChannelLabel } from './parts';

/** The CAC range from the URL, or the default (last 6 months) when absent or invalid. */
export function useCacRange(): [MonthRange, (range: MonthRange) => void] {
  const [params, setParams] = useSearchParams();
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const range = useMemo(
    () => (rangeProblem(from, to) ? defaultCacRange() : { from, to }),
    [from, to]
  );
  const setRange = (next: MonthRange) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set('from', next.from);
        updated.set('to', next.to);
        return updated;
      },
      { replace: true }
    );
  return [range, setRange];
}

function hasActivity(row: CacChannelRow): boolean {
  return row.signups > 0 || row.paying > 0 || row.spendMinorUnits > 0;
}

function CacCell({
  cac,
  spend,
}: {
  readonly cac: number | null;
  readonly spend: number;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  if (cac !== null) return <>{formatMoney(cac, language, { compact: true })}</>;
  return (
    <span className="inline-flex flex-col items-end">
      <span aria-hidden>—</span>
      <span className={spend > 0 ? 'text-xs text-muted-foreground' : 'sr-only'}>
        {spend > 0
          ? t(`${K}cac.table.noPayingYet`)
          : t(`${K}cac.table.notApplicable`)}
      </span>
    </span>
  );
}

function ChannelTable({
  caption,
  channels,
  totals,
  showAll,
}: {
  readonly caption: string;
  readonly channels: readonly CacChannelRow[];
  readonly totals: CacTotals;
  readonly showAll: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const channelLabel = useChannelLabel();
  const n = (value: number) => formatNumber(value, language);
  const money = (value: number) =>
    formatMoney(value, language, { compact: true });
  const rows = showAll ? channels : channels.filter(hasActivity);
  const unknown = Math.max(totals.signups - totals.attributedSignups, 0);
  const cell = 'px-3 py-2 text-end tabular-nums whitespace-nowrap';

  return (
    <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[30rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t(`${K}cac.table.channel`)}
            </th>
            <th scope="col" className="px-3 py-2 text-end font-medium">
              {t(`${K}cac.table.signups`)}
            </th>
            <th scope="col" className="px-3 py-2 text-end font-medium">
              {t(`${K}cac.table.paying`)}
            </th>
            <th scope="col" className="px-3 py-2 text-end font-medium">
              {t(`${K}cac.table.spend`)}
            </th>
            <th scope="col" className="px-3 py-2 text-end font-medium">
              {t(`${K}cac.table.cac`)}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-3 text-sm text-muted-foreground"
              >
                {t(`${K}cac.table.noChannelActivity`)}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.channel}>
                <th scope="row" className="px-3 py-2 text-start font-normal">
                  {channelLabel(row.channel)}
                </th>
                <td className={cell} data-atlas-numeric="true">
                  {n(row.signups)}
                </td>
                <td className={cell} data-atlas-numeric="true">
                  {n(row.paying)}
                  {row.foundingPaying > 0 ? (
                    <span className="block text-xs text-muted-foreground">
                      {t(`${K}cac.table.founding`, {
                        count: row.foundingPaying,
                        value: n(row.foundingPaying),
                      })}
                    </span>
                  ) : null}
                </td>
                <td className={cell} data-atlas-numeric="true">
                  {money(row.spendMinorUnits)}
                </td>
                <td className={cell} data-atlas-numeric="true">
                  <CacCell
                    cac={row.cacMinorUnits}
                    spend={row.spendMinorUnits}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold">
            <th scope="row" className="px-3 py-2 text-start">
              {t(`${K}cac.table.blended`)}
            </th>
            <td className={cell} data-atlas-numeric="true">
              {n(totals.signups)}
            </td>
            <td className={cell} data-atlas-numeric="true">
              {n(totals.paying)}
              {totals.foundingPaying > 0 ? (
                <span className="block text-xs font-normal text-muted-foreground">
                  {t(`${K}cac.table.founding`, {
                    count: totals.foundingPaying,
                    value: n(totals.foundingPaying),
                  })}
                </span>
              ) : null}
            </td>
            <td className={cell} data-atlas-numeric="true">
              {money(totals.spendMinorUnits)}
            </td>
            <td className={cell} data-atlas-numeric="true">
              <CacCell
                cac={totals.blendedCacMinorUnits}
                spend={totals.spendMinorUnits}
              />
            </td>
          </tr>
          {unknown > 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-3 pb-2 text-xs text-muted-foreground"
              >
                {t(`${K}cac.table.unknownNote`, {
                  count: unknown,
                  value: n(unknown),
                })}
              </td>
            </tr>
          ) : null}
        </tfoot>
      </table>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums text-foreground"
          data-atlas-numeric="true"
        >
          {value}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function isEmptyReport(report: CacReport): boolean {
  return (
    report.overall.signups === 0 &&
    report.overall.spendMinorUnits === 0 &&
    report.overall.paying === 0
  );
}

function CacBody({
  report,
  showAll,
}: {
  readonly report: CacReport;
  readonly showAll: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const n = (value: number) => formatNumber(value, language);
  const { overall, coverage } = report;
  const rangeLabel = t(`${K}cac.rangeLabel`, {
    from: formatMonth(report.from, language),
    to: formatMonth(report.to, language),
  });
  const months = [...report.months].reverse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label={t(`${K}cac.summary.spend`)}
          value={formatMoney(overall.spendMinorUnits, language, {
            compact: true,
          })}
        />
        <SummaryCard
          label={t(`${K}cac.summary.paying`)}
          value={n(overall.paying)}
          hint={
            overall.foundingPaying > 0
              ? t(`${K}cac.table.founding`, {
                  count: overall.foundingPaying,
                  value: n(overall.foundingPaying),
                })
              : undefined
          }
        />
        <SummaryCard
          label={t(`${K}cac.summary.blendedCac`)}
          value={
            overall.blendedCacMinorUnits !== null
              ? formatMoney(overall.blendedCacMinorUnits, language, {
                  compact: true,
                })
              : '—'
          }
          hint={
            overall.blendedCacMinorUnits === null
              ? overall.spendMinorUnits > 0
                ? t(`${K}cac.table.noPayingYet`)
                : t(`${K}cac.summary.noSpend`)
              : undefined
          }
        />
        <SummaryCard
          label={t(`${K}cac.summary.coverage`)}
          value={
            coverage.ratio !== null
              ? formatPercentage(coverage.ratio, language)
              : '—'
          }
          hint={t(`${K}cac.summary.coverageValue`, {
            attributed: n(coverage.attributedSignups),
            signups: n(coverage.signups),
          })}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t(`${K}cac.overallTitle`)}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </CardHeader>
        <CardContent>
          <ChannelTable
            caption={t(`${K}cac.overallCaption`, { range: rangeLabel })}
            channels={overall.channels}
            totals={overall}
            showAll={showAll}
          />
        </CardContent>
      </Card>

      {months.map((month) => {
        const title = formatMonth(month.month, language);
        const quiet =
          month.totals.signups === 0 && month.totals.spendMinorUnits === 0;
        return (
          <Card key={month.month}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              {quiet ? (
                <p className="text-sm text-muted-foreground">
                  {t(`${K}cac.noActivity`)}
                </p>
              ) : (
                <ChannelTable
                  caption={t(`${K}cac.monthCaption`, { month: title })}
                  channels={month.channels}
                  totals={month.totals}
                  showAll={showAll}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CacTab(): JSX.Element {
  const { t } = useTranslation();
  const [range, setRange] = useCacRange();
  const [showAll, setShowAll] = useState(false);
  const showAllId = useId();
  const cac = useGrowthCac(range);

  const renderBody = () => {
    if (cac.error) {
      return (
        <ErrorState kind={cac.error.kind} onRetry={() => void cac.refetch()} />
      );
    }
    if (cac.isLoading || !cac.data) {
      return (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }
    if (isEmptyReport(cac.data)) {
      return (
        <EmptyState
          icon={LineChartIcon}
          headingLevel="h2"
          titleKey={`${K}cac.empty.title`}
          descriptionKey={`${K}cac.empty.description`}
        />
      );
    }
    return <CacBody report={cac.data} showAll={showAll} />;
  };

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-surface px-4 py-3 text-sm text-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <span>
          <strong className="font-semibold">{t(`${K}cac.note`)}</strong>{' '}
          {t(`${K}cac.cohortNote`)}
        </span>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <MonthRangePicker idPrefix="cac" value={range} onChange={setRange} />
        <div className="flex min-h-11 items-center gap-2">
          <Checkbox
            id={showAllId}
            checked={showAll}
            onCheckedChange={(value) => setShowAll(value === true)}
            className="size-5"
          />
          <Label htmlFor={showAllId} className="cursor-pointer font-normal">
            {t(`${K}cac.showAll`)}
          </Label>
        </div>
      </div>
      <div className={cn(cac.isFetching && cac.data && 'opacity-70')}>
        {renderBody()}
      </div>
    </div>
  );
}
