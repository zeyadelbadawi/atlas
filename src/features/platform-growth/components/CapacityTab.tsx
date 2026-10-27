/**
 * G1 — Capacity tab: what needs attention (alerts, most severe first, each
 * with a sentence and the place to act), the season, this week's
 * onboardings against the weekly cap, the owner's estimated hours against
 * the weekly hours, the hiring thresholds, open contact enquiries, source
 * coverage, and the last 12 weeks.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Info,
  OctagonAlert,
  type LucideIcon,
} from 'lucide-react';
import { ErrorState } from '@components/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@hooks';
import { cn, formatNumber, formatPercentage } from '@utils';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useGrowthCapacity } from '../hooks/usePlatformGrowth';
import type {
  AlertSeverity,
  CapacityAlert,
  CapacityAlertKey,
  CapacityReport,
  HiringState,
} from '../types';
import { K, formatDay } from '../utils/growth.utils';
import { Meter, Stat, type MeterTone } from './parts';
import { WeeklyChart } from './WeeklyChart';

export type GrowthTab = 'capacity' | 'cac' | 'spend' | 'settings';

const SEVERITY: Record<
  AlertSeverity,
  { readonly icon: LucideIcon; readonly className: string }
> = {
  critical: {
    icon: OctagonAlert,
    className: 'border-destructive/40 bg-destructive-surface text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-warning/40 bg-warning-surface text-warning',
  },
  info: { icon: Info, className: 'border-info/30 bg-info-surface text-info' },
};

/** Where each alert is acted on. */
function alertAction(key: CapacityAlertKey): {
  readonly to: string;
  readonly labelKey: string;
} {
  const tab = (name: GrowthTab) =>
    `${DASHBOARD_ROUTES.platformGrowth}?tab=${name}`;
  switch (key) {
    case 'requests_backlog':
      return {
        to: `${DASHBOARD_ROUTES.platformContactSubmissions}?status=new`,
        labelKey: 'capacity.actions.requests',
      };
    case 'attribution_low':
      return { to: tab('cac'), labelKey: 'capacity.actions.coverage' };
    case 'onboarding_cap_reached':
      return { to: tab('settings'), labelKey: 'capacity.actions.cap' };
    case 'hours_over_capacity':
      return { to: tab('settings'), labelKey: 'capacity.actions.hours' };
    case 'hire_warn':
    case 'hire_now':
      return { to: tab('settings'), labelKey: 'capacity.actions.hiring' };
    default:
      return { to: tab('settings'), labelKey: 'capacity.actions.season' };
  }
}

const linkClass =
  'inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const PERCENT_PARAMS = new Set(['utilization', 'ratio']);
const DAY_PARAMS = new Set(['start', 'end']);
const HOUR_PARAMS = new Set(['estimatedHours', 'ownerHours']);

/**
 * Which param each alert sentence's plural agrees with (the sentences have
 * `_one` / `_other`, and Arabic's six forms). Hours and the attribution
 * ratio have no counted noun.
 */
const ALERT_COUNT_PARAM: Partial<Record<CapacityAlert['key'], string>> = {
  onboarding_cap_reached: 'onboardings',
  hire_warn: 'payingOrgs',
  hire_now: 'payingOrgs',
  requests_backlog: 'open',
  season_soon: 'daysToStart',
  in_season: 'daysLeft',
};

/** Alert params formatted for the reading language. */
export function alertParams(
  alert: CapacityAlert,
  language: 'en' | 'ar'
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(alert.params)) {
    if (typeof value === 'number') {
      out[name] = PERCENT_PARAMS.has(name)
        ? formatPercentage(value, language)
        : HOUR_PARAMS.has(name)
          ? formatNumber(value, language, { maximumFractionDigits: 1 })
          : formatNumber(value, language);
      if (!PERCENT_PARAMS.has(name) && !HOUR_PARAMS.has(name))
        out[`${name}Count`] = value;
    } else {
      out[name] = DAY_PARAMS.has(name) ? formatDay(value, language) : value;
    }
  }
  // i18next plurals read `count`: the number the sentence's noun counts.
  const countParam = ALERT_COUNT_PARAM[alert.key];
  const countSource = countParam ? alert.params[countParam] : undefined;
  if (typeof countSource === 'number') out.count = countSource;
  return out;
}

