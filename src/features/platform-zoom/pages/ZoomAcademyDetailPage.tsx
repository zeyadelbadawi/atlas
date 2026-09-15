/**
 * Zoom Operations — Academy detail.
 *
 * The whole Zoom picture for one academy: connection health, session
 * operational counts, attendance reconciliation, recording lifecycle, the
 * entitlement-backed recording quota (a real RecordingQuotaService call —
 * "X / Y recorded sessions", never counted from files), upcoming at-risk
 * sessions, and recent integration activity. Read-only. No credentials —
 * the account id arrives already masked.
 */
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plug } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@utils';
import { useZoomAcademyDetail } from '../hooks/usePlatformZoom';
import { ZoomStatusBadge } from '../components/ZoomStatusBadge';
import type { LanguageCode } from '@types';

function Stat({ labelKey, value }: { labelKey: string; value: number | string }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{t(labelKey)}</p>
      <p className="mt-1 text-xl font-semibold text-foreground" dir="ltr">{value}</p>
    </div>
  );
}

export default function ZoomAcademyDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { academyId } = useParams<{ academyId: string }>();
  const query = useZoomAcademyDetail(academyId);
  const d = query.data;

  if (query.isLoading) {
    return (
      <PageContainer>
        <PageHeader titleKey="platformZoom:academyDetail.title" descriptionKey="platformZoom:academyDetail.subtitle" />
        <SectionLoader />
      </PageContainer>
    );
  }
  if (!d) {
    return (
      <PageContainer>
        <PageHeader titleKey="platformZoom:academyDetail.title" descriptionKey="platformZoom:academyDetail.subtitle" />
        <EmptyState icon={Plug} titleKey="platformZoom:academyDetail.notFoundTitle" descriptionKey="platformZoom:academyDetail.notFoundDescription" />
      </PageContainer>
    );
  }

  const quotaDisplay =
    d.recordings.quotaLimit === 'unlimited'
      ? `${d.recordings.quotaUsed} / ${t('platformZoom:academyDetail.unlimited')}`
      : `${d.recordings.quotaUsed} / ${d.recordings.quotaLimit}`;

  return (
    <PageContainer>
      <PageHeader titleKey="platformZoom:academyDetail.title" descriptionKey="platformZoom:academyDetail.subtitle" />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-base font-semibold text-foreground">{d.academyName}</p>
            <p className="text-sm text-muted-foreground">{d.organizationName}</p>
          </div>
          <div className="flex items-center gap-3">
            <ZoomStatusBadge status={d.connection.status} />
            {d.connection.maskedAccountId ? (
              <span className="font-mono text-xs text-muted-foreground" dir="ltr">{d.connection.maskedAccountId}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">{t('platformZoom:academyDetail.sessionsHeading')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat labelKey="platformZoom:sessionStatus.live" value={d.sessions.live} />
          <Stat labelKey="platformZoom:academyDetail.upcoming" value={d.sessions.upcoming} />
          <Stat labelKey="platformZoom:sessionStatus.ended" value={d.sessions.ended} />
          <Stat labelKey="platformZoom:sessionStatus.failed" value={d.sessions.failed} />
          <Stat labelKey="platformZoom:academyDetail.atRisk" value={d.sessions.atRisk} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">{t('platformZoom:academyDetail.attendanceHeading')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat labelKey="platformZoom:reconciliation.reconciled" value={d.attendance.reconciled} />
          <Stat labelKey="platformZoom:reconciliation.pending" value={d.attendance.pending} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">{t('platformZoom:academyDetail.recordingsHeading')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat labelKey="platformZoom:recordingStatus.available" value={d.recordings.available} />
          <Stat labelKey="platformZoom:recordingStatus.processing" value={d.recordings.processing} />
          <Stat labelKey="platformZoom:recordingStatus.failed" value={d.recordings.failed} />
          <Stat labelKey="platformZoom:academyDetail.quota" value={quotaDisplay} />
        </div>
      </section>

      {d.upcomingAtRisk.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">{t('platformZoom:overview.atRiskHeading')}</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {d.upcomingAtRisk.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground" dir="ltr">{formatDate(s.scheduledStartAt, language, 'short')}</p>
                  </div>
                  <Badge variant="destructive">{t(`platformZoom:risk.${s.riskReason ?? 'unknown'}`)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {d.recentActivity.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">{t('platformZoom:overview.activityHeading')}</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {d.recentActivity.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <span className="text-sm text-foreground">{t(`platformZoom:action.${e.action}`, { defaultValue: e.action })}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{formatDate(e.occurredAt, language, 'short')}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </PageContainer>
  );
}
