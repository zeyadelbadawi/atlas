/**
 * OTP & Security Monitoring — Platform Owner (sidebar: Email &
 * Notifications, `/dashboard/platform/email/security`).
 *
 * Aggregates (codes sent, verify rate, failures, lockouts, rate-limit
 * hits), a daily trend with a table alternative, and a masked recent-event
 * feed. Pre-auth events (unknown accounts, sign-in floods) are readable by
 * the Platform Owner only — the API's guard and RLS enforce it.
 *
 * Privacy: an account is shown as `a•••@domain` only when it is known;
 * otherwise a short reference of a keyed hash. IP addresses are never
 * shown — only an 8-character reference of a monthly-keyed hash, enough to
 * see that several events came from one network. Filtering by email or IP
 * sends the value to the server, which hashes and compares it; it is never
 * stored and never appears in the response.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  Ban,
  ChartLine,
  KeyRound,
  Lock,
  SearchX,
  ShieldAlert,
  ShieldCheck,
  Table2,
  X,
  XCircle,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { SkeletonTable } from '@components/loading';
import { ReportSection, StatTile } from '@components/reporting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useDateFormatter, useLanguage } from '@hooks';
import { formatNumber, formatPercentage } from '@utils';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import {
  useSecurityEventsFeed,
  useSecurityMonitoringSummary,
} from '../hooks/usePlatformEmailMonitoring';
import {
  SECURITY_EVENT_TYPES,
  type SecurityEventItem,
  type SecurityMonitoringDay,
  type SecurityMonitoringFilters,
} from '../services/platform-email-monitoring.types';
import {
  SECURITY_RANGE_DAYS,
  isPlausibleEmail,
  isPlausibleIp,
  parseAllowed,
  parseAllowedNumber,
  securityEventTone,
} from '../shared/email-monitoring.utils';
import { MonitoringSelect } from '../shared/MonitoringSelect';
import { LoadMoreFooter } from '../shared/LoadMoreFooter';

const K = 'platformEmail:security';
const ALL = 'all';
const SURFACES = ['management', 'academy'] as const;
const SERIES = ['sent', 'verified', 'failed', 'locked', 'rateLimited'] as const;

const BREADCRUMBS: readonly BreadcrumbItem[] = [
  {
    labelKey: 'navigation:items.platformDashboard',
    path: DASHBOARD_ROUTES.platform,
  },
  { labelKey: 'navigation:items.platformSecurityMonitoring' },
];

function TrendChart({
  series,
}: {
  readonly series: readonly SecurityMonitoringDay[];
}): JSX.Element {
  const { t } = useTranslation();
  const { language, isRtl } = useLanguage();
  const [asTable, setAsTable] = useState(false);
  const num = (value: number) => formatNumber(value, language);
  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        SERIES.map((key, index) => [
          key,
          {
            label: t(`${K}.chart.series.${key}`),
            color: `hsl(var(--chart-${index + 1}))`,
          },
        ])
      ),
    [t]
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => setAsTable((value) => !value)}
          aria-pressed={asTable}
        >
          {asTable ? (
            <ChartLine className="me-2 h-4 w-4" aria-hidden="true" />
          ) : (
            <Table2 className="me-2 h-4 w-4" aria-hidden="true" />
          )}
          {asTable ? t(`${K}.chart.showChart`) : t(`${K}.chart.showTable`)}
        </Button>
      </div>
      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t(`${K}.chart.title`)}</caption>
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t(`${K}.chart.date`)}
                </th>
                {SERIES.map((key) => (
                  <th
                    key={key}
                    scope="col"
                    className="px-3 py-2 text-end font-medium"
                  >
                    {t(`${K}.chart.series.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {series.map((day) => (
                <tr key={day.date}>
                  <th
                    scope="row"
                    className="whitespace-nowrap px-3 py-2 text-start font-normal"
                  >
                    <time dateTime={day.date} dir="ltr">
                      {day.date}
                    </time>
                  </th>
                  {SERIES.map((key) => (
                    <td key={key} className="px-3 py-2 text-end tabular-nums">
                      {num(day[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ChartContainer
          config={config}
          className="aspect-auto h-64 w-full"
          role="img"
          aria-label={t(`${K}.chart.title`)}
        >
          <LineChart
            data={[...series]}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              reversed={isRtl}
              minTickGap={24}
              tickFormatter={(value: string) => value.slice(5)}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
              orientation={isRtl ? 'right' : 'left'}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {SERIES.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}

export default function SecurityMonitoringPage(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const [params, setParams] = useSearchParams();
  const num = (value: number) => formatNumber(value, language);

  const days = parseAllowedNumber(params.get('days'), SECURITY_RANGE_DAYS, 7);
  const surface = parseAllowed(params.get('surface'), SURFACES);
  const type = parseAllowed(params.get('event'), SECURITY_EVENT_TYPES);
  // Email and IP filters are deliberately NOT kept in the URL: a shared
  // link or browser history must not carry a person's address or IP.
  const [emailInput, setEmailInput] = useState('');
  const [ipInput, setIpInput] = useState('');
  const [email, setEmail] = useState<string | undefined>();
  const [ip, setIp] = useState<string | undefined>();
  const [inputError, setInputError] = useState<'email' | 'ip' | null>(null);

  const filters: SecurityMonitoringFilters = { days, surface, type, email, ip };
  const summary = useSecurityMonitoringSummary(filters);
  const feed = useSecurityEventsFeed(filters);

  const setFilter = (name: string, value: string | undefined) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === undefined || value === ALL) next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: true }
    );
  };
  const hasFilters = Boolean(surface || type || email || ip);
  const clearFilters = () => {
    setEmail(undefined);
    setIp(undefined);
    setEmailInput('');
    setIpInput('');
    setInputError(null);
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        ['surface', 'event'].forEach((name) => next.delete(name));
        return next;
      },
      { replace: true }
    );
  };

  const applyLookup = (event: FormEvent) => {
    event.preventDefault();
    const nextEmail = emailInput.trim();
    const nextIp = ipInput.trim();
    if (nextEmail && !isPlausibleEmail(nextEmail)) {
      setInputError('email');
      return;
    }
    if (nextIp && !isPlausibleIp(nextIp)) {
      setInputError('ip');
      return;
    }
    setInputError(null);
    setEmail(nextEmail || undefined);
    setIp(nextIp || undefined);
  };

  const items: readonly SecurityEventItem[] = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data]
  );

  const accountText = (item: SecurityEventItem) =>
    item.maskedEmail ??
    (item.subjectRef
      ? t(`${K}.events.preAuth`, { ref: item.subjectRef })
      : t(`${K}.events.unknownAccount`));
  const surfaceText = (item: SecurityEventItem) =>
    item.surface
      ? t(`${K}.filters.${item.surface}`)
      : t('platformEmail:common.notAvailable');
  const detailsText = (item: SecurityEventItem) =>
    [
      item.reason
        ? t(`${K}.reasons.${item.reason}`, { defaultValue: item.reason })
        : null,
      item.attemptsRemaining !== null
        ? t(`${K}.events.attemptsLeft`, { count: item.attemptsRemaining })
        : null,
      item.occurrences > 1
        ? t(`${K}.events.occurrences`, { count: item.occurrences })
        : null,
      item.academy?.name ?? null,
    ]
      .filter(Boolean)
      .join(' · ') || t('platformEmail:common.notAvailable');
  const typeBadge = (item: SecurityEventItem) => (
    <StatusBadge
      labelKey={`${K}.types.${item.type}`}
      tone={securityEventTone(item.type)}
    />
  );

  const renderSummary = (): JSX.Element | null => {
    if (summary.error) {
      return (
        <ErrorState
          kind={summary.error.kind}
          requestId={summary.error.requestId}
          onRetry={() => void summary.refetch()}
        />
      );
    }
    if (summary.isLoading || !summary.data) {
      return (
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      );
    }
    const totals = summary.data.totals;
    const sent = totals.otpSent + totals.otpResent;
    const failed = totals.otpFailed + totals.otpExpired;
    const rateLimited = totals.otpRateLimited + totals.signinRateLimited;
    const deletion = [
      ['sent', totals.deletionCodeSent],
      ['verified', totals.deletionCodeVerified],
      ['failed', totals.deletionCodeFailed],
      ['locked', totals.deletionCodeLocked],
      ['rateLimited', totals.deletionCodeRateLimited],
    ] as const;
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            icon={KeyRound}
            label={t(`${K}.tiles.sent`)}
            value={num(sent)}
            hint={t(`${K}.tiles.sentHint`)}
          />
          <StatTile
            icon={ShieldCheck}
            label={t(`${K}.tiles.verifyRate`)}
            value={
              summary.data.verifyRate === null
                ? t('platformEmail:common.notAvailable')
                : formatPercentage(summary.data.verifyRate, language, 0)
            }
            hint={
              summary.data.verifyRate === null
                ? t(`${K}.tiles.verifyRateNone`)
                : t(`${K}.tiles.verifyRateHint`)
            }
          />
          <StatTile
            icon={XCircle}
            label={t(`${K}.tiles.failed`)}
            value={num(failed)}
            hint={t(`${K}.tiles.failedHint`)}
          />
          <StatTile
            icon={Lock}
            label={t(`${K}.tiles.locked`)}
            value={num(totals.otpLocked)}
            hint={t(`${K}.tiles.lockedHint`)}
            emphasis={totals.otpLocked > 0 ? 'warning' : 'default'}
          />
          <StatTile
            icon={Ban}
            label={t(`${K}.tiles.rateLimited`)}
            value={num(rateLimited)}
            hint={t(`${K}.tiles.rateLimitedHint`)}
            emphasis={rateLimited > 0 ? 'warning' : 'default'}
          />
        </div>

        <ReportSection
          title={t(`${K}.chart.heading`)}
          description={t(`${K}.chart.description`)}
        >
          <TrendChart series={summary.data.series} />
        </ReportSection>

        <ReportSection title={t(`${K}.deletion.heading`)}>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {deletion.map(([key, value]) => (
              <div key={key} className="rounded-md border border-border p-3">
                <dt className="text-xs text-muted-foreground">
                  {t(`${K}.deletion.${key}`)}
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {num(value)}
                </dd>
              </div>
            ))}
          </dl>
        </ReportSection>
      </>
    );
  };

  const renderEvents = (): JSX.Element => {
    if (feed.error) {
      return (
        <div className="p-6">
          <ErrorState
            kind={feed.error.kind}
            requestId={feed.error.requestId}
            onRetry={() => void feed.refetch()}
          />
        </div>
      );
    }
    if (feed.isLoading) {
      return (
        <div className="p-4" aria-busy="true">
          <SkeletonTable columns={6} />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="p-4">
          {hasFilters ? (
            <EmptyState
              icon={SearchX}
              titleKey={`${K}.noResults.title`}
              descriptionKey={`${K}.noResults.description`}
              primaryAction={{
                labelKey: 'platformEmail:common.clearFilters',
                onAction: clearFilters,
                icon: X,
              }}
            />
          ) : (
            <EmptyState
              icon={ShieldAlert}
              titleKey={`${K}.empty.title`}
              descriptionKey={`${K}.empty.description`}
            />
          )}
        </div>
      );
    }
    return (
      <>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <caption className="sr-only">{t(`${K}.events.caption`)}</caption>
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                {[
                  'when',
                  'event',
                  'account',
                  'surface',
                  'network',
                  'details',
                ].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3 text-start font-medium"
                  >
                    {t(`${K}.events.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    <time dateTime={item.createdAt}>
                      {fmt.dateTime(item.createdAt)}
                    </time>
                  </td>
                  <td className="px-4 py-3">{typeBadge(item)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span dir="ltr">{accountText(item)}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {surfaceText(item)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {item.ipRef ? (
                      <code className="text-xs" dir="ltr">
                        {t(`${K}.events.ipRef`, { ref: item.ipRef })}
                      </code>
                    ) : (
                      t('platformEmail:common.notAvailable')
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground" dir="auto">
                    {detailsText(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul
          aria-label={t(`${K}.events.caption`)}
          className="divide-y divide-border md:hidden"
        >
          {items.map((item) => (
            <li key={item.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                {typeBadge(item)}
                <time
                  dateTime={item.createdAt}
                  className="text-xs text-muted-foreground"
                >
                  {fmt.dateTime(item.createdAt)}
                </time>
              </div>
              <p className="truncate text-sm" dir="ltr">
                {accountText(item)}
              </p>
              <p className="text-xs text-muted-foreground" dir="auto">
                {surfaceText(item)} · {detailsText(item)}
              </p>
            </li>
          ))}
        </ul>
        <LoadMoreFooter
          hasNextPage={Boolean(feed.hasNextPage)}
          isFetchingNextPage={feed.isFetchingNextPage}
          onLoadMore={() => void feed.fetchNextPage()}
        />
      </>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}.title`}
        descriptionKey={`${K}.subtitle`}
        breadcrumbs={BREADCRUMBS}
      />
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <MonitoringSelect
            label={t('platformEmail:common.range.label')}
            value={String(days)}
            options={SECURITY_RANGE_DAYS.map((value) => ({
              value: String(value),
              label: t(`platformEmail:common.range.${value}`),
            }))}
            onChange={(value) => setFilter('days', value)}
          />
          <MonitoringSelect
            label={t(`${K}.filters.surface`)}
            value={surface ?? ALL}
            options={[
              { value: ALL, label: t(`${K}.filters.allSurfaces`) },
              ...SURFACES.map((value) => ({
                value,
                label: t(`${K}.filters.${value}`),
              })),
            ]}
            onChange={(value) => setFilter('surface', value)}
          />
          <MonitoringSelect
            label={t(`${K}.filters.type`)}
            value={type ?? ALL}
            options={[
              { value: ALL, label: t(`${K}.filters.allTypes`) },
              ...SECURITY_EVENT_TYPES.map((value) => ({
                value,
                label: t(`${K}.types.${value}`),
              })),
            ]}
            onChange={(value) => setFilter('event', value)}
          />
        </div>

        <form
          onSubmit={applyLookup}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          noValidate
        >
          <div className="space-y-1.5">
            <Label
              htmlFor="security-email"
              className="text-xs font-medium text-muted-foreground"
            >
              {t(`${K}.filters.email`)}
            </Label>
            <Input
              id="security-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              dir="ltr"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              aria-invalid={inputError === 'email'}
              aria-describedby="security-email-hint"
              className="h-10"
            />
            <p
              id="security-email-hint"
              className="text-xs text-muted-foreground"
            >
              {inputError === 'email' ? (
                <span role="alert" className="text-destructive">
                  {t(`${K}.filters.invalidEmail`)}
                </span>
              ) : (
                t(`${K}.filters.emailHint`)
              )}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="security-ip"
              className="text-xs font-medium text-muted-foreground"
            >
              {t(`${K}.filters.ip`)}
            </Label>
            <Input
              id="security-ip"
              autoComplete="off"
              dir="ltr"
              value={ipInput}
              onChange={(event) => setIpInput(event.target.value)}
              aria-invalid={inputError === 'ip'}
              aria-describedby="security-ip-hint"
              className="h-10"
            />
            <p id="security-ip-hint" className="text-xs text-muted-foreground">
              {inputError === 'ip' ? (
                <span role="alert" className="text-destructive">
                  {t(`${K}.filters.invalidIp`)}
                </span>
              ) : (
                t(`${K}.filters.ipHint`)
              )}
            </p>
          </div>
          <div className="flex gap-2 sm:pb-5">
            <Button type="submit" className="min-h-11">
              {t(`${K}.filters.apply`)}
            </Button>
            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={clearFilters}
              >
                <X className="me-2 h-4 w-4" aria-hidden="true" />
                {t('platformEmail:common.clearFilters')}
              </Button>
            ) : null}
          </div>
        </form>

        {renderSummary()}

        <Card>
          <CardHeader>
            <CardTitle as="h2">{t(`${K}.events.heading`)}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">{renderEvents()}</CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          {t('platformEmail:common.privacyNote')}
        </p>
      </div>
    </PageContainer>
  );
}
