/**
 * Zoom Operations Center — Overview.
 *
 * Answers ONE question: is Zoom healthy across Atlas right now. It is
 * deliberately not a table dump — every count links onward to the page
 * that can actually be investigated.
 *
 * EVERY NUMBER HERE IS A STORED FACT. Connection counts come from
 * `academy_live_provider_connections`, session counts from
 * `live_sessions`, event counts from `live_provider_events`. Nothing is
 * sampled, estimated, or synthesised for the sake of a card.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, Radio } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { formatDate } from '@utils';
import { useZoomOverview } from '../hooks/usePlatformZoom';
import type { LanguageCode } from '@types';

function Stat({ labelKey, value }: { labelKey: string; value: number }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{t(labelKey)}</p>
      {/* Numerals are direction-isolated so an Arabic layout keeps them intact. */}
      <p className="mt-1 text-2xl font-semibold text-foreground" dir="ltr">
        {value}
      </p>
    </div>
  );
}

export default function ZoomOverviewPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const query = useZoomOverview();

  if (query.isLoading) {
    return (
      <PageContainer>
        <PageHeader titleKey="platformZoom:overview.title" descriptionKey="platformZoom:overview.subtitle" />
        <SectionLoader />
      </PageContainer>
    );
  }

  const data = query.data;

  return (
    <PageContainer>
      <PageHeader
        titleKey="platformZoom:overview.title"
        descriptionKey="platformZoom:overview.subtitle"
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t('platformZoom:overview.connectionsHeading')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat labelKey="platformZoom:connectionStatus.connected" value={data?.connections.connected ?? 0} />
          <Stat labelKey="platformZoom:connectionStatus.reconnect_required" value={data?.connections.reconnectRequired ?? 0} />
          <Stat labelKey="platformZoom:connectionStatus.revoked" value={data?.connections.revoked ?? 0} />
          <Stat labelKey="platformZoom:overview.notInstalled" value={data?.connections.notInstalled ?? 0} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t('platformZoom:overview.sessionsHeading')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat labelKey="platformZoom:sessionStatus.live" value={data?.sessions.live ?? 0} />
          <Stat labelKey="platformZoom:overview.upcoming" value={data?.sessions.upcoming ?? 0} />
          <Stat labelKey="platformZoom:sessionStatus.failed" value={data?.sessions.failed ?? 0} />
          <Stat labelKey="platformZoom:overview.unprovisioned" value={data?.sessions.unprovisioned ?? 0} />
        </div>
      </section>

      {/* NEEDS ATTENTION — only non-zero rows, so this is a work list and
          not a wall of green. */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t('platformZoom:overview.attentionHeading')}
        </h2>
        {data && data.needsAttention.length > 0 ? (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {data.needsAttention.map((item) => (
                <div key={item.kind} className="flex items-center justify-between gap-3 p-4">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <AlertTriangle
                      className={
                        item.severity === 'critical'
                          ? 'size-4 text-destructive'
                          : 'size-4 text-muted-foreground'
                      }
                      aria-hidden
                    />
                    {t(`platformZoom:attention.${item.kind}`)}
                  </span>
                  <Badge variant={item.severity === 'critical' ? 'destructive' : 'secondary'} dir="ltr">
                    {item.count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Radio}
            titleKey="platformZoom:overview.allHealthyTitle"
            descriptionKey="platformZoom:overview.allHealthyDescription"
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-foreground">
            {t('platformZoom:overview.atRiskHeading')}
          </h2>
          <Link
            to={DASHBOARD_ROUTES.platformZoomSessions}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {t('platformZoom:overview.viewSessions')}
            <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
        {data && data.upcomingAtRisk.length > 0 ? (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {data.upcomingAtRisk.map((session) => (
                <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {session.academyName} · {formatDate(session.scheduledStartAt, language, 'short')}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {t(`platformZoom:risk.${session.riskReason ?? 'unknown'}`)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Radio}
            titleKey="platformZoom:overview.noRiskTitle"
            descriptionKey="platformZoom:overview.noRiskDescription"
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t('platformZoom:overview.activityHeading')}
        </h2>
        {data && data.recentActivity.length > 0 ? (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {data.recentActivity.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <span className="text-sm text-foreground">
                    {t(`platformZoom:action.${entry.action}`, { defaultValue: entry.action })}
                  </span>
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {formatDate(entry.occurredAt, language, 'short')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Radio}
            titleKey="platformZoom:overview.noActivityTitle"
            descriptionKey="platformZoom:overview.noActivityDescription"
          />
        )}
      </section>
      {/* Quick navigation to the focused operational pages. */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">{t('platformZoom:overview.exploreHeading')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: DASHBOARD_ROUTES.platformZoomConnections, key: 'connections' },
            { to: DASHBOARD_ROUTES.platformZoomSessions, key: 'sessions' },
            { to: DASHBOARD_ROUTES.platformZoomAttendance, key: 'attendance' },
            { to: DASHBOARD_ROUTES.platformZoomRecordings, key: 'recordings' },
            { to: DASHBOARD_ROUTES.platformZoomEvents, key: 'events' },
            { to: DASHBOARD_ROUTES.platformZoomHealth, key: 'health' },
            { to: DASHBOARD_ROUTES.platformZoomActivity, key: 'activity' },
          ].map((link) => (
            <Link
              key={link.key}
              to={link.to}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 text-sm font-medium text-foreground hover:border-primary"
            >
              {t(`platformZoom:nav.${link.key}`)}
              <ArrowRight className="size-4 rtl:rotate-180 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

    </PageContainer>
  );
}