function AlertsList({
  alerts,
}: {
  readonly alerts: readonly CapacityAlert[];
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  if (alerts.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
        {t(`${K}capacity.noAlerts`)}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {alerts.map((alert) => {
        const severity = SEVERITY[alert.severity];
        const Icon = severity.icon;
        const action = alertAction(alert.key);
        return (
          <li
            key={alert.key}
            className={cn(
              'flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
              severity.className
            )}
            data-severity={alert.severity}
          >
            <p className="flex items-start gap-2 text-sm text-foreground">
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">
                  {t(`${K}capacity.severity.${alert.severity}`)}:
                </span>{' '}
                {t(
                  `${K}capacity.alerts.${alert.key}`,
                  alertParams(alert, language)
                )}
              </span>
            </p>
            <Link to={action.to} className={cn(linkClass, 'shrink-0')}>
              {t(`${K}${action.labelKey}`)}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function capTone(onboardings: number, cap: number): MeterTone {
  if (onboardings > cap) return 'critical';
  if (onboardings >= cap) return 'warning';
  return 'ok';
}

function loadTone(utilization: number): MeterTone {
  if (utilization > 1) return 'critical';
  if (utilization > 0.9) return 'warning';
  return 'ok';
}

const HIRING_TONE: Record<HiringState, MeterTone> = {
  ok: 'ok',
  warn: 'warning',
  hire: 'critical',
};

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  readonly title: string;
  readonly icon?: LucideIcon;
  readonly children: ReactNode;
  readonly className?: string;
}): JSX.Element {
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon ? (
            <Icon className="size-4 text-muted-foreground" aria-hidden />
          ) : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function CapacityBody({ report }: { readonly report: CapacityReport }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const n = (value: number, digits = 0) =>
    formatNumber(value, language, { maximumFractionDigits: digits });
  const pct = (value: number) => formatPercentage(value, language);
  const { season, week, load, hiring, requests, attribution } = report;

  const capState =
    week.onboardings > week.onboardingCap
      ? 'overCap'
      : week.onboardings >= week.onboardingCap
        ? 'atCap'
        : 'underCap';
  const loadState =
    load.utilization > 1 ? 'over' : load.utilization > 0.9 ? 'tight' : 'ok';
  const weekValue = t(`${K}capacity.week.onboardingsValue`, {
    value: n(week.onboardings),
    cap: n(week.onboardingCap),
  });
  const hoursValue = t(`${K}capacity.load.value`, {
    hours: n(load.estimatedHoursThisWeek, 1),
    owner: n(load.ownerHours, 1),
  });
  const hiringValue = t(`${K}capacity.hiring.value`, {
    count: hiring.payingOrgs,
    value: n(hiring.payingOrgs),
  });

  return (
    <div className="space-y-6">
      <section aria-labelledby="growth-alerts-title" className="space-y-3">
        <h2
          id="growth-alerts-title"
          className="font-display text-base font-semibold text-foreground"
        >
          {t(`${K}capacity.alertsTitle`)}
        </h2>
        <AlertsList alerts={report.alerts} />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          title={t(`${K}capacity.season.title`)}
          icon={CalendarRange}
        >
          <p className="text-sm text-foreground">
            {t(`${K}capacity.season.dates`, {
              start: formatDay(season.start, language),
              end: formatDay(season.end, language),
            })}
          </p>
          <p className="text-2xl font-semibold text-foreground">
            {season.inSeason
              ? t(`${K}capacity.season.inSeason`, {
                  count: season.daysLeft ?? 0,
                  value: n(season.daysLeft ?? 0),
                })
              : season.daysToStart !== null
                ? t(`${K}capacity.season.daysToStart`, {
                    count: season.daysToStart,
                    value: n(season.daysToStart),
                  })
                : t(`${K}capacity.season.ended`)}
          </p>
          <Link
            to={`${DASHBOARD_ROUTES.platformGrowth}?tab=settings`}
            className={linkClass}
          >
            {t(`${K}capacity.actions.season`)}
          </Link>
        </SectionCard>

        <SectionCard title={t(`${K}capacity.week.title`)}>
          <p className="text-xs text-muted-foreground">
            {t(`${K}capacity.week.range`, {
              start: formatDay(week.start, language, 'short'),
              end: formatDay(week.end, language, 'short'),
            })}
          </p>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                {t(`${K}capacity.week.onboardings`)}
              </span>
              <span
                className="text-sm font-semibold tabular-nums"
                data-atlas-numeric="true"
              >
                {weekValue}
              </span>
            </div>
            <Meter
              value={week.onboardings}
              max={week.onboardingCap}
              label={t(`${K}capacity.week.onboardings`)}
              valueText={`${weekValue}. ${t(`${K}capacity.week.${capState}`, {
                count: Math.max(week.onboardingCap - week.onboardings, 0),
                value: n(Math.max(week.onboardingCap - week.onboardings, 0)),
              })}`}
              tone={capTone(week.onboardings, week.onboardingCap)}
            />
            <p className="text-xs text-muted-foreground">
              {t(`${K}capacity.week.${capState}`, {
                count: Math.max(week.onboardingCap - week.onboardings, 0),
                value: n(Math.max(week.onboardingCap - week.onboardings, 0)),
              })}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <Stat
              label={t(`${K}capacity.week.signups`)}
              value={n(week.signups)}
            />
            <Stat
              label={t(`${K}capacity.week.paidConversions`)}
              value={n(week.paidConversions)}
            />
          </dl>
        </SectionCard>

        <SectionCard title={t(`${K}capacity.load.title`)}>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                {t(`${K}capacity.load.label`)}
              </span>
              <span
                className="text-sm font-semibold tabular-nums"
                data-atlas-numeric="true"
              >
                {hoursValue}
              </span>
            </div>
            <Meter
              value={load.estimatedHoursThisWeek}
              max={load.ownerHours}
              label={t(`${K}capacity.load.label`)}
              valueText={`${hoursValue}. ${t(`${K}capacity.load.state.${loadState}`, { percent: pct(load.utilization) })}`}
              tone={loadTone(load.utilization)}
            />
            <p className="text-xs text-muted-foreground">
              {t(`${K}capacity.load.state.${loadState}`, {
                percent: pct(load.utilization),
              })}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <Stat
              label={t(`${K}capacity.load.payingOrgs`)}
              value={n(load.payingOrgs)}
            />
            <Stat
              label={t(`${K}capacity.load.activeTrials`)}
              value={n(load.activeTrials)}
            />
          </dl>
          <p className="text-xs text-muted-foreground">
            {t(`${K}capacity.load.formula`)}
          </p>
        </SectionCard>

        <SectionCard title={t(`${K}capacity.hiring.title`)}>
          <p className="text-2xl font-semibold text-foreground">
            {t(`${K}capacity.hiring.state.${hiring.state}`)}
          </p>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-foreground">{hiringValue}</span>
            </div>
            <Meter
              value={hiring.payingOrgs}
              max={hiring.hireAt}
              tick={hiring.warnAt}
              label={t(`${K}capacity.hiring.title`)}
              valueText={`${hiringValue}. ${t(
                `${K}capacity.hiring.thresholds`,
                {
                  warn: n(hiring.warnAt),
                  hire: n(hiring.hireAt),
                }
              )}`}
              tone={HIRING_TONE[hiring.state]}
            />
            <p className="text-xs text-muted-foreground">
              {t(`${K}capacity.hiring.thresholds`, {
                warn: n(hiring.warnAt),
                hire: n(hiring.hireAt),
              })}
            </p>
          </div>
        </SectionCard>

        <SectionCard title={t(`${K}capacity.requests.title`)}>
          {requests.open > 0 ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {t(`${K}capacity.requests.open`, {
                  count: requests.open,
                  value: n(requests.open),
                })}
              </p>
              {requests.oldestOpenHours !== null ? (
                <p className="text-sm text-muted-foreground">
                  {t(`${K}capacity.requests.oldest`, {
                    count: requests.oldestOpenHours,
                    value: n(requests.oldestOpenHours),
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(`${K}capacity.requests.none`)}
            </p>
          )}
          <Link
            to={`${DASHBOARD_ROUTES.platformContactSubmissions}?status=new`}
            className={linkClass}
          >
            {t(`${K}capacity.actions.requests`)}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        </SectionCard>

        <SectionCard title={t(`${K}capacity.attribution.title`)}>
          {attribution.last30Signups > 0 && attribution.ratio !== null ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {pct(attribution.ratio)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(`${K}capacity.attribution.value`, {
                  attributed: n(attribution.last30Attributed),
                  signups: n(attribution.last30Signups),
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(`${K}capacity.attribution.empty`)}
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard title={t(`${K}capacity.chart.title`)}>
        <p className="text-sm text-muted-foreground">
          {t(`${K}capacity.chart.description`)}
        </p>
        <WeeklyChart weeks={report.weeks} />
      </SectionCard>
    </div>
  );
}

export function CapacityTab(): JSX.Element {
  const capacity = useGrowthCapacity();
  if (capacity.error) {
    return (
      <ErrorState
        kind={capacity.error.kind}
        onRetry={() => void capacity.refetch()}
      />
    );
  }
  if (capacity.isLoading || !capacity.data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  return <CapacityBody report={capacity.data} />;
}
