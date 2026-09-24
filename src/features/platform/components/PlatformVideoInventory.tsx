/**
 * Platform video inventory detail (P64 Phase 4).
 *
 * The per-tier, per-provider and processing-pipeline breakdowns that used
 * to sit on the Platform Owner dashboard. They moved here so the
 * dashboard card can stay a three-number summary while the Content
 * delivery report shows the full picture. Handed its data (the delivery
 * report already carries the same `PlatformVideoMetrics` shape) rather
 * than fetching, so the report issues one request, not two.
 *
 * A rising `failed` count is the provider-health signal, so it is the one
 * row that changes appearance — and it says so in words and an icon,
 * never by colour alone. Headings are `h3`: the caller owns the `h2`.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { formatNumber } from '@utils';
import { useLanguage } from '@hooks';
import type { PlatformVideoMetrics, PlatformVideoTier } from '@types';

const TIER_LABEL_KEY: Record<PlatformVideoTier, string> = {
  normal: 'platform:video.tierNormal',
  premium: 'platform:video.tierPremium',
  none: 'platform:video.tierNone',
};

const PROCESSING_KEYS = ['ready', 'processing', 'pending', 'failed'] as const;

export interface PlatformVideoInventoryProps {
  readonly data: PlatformVideoMetrics;
}

export function PlatformVideoInventory({
  data,
}: PlatformVideoInventoryProps): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const num = (value: number) => formatNumber(value, language);
  const providers = Object.entries(data.byProvider).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const hasFailures = data.processing.failed > 0;

  return (
    <div className="space-y-5">
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

      <div className="grid gap-6 md:grid-cols-3">
        <section aria-labelledby="platform-video-tiers" className="space-y-2">
          <h3
            id="platform-video-tiers"
            className="text-sm font-medium text-foreground"
          >
            {t('platform:video.byTier')}
          </h3>
          {data.byTier.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('platform:video.empty')}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {data.byTier.map((row) => (
                <li
                  key={row.tier}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {t(TIER_LABEL_KEY[row.tier])}
                  </span>
                  <span
                    className="tabular-nums text-foreground"
                    data-atlas-numeric="true"
                  >
                    {t('platform:video.tierSummary', {
                      minutes: num(row.storedMinutes),
                      assets: num(row.assets),
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="platform-video-providers"
          className="space-y-2"
        >
          <h3
            id="platform-video-providers"
            className="text-sm font-medium text-foreground"
          >
            {t('platform:video.byProvider')}
          </h3>
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('platform:video.empty')}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {providers.map(([provider, assets]) => (
                <li
                  key={provider}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-muted-foreground">{provider}</span>
                  <span
                    className="tabular-nums text-foreground"
                    data-atlas-numeric="true"
                  >
                    {num(assets)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="platform-video-processing"
          className="space-y-2"
        >
          <h3
            id="platform-video-processing"
            className="text-sm font-medium text-foreground"
          >
            {t('platform:video.processing')}
          </h3>
          <ul className="space-y-1.5">
            {PROCESSING_KEYS.map((key) => {
              const isFailed = key === 'failed';
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span
                    className={
                      isFailed && hasFailures
                        ? 'flex items-center gap-1.5 font-medium text-destructive'
                        : 'text-muted-foreground'
                    }
                  >
                    {isFailed && hasFailures ? (
                      <AlertTriangle className="size-3.5" aria-hidden />
                    ) : null}
                    {t(`platform:video.status.${key}`)}
                  </span>
                  <span
                    className="tabular-nums text-foreground"
                    data-atlas-numeric="true"
                  >
                    {num(data.processing[key])}
                  </span>
                </li>
              );
            })}
          </ul>
          {hasFailures ? (
            <p role="status" className="text-xs text-destructive">
              {t('platform:video.failedNotice', {
                count: data.processing.failed,
              })}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
