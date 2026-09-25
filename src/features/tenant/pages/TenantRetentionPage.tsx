/**
 * Data & retention — `/dashboard/tenant/retention` (P64 C6, plan §31/§32).
 *
 * THIS IS THE PAGE A WARNING EMAIL SENDS SOMEONE TO. Until it existed the
 * link in W1–W4 had no destination: the first `warn_only` run would have
 * told an academy owner their video was going to be deleted and then
 * dropped them on a 404. Everything below is shaped by who arrives here
 * and why — a person who has just been frightened, looking for four
 * facts and one action.
 *
 * ---------------------------------------------------------------------
 * TONE IS PART OF THE CORRECTNESS, exactly as `LifecyclePanel`'s header
 * argues for the lifecycle states, and the stakes are higher here.
 * ---------------------------------------------------------------------
 *
 *  1. IT LEADS WITH WHAT IS STILL TRUE. The first thing rendered is
 *     "nothing has been deleted" and the count of video that is still
 *     there — because on the day a customer reads a deletion warning,
 *     that is both the most important fact and the one they are least
 *     sure of. The date comes second. A page that opened with the date
 *     would be a threat.
 *
 *  2. IT IS NEVER DESTRUCTIVE WHILE NOTHING HAS BEEN DESTROYED. No
 *     destructive tone, no red alert, no `StatTile emphasis="warning"`
 *     anywhere in the countdown — that emphasis is reserved for the one
 *     tile that reports video retention has ACTUALLY removed, which is
 *     the only statement on this page that describes a loss. Urgency is
 *     carried by an icon, a status word and the plain number of days.
 *
 *  3. COLOUR IS NEVER THE SIGNAL. Every stage of the timeline prints its
 *     own status in words ("Sent" / "Scheduled") next to an icon that
 *     differs in SHAPE, and the tile values are printed numbers. The page
 *     reads correctly in monochrome and to a colour-blind reader.
 *
 *  4. IT TELLS THE TRUTH ABOUT THE FLAG. While `FLAG_VIDEO_RETENTION_MODE`
 *     is `off` nothing anywhere acts on these dates, and the page says so
 *     in a note rather than presenting a projection as a schedule. This
 *     is the difference between informing a customer and alarming one.
 *
 *  5. ONE ACTION, AND IT IS THE ONE THAT WORKS. Reactivating the
 *     subscription stops the sequence. §31 also proposes a "download your
 *     videos" action — §O-6, a product decision that has not been made —
 *     so it is deliberately absent rather than stubbed into a button that
 *     would fail.
 *
 * ---------------------------------------------------------------------
 * ACCESSIBILITY
 * ---------------------------------------------------------------------
 * The summary is ONE `role="status"` region carrying a complete
 * contextual sentence (`aria-atomic`), so a screen-reader user hears
 * "Nothing has been deleted. Your video is scheduled for deletion on
 * <date>." when the data settles — not a bare number, and without focus
 * moving. The timeline is a real `<ol>`, headings run h1 → h2 with no
 * skips, every icon beside visible text is `aria-hidden`, and the loading
 * state is `aria-busy` rather than an empty screen.
 *
 * RTL is logical-property only (`ps`/`pe`/`text-start`), and the one
 * directional glyph is mirrored, so Arabic is a real layout rather than a
 * translated left-to-right one.
 *
 * REUSE. The tiles, sections and breakdown table are the SAME primitives
 * the Analytics operational pages use. They were moved from that feature
 * into `@components/reporting` to be reachable from here: a feature may
 * not reach into another feature's internals, and importing the Analytics
 * barrel instead would have closed a module cycle
 * (tenant → analytics → platform → tenant).
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Film,
  Info,
  PauseCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import type { StatusTone } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { formatDate, formatNumber, formatPercentage } from '@utils';
import {
  BreakdownTable,
  GeneratedAt,
  ReportSection,
  StatTile,
  TruncatedNotice,
} from '@components/reporting';
import { useTenantRetention } from '../hooks/useTenantRetention';
import type {
  LanguageCode,
  TenantRetention,
  TenantRetentionState,
  TenantRetentionWarningStepId,
} from '@types';

/**
 * How loudly the page speaks. Deliberately four values and none of them
 * "destructive" — see rule 2 in the header. `removed` exists only for the
 * case where retention has genuinely taken something.
 */
