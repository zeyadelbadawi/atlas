/**
 * Platform Video Metrics — the dashboard's compact summary (P64 Phase 4).
 *
 * The dashboard is an executive overview, so this card carries only the
 * three headline numbers (assets, stored minutes, storage) plus the one
 * signal that needs attention today — failed processing — and a link to
 * the Content delivery report, where the per-tier, per-provider and
 * pipeline breakdowns now live (`PlatformVideoInventory`).
 *
 * Fetches its own data (unlike `PlatformMetrics`, which is handed the
 * overview snapshot) because it answers a separate endpoint that the
 * seven-KPI overview contract deliberately excludes.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { formatNumber } from '@utils';
import { useLanguage } from '@hooks';
import { usePlatformVideoMetrics } from '../hooks';

export function PlatformVideoMetrics(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data, isLoading, error, refetch } = usePlatformVideoMetrics();

  const title = (
    <CardTitle as="h2" className="flex items-center gap-2">
      <Video className="size-4" aria-hidden />
      {t('platform:sections.video')}
    </CardTitle>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>{title}</CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>{title}</CardHeader>
        <CardContent>
          <ErrorState onRetry={() => refetch()} />
        </CardContent>
      </Card>
    );
  }

  const num = (value: number) => formatNumber(value, language);
  const hasFailures = data.processing.failed > 0;

  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('platform:video.totalAssets')}
            </dt>
            <dd
              className="text-lg font-semibold tabular-nums text-foreground"
              data-atlas-numeric="true"
            >
              {num(data.totalVideoAssets)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('platform:video.totalMinutes')}
            </dt>
            <dd
              className="text-lg font-semibold tabular-nums text-foreground"
              data-atlas-numeric="true"
            >
              {num(data.totalStoredMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('platform:video.totalStorage')}
            </dt>
            <dd
              className="text-lg font-semibold tabular-nums text-foreground"
              data-atlas-numeric="true"
            >
              {t('platform:video.gb', { value: num(data.totalStoredGb) })}
            </dd>
          </div>
        </dl>

        {hasFailures ? (
          <p
            role="status"
            className="flex items-start gap-1.5 text-xs font-medium text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t('platform:video.failedNotice', { count: data.processing.failed })}
          </p>
        ) : null}

        <Link
          to={DASHBOARD_ROUTES.analyticsDelivery}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('platform:video.openReport')}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
