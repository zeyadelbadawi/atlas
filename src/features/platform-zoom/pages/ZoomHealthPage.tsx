/**
 * Zoom Operations — Health & Incidents.
 *
 * A focused "what needs attention" view. Each group is a CURRENT
 * operational condition derived from live state (connection status,
 * session status, at-risk sessions, failed events) — not a new
 * incident-lifecycle table, so there is no resolve/acknowledge workflow.
 * A group disappears when the underlying state changes. Sample academies
 * deep-link to their Academy Detail for investigation.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useZoomHealth } from '../hooks/usePlatformZoom';

export default function ZoomHealthPage(): JSX.Element {
  const { t } = useTranslation();
  const query = useZoomHealth();
  const groups = query.data?.groups ?? [];

  return (
    <PageContainer>
      <PageHeader titleKey="platformZoom:health.title" descriptionKey="platformZoom:health.subtitle" />
      {query.isLoading ? (
        <SectionLoader />
      ) : groups.length === 0 ? (
        <EmptyState icon={ShieldCheck} titleKey="platformZoom:health.allClearTitle" descriptionKey="platformZoom:health.allClearDescription" />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Card key={g.kind}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle
                      className={g.severity === 'critical' ? 'size-4 text-destructive' : 'size-4 text-muted-foreground'}
                      aria-hidden
                    />
                    {t(`platformZoom:attention.${g.kind}`, { defaultValue: g.kind })}
                  </span>
                  <Badge variant={g.severity === 'critical' ? 'destructive' : 'secondary'} dir="ltr">{g.count}</Badge>
                </div>
                {g.samples.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {g.samples.map((s) => (
                      <li key={s.academyId}>
                        <Link
                          to={buildPath(DASHBOARD_ROUTES.platformZoomAcademyDetail, { academyId: s.academyId })}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {s.academyName}
                          <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
