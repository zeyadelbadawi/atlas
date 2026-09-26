/**
 * Observability › Monitoring & alerts.
 *
 * Read-only view of how monitoring is wired, plus the one write this
 * console allows: the synthetic test alert. Alert rules live in
 * version-controlled config ("Managed in code"); nothing here edits them.
 * Notification channels show connected / not connected and delivery counts
 * — never a webhook URL.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileCode2, KeyRound, ShieldCheck } from 'lucide-react';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { formatNumber } from '@utils';
import type {
  LanguageCode,
  MonitoringConfigurationResponse,
  NotificationChannel,
} from '@types';
import {
  FreshnessIndicator,
  ObservabilityShell,
  ObservabilityStatusBadge,
  PageSkeleton,
  QueryError,
  SourceNotice,
  SyntheticAlertControl,
} from '../components';
import {
  REFRESH_INTERVAL_MS,
  useMonitoringConfiguration,
} from '../hooks/usePlatformObservability';
import { formatDuration, translateKey } from '../utils/observability-format';
import type { ReactNode } from 'react';

function Card({
  id,
  title,
  description,
  actions,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <section
      aria-labelledby={id}
      className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2
            id={id}
            className="font-display text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p className="max-w-prose text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ChannelRow({
  channel,
  language,
}: {
  readonly channel: NotificationChannel;
  readonly language: LanguageCode;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const count = (value: number | null) =>
    value === null
      ? t('platformObservability:values.notReported')
      : formatNumber(value, language);
  return (
    <li
      className="space-y-3 rounded-md border border-border p-4"
      data-channel={channel.kind}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-foreground">
          {translateKey(t, i18n, 'configuration.channels.kinds', channel.kind)}
        </p>
        {channel.source !== 'ok' ? (
          <ObservabilityStatusBadge kind="source" value={channel.source} />
        ) : (
          <ObservabilityStatusBadge
            kind="channel"
            value={channel.configured ? 'connected' : 'not_connected'}
          />
        )}
      </div>
      {channel.source !== 'ok' ? (
        <SourceNotice
          source="alertmanager"
          state={channel.source}
          impactKey="platformObservability:configuration.channels.impact"
        />
      ) : !channel.configured ? (
        <p className="text-sm text-muted-foreground">
          {t('platformObservability:configuration.channels.notConnectedBody')}
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">
              {t('platformObservability:configuration.channels.sent24h')}
            </dt>
            <dd
              className="font-semibold tabular-nums text-foreground"
              data-atlas-numeric="true"
            >
              {count(channel.sent24h)}
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">
              {t('platformObservability:configuration.channels.failed24h')}
            </dt>
            <dd
              className="font-semibold tabular-nums text-foreground"
              data-atlas-numeric="true"
            >
              {count(channel.failed24h)}
            </dd>
          </div>
        </dl>
      )}
    </li>
  );
}

function RulesTable({
  rules,
}: {
  readonly rules: MonitoringConfigurationResponse['rules'];
}): JSX.Element {
  const { t } = useTranslation();
  const col = (key: string) =>
    t(`platformObservability:configuration.rules.columns.${key}`);
  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('platformObservability:configuration.rules.empty')}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">
          {t('platformObservability:configuration.rules.title')}
        </caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            {['name', 'group', 'severity', 'state', 'for', 'threshold'].map(
              (key) => (
                <th
                  key={key}
                  scope="col"
                  className="px-3 py-2 text-start font-medium"
                >
                  {col(key)}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rules.map((rule) => (
            <tr key={`${rule.group}/${rule.name}`}>
              <th scope="row" className="px-3 py-2.5 text-start font-medium">
                <Link
                  to={buildPath(
                    DASHBOARD_ROUTES.platformObservabilityAlertRule,
                    {
                      ruleName: rule.name,
                    }
                  )}
                  className="font-mono text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  dir="ltr"
                >
                  {rule.name}
                </Link>
              </th>
              <td
                className="px-3 py-2.5 font-mono text-xs text-muted-foreground"
                dir="ltr"
              >
                {rule.group}
              </td>
              <td className="px-3 py-2.5">
                <ObservabilityStatusBadge
                  kind="severity"
                  value={rule.severity}
                />
              </td>
              <td className="px-3 py-2.5">
                <ObservabilityStatusBadge kind="ruleState" value={rule.state} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                {rule.forSeconds > 0
                  ? formatDuration(rule.forSeconds, t)
                  : t('platformObservability:rule.immediately')}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {rule.threshold ?? t('platformObservability:values.none')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ObservabilityConfigurationPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const query = useMonitoringConfiguration();
  const { data, error, refetch } = query;

  return (
    <ObservabilityShell
      titleKey="platformObservability:configuration.title"
      descriptionKey="platformObservability:configuration.subtitle"
      actions={
        data ? (
          <FreshnessIndicator
            generatedAt={data.generatedAt}
            dataUpdatedAt={query.dataUpdatedAt}
            intervalMs={REFRESH_INTERVAL_MS.configuration}
            isFetching={query.isFetching}
            refetchFailed={query.isError}
            onRefresh={() => void refetch()}
          />
        ) : null
      }
    >
      {query.isLoading ? (
        <PageSkeleton tiles={0} cards={4} />
      ) : !data ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <SourceNotice source="prometheus" state={data.sources.prometheus} />
          <SourceNotice
            source="alertmanager"
            state={data.sources.alertmanager}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              id="obs-scrape"
              title={t('platformObservability:configuration.scrape.title')}
              description={t(
                'platformObservability:configuration.scrape.description'
              )}
            >
              <p className="flex items-start gap-3 text-sm">
                {data.scrapeAuthentication === 'token' ? (
                  <KeyRound
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                ) : (
                  <ShieldCheck
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <span>
                  <span className="block font-medium text-foreground">
                    {t(
                      `platformObservability:configuration.scrape.modes.${data.scrapeAuthentication}.label`
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {t(
                      `platformObservability:configuration.scrape.modes.${data.scrapeAuthentication}.description`
                    )}
                  </span>
                </span>
              </p>
            </Card>

            <Card
              id="obs-channels"
              title={t('platformObservability:configuration.channels.title')}
              description={t(
                'platformObservability:configuration.channels.description'
              )}
            >
              {data.channels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('platformObservability:configuration.channels.none')}
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.channels.map((channel) => (
                    <ChannelRow
                      key={channel.kind}
                      channel={channel}
                      language={language}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card
            id="obs-synthetic"
            title={t('platformObservability:configuration.synthetic.title')}
            description={t(
              'platformObservability:configuration.synthetic.description'
            )}
          >
            <SyntheticAlertControl state={data.syntheticAlert} />
          </Card>

          <Card
            id="obs-rules"
            title={t('platformObservability:configuration.rules.title')}
            description={t(
              'platformObservability:configuration.rules.description'
            )}
            actions={
              <span className="inline-flex items-center gap-1 rounded-pill border border-border px-2 py-0.5 text-xs text-muted-foreground">
                <FileCode2 className="size-3.5" aria-hidden />
                {t('platformObservability:rule.managedInCode')}
              </span>
            }
          >
            <RulesTable rules={data.rules} />
          </Card>
        </>
      )}
    </ObservabilityShell>
  );
}