type RetentionTone = 'calm' | 'scheduled' | 'attention' | 'paused';

const TONE_BADGE: Record<RetentionTone, StatusTone> = {
  calm: 'success',
  scheduled: 'info',
  attention: 'warning',
  paused: 'info',
};

const STATE_TONE: Record<TenantRetentionState, RetentionTone> = {
  not_scheduled: 'calm',
  scheduled: 'scheduled',
  warning: 'attention',
  held: 'paused',
  elapsed: 'attention',
};

const STATE_ICON: Record<TenantRetentionState, LucideIcon> = {
  not_scheduled: ShieldCheck,
  scheduled: CalendarClock,
  warning: AlertTriangle,
  held: PauseCircle,
  elapsed: AlertTriangle,
};

/** The order the owner receives them, mirrored from the API's own ordering. */
const STEP_ICON: Record<TenantRetentionWarningStepId, LucideIcon> = {
  retention_warning_30d: Clock,
  retention_warning_14d: Clock,
  retention_warning_7d: Clock,
  retention_warning_24h: Clock,
};

/** A quiet factual aside. Icon plus words — never a coloured bar on its own. */
function InfoNote({ children }: { readonly children: string }): JSX.Element {
  return (
    <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function TenantRetentionPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const navigate = useNavigate();
  const { data, isLoading, error, refetch, hasNoOrganization } =
    useTenantRetention();

  const header = (
    <PageHeader
      titleKey="tenant:retention.title"
      descriptionKey="tenant:retention.subtitle"
    />
  );

  // A real state, not a failure: there is no organization to ask about.
  if (hasNoOrganization) {
    return (
      <PageContainer>
        {header}
        <EmptyState
          icon={ShieldCheck}
          titleKey="tenant:retention.noOrganization.title"
          descriptionKey="tenant:retention.noOrganization.description"
          primaryAction={{
            labelKey: 'tenant:lifecycle.noOrganization.action',
            onAction: () => navigate(DASHBOARD_ROUTES.organizationCreate),
          }}
        />
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        {header}
        <LoadingSkeleton />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        {header}
        <ErrorState
          kind={error?.kind}
          requestId={error?.requestId}
          titleKey="tenant:retention.error.title"
          descriptionKey="tenant:retention.error.description"
          onRetry={refetch}
        />
      </PageContainer>
    );
  }

  // Nothing to retain and nothing ever removed — the honest empty state,
  // not a page of zeros implying a schedule that does not exist.
  if (data.video.assetCount === 0 && data.video.deletedAssetCount === 0) {
    return (
      <PageContainer>
        {header}
        <EmptyState
          icon={Film}
          titleKey="tenant:retention.empty.title"
          descriptionKey="tenant:retention.empty.description"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {header}
      <RetentionReport data={data} language={language} />
    </PageContainer>
  );
}

function RetentionReport({
  data,
  language,
}: {
  readonly data: TenantRetention;
  readonly language: LanguageCode;
}): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tone = STATE_TONE[data.state];
  const StateIcon = STATE_ICON[data.state];
  const num = (value: number) => formatNumber(value, language);
  const day = (value: string) => formatDate(value, language, 'long');

  const sentCount = data.warnings.filter((row) => row.sent).length;
  const deletionDate = data.deletionAt ? day(data.deletionAt) : '';
  const nothingDeleted = data.video.deletedAssetCount === 0;
  /** `off` means no automation anywhere acts on these dates. Said, not hidden. */
  const automationOff = data.mode === 'off';

  /*
    THE COMPLETE SENTENCE, assembled once and used for both the visible
    summary and the polite announcement. A screen reader hears the same
    thing a sighted reader reads, in the same order, with the reassurance
    first — never a bare count.
  */
  const summary = [
    nothingDeleted
      ? t('tenant:retention.summary.nothingDeleted')
      : t('tenant:retention.summary.someRemoved', {
          count: data.video.deletedAssetCount,
        }),
    data.windowOpen && deletionDate
      ? data.hold.held
        ? t('tenant:retention.summary.held')
        : automationOff
          ? t('tenant:retention.summary.notEnabled', { date: deletionDate })
          : t('tenant:retention.summary.scheduled', { date: deletionDate })
      : t('tenant:retention.summary.notScheduled'),
  ].join(' ');

  return (
    <div
      className="space-y-4"
      data-testid="retention-page"
      data-retention-state={data.state}
      data-retention-tone={tone}
      data-retention-mode={data.mode}
    >
      {/* ---- the lead: what is still true, then the date ---------------- */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <StateIcon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t(`tenant:retention.state.${data.state}.title`)}
            </h2>
            {/* Urgency in a word, beside an icon — never the colour alone. */}
            <StatusBadge
              labelKey={`tenant:retention.state.${data.state}.badge`}
              tone={TONE_BADGE[tone]}
            />
          </div>

          <p
            role="status"
            aria-atomic="true"
            className="max-w-prose text-sm text-foreground"
            data-testid="retention-summary"
          >
            {summary}
          </p>

          <p className="max-w-prose text-sm text-muted-foreground">
            {t(`tenant:retention.state.${data.state}.description`, {
              date: deletionDate,
              days: data.windowDays ?? 0,
            })}
          </p>

          {automationOff && data.windowOpen ? (
            <InfoNote>{t('tenant:retention.modeOff')}</InfoNote>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => navigate(DASHBOARD_ROUTES.plans)}>
              {t('tenant:retention.actions.reactivate')}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(DASHBOARD_ROUTES.tenantSubscription)}
            >
              {t('tenant:retention.actions.manageSubscription')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- the four numbers ------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Film}
          label={t('tenant:retention.tiles.videos')}
          value={num(data.video.assetCount)}
          hint={t('tenant:retention.tiles.videosHint', {
            minutes: num(data.video.storedMinutes),
          })}
        />
        <StatTile
          icon={CalendarClock}
          label={t('tenant:retention.tiles.deletionDate')}
          value={deletionDate || t('tenant:retention.tiles.noDate')}
          hint={
            data.windowOpen && data.daysUntilDeletion !== null
              ? t('tenant:retention.tiles.daysRemaining', {
                  count: data.daysUntilDeletion,
                })
              : t('tenant:retention.tiles.noDateHint')
          }
        />
        <StatTile
          icon={Clock}
          label={t('tenant:retention.tiles.window')}
          value={
            data.windowDays !== null
              ? t('tenant:retention.tiles.windowValue', {
                  count: data.windowDays,
                })
              : t('tenant:retention.tiles.noDate')
          }
          hint={
            data.origin
              ? t(`tenant:retention.origin.${data.origin}`)
              : t('tenant:retention.tiles.noWindowHint')
          }
        />
        {/*
          The ONLY tile allowed the warning emphasis, and only when
          something was genuinely removed. Everywhere else the emphasis
          would be claiming a loss that has not happened.
        */}
        <StatTile
          icon={nothingDeleted ? ShieldCheck : Trash2}
          label={t('tenant:retention.tiles.removed')}
          value={num(data.video.deletedAssetCount)}
          hint={
            nothingDeleted
              ? t('tenant:retention.tiles.removedNone')
              : t('tenant:retention.tiles.removedOn', {
                  date: data.video.lastDeletedAt
                    ? day(data.video.lastDeletedAt)
                    : '',
                })
          }
          emphasis={nothingDeleted ? 'default' : 'warning'}
        />
      </div>

      {/* ---- the timeline ----------------------------------------------- */}
      {data.windowOpen && data.warnings.length > 0 ? (
        <ReportSection
          title={t('tenant:retention.timeline.title')}
          description={t('tenant:retention.timeline.description')}
        >
          <p className="text-sm text-muted-foreground">
            {t('tenant:retention.timeline.progress', {
              sent: sentCount,
              total: data.warnings.length,
            })}
          </p>

          <ol className="space-y-3" data-testid="retention-timeline">
            {data.warnings.map((row) => {
              const StepIcon = row.sent ? CheckCircle2 : STEP_ICON[row.step];
              return (
                <li
                  key={row.step}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border px-3 py-2.5"
                  data-step={row.step}
                  data-sent={row.sent ? 'true' : 'false'}
                >
                  <StepIcon
                    className={
                      row.sent
                        ? 'size-4 shrink-0 text-success'
                        : 'size-4 shrink-0 text-muted-foreground'
                    }
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                    {t(`tenant:retention.timeline.steps.${row.step}`)}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {day(row.dueAt)}
                  </span>
                  {/* The status in words, so the tick is never the only cue. */}
                  <StatusBadge
                    labelKey={
                      row.sent
                        ? 'tenant:retention.timeline.sent'
                        : 'tenant:retention.timeline.upcoming'
                    }
                    tone={row.sent ? 'success' : 'neutral'}
                  />
                </li>
              );
            })}

            <li
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-muted/40 px-3 py-2.5"
              data-step="deletion"
            >
              <Trash2
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={2}
                aria-hidden
              />
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                {t('tenant:retention.timeline.steps.deletion')}
              </span>
              <span
                className="text-sm tabular-nums text-muted-foreground"
                data-testid="retention-deletion-date"
              >
                {deletionDate}
              </span>
              <StatusBadge
                labelKey={
                  automationOff
                    ? 'tenant:retention.timeline.notEnabled'
                    : data.hold.held
                      ? 'tenant:retention.timeline.paused'
                      : data.state === 'elapsed'
                        ? 'tenant:retention.timeline.due'
                        : 'tenant:retention.timeline.upcoming'
                }
                tone={
                  automationOff || data.hold.held
                    ? 'neutral'
                    : data.state === 'elapsed'
                      ? 'warning'
                      : 'info'
                }
              />
            </li>
          </ol>
        </ReportSection>
      ) : null}

      {/* ---- which courses --------------------------------------------- */}
      {data.courses.length > 0 ? (
        <ReportSection
          title={t('tenant:retention.courses.title')}
          description={t('tenant:retention.courses.description')}
        >
          <BreakdownTable
            caption={t('tenant:retention.courses.caption')}
            rows={data.courses.map((course) => ({
              key: course.id,
              label:
                course.title || t('tenant:retention.courses.untitledCourse'),
              value: course.videoCount,
            }))}
            total={data.video.assetCount}
            columns={{
              label: t('tenant:retention.courses.columns.course'),
              count: t('tenant:retention.courses.columns.videos'),
              share: t('tenant:retention.courses.columns.share'),
            }}
            formatNumber={num}
            formatShare={(ratio) => formatPercentage(ratio, language, 0)}
          />
          <TruncatedNotice
            show={data.coursesTruncated}
            message={t('tenant:retention.courses.truncated', {
              count: data.courses.length,
            })}
          />
        </ReportSection>
      ) : null}

      {/* ---- how to stop it --------------------------------------------- */}
      <ReportSection title={t('tenant:retention.keep.title')}>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t('tenant:retention.keep.description')}
        </p>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t('tenant:retention.keep.kept')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate(DASHBOARD_ROUTES.plans)}>
            {t('tenant:retention.actions.reactivate')}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Button>
        </div>
        <InfoNote>{t('tenant:retention.keep.support')}</InfoNote>
      </ReportSection>

      <GeneratedAt timestamp={data.generatedAt} language={language} />
    </div>
  );
}
