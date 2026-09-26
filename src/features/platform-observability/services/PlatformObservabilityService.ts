/**
 * Observability Center API client — Platform Owner surfaces only.
 *
 * Every endpoint under `platform-observability/*` answers 401/403 to
 * anyone but a Platform Owner; the route guard and the hidden menu are a
 * courtesy, this API is the boundary.
 *
 * Nothing is computed or defaulted here. The backend states when a source
 * is unavailable or not configured, and the pages render exactly that —
 * so a missing field must reach the UI as missing, never as a zero.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  AlertRuleDetailResponse,
  AlertSeverity,
  AlertsResponse,
  MetricCatalogResponse,
  MetricRange,
  MetricSeriesResponse,
  MonitoringConfigurationResponse,
  SyntheticAlertState,
  SystemHealthResponse,
} from '@types';

/** The alert list's server-side filters. Absent fields are not sent. */
export interface AlertsQuery {
  readonly status: 'all' | 'active' | 'resolved';
  readonly severity?: Exclude<AlertSeverity, 'unknown'>;
  readonly rule?: string;
  readonly range: MetricRange;
}

/** Bounds the backend enforces for arming the synthetic alert. */
export const SYNTHETIC_ALERT_MIN_MINUTES = 5;
export const SYNTHETIC_ALERT_MAX_MINUTES = 30;

export class PlatformObservabilityService extends BaseService {
  protected readonly resource = 'platform-observability';

  async getHealth(options?: ReadOptions): Promise<SystemHealthResponse> {
    return this.client.get<SystemHealthResponse>(this.path('health'), options);
  }

  async listAlerts(
    query: AlertsQuery,
    options?: ReadOptions
  ): Promise<AlertsResponse> {
    return this.client.get<AlertsResponse>(this.path('alerts'), {
      ...options,
      params: { ...(options?.params ?? {}), ...stripEmpty({ ...query }) },
    });
  }

  async getAlertRule(
    ruleName: string,
    range: MetricRange,
    options?: ReadOptions
  ): Promise<AlertRuleDetailResponse> {
    return this.client.get<AlertRuleDetailResponse>(
      this.path('alerts', 'rules', ruleName),
      { ...options, params: { ...(options?.params ?? {}), range } }
    );
  }

  async getMetricCatalog(
    options?: ReadOptions
  ): Promise<MetricCatalogResponse> {
    return this.client.get<MetricCatalogResponse>(
      this.path('metrics'),
      options
    );
  }

  async getMetricSeries(
    metricId: string,
    range: MetricRange,
    options?: ReadOptions
  ): Promise<MetricSeriesResponse> {
    return this.client.get<MetricSeriesResponse>(
      this.path('metrics', metricId),
      { ...options, params: { ...(options?.params ?? {}), range } }
    );
  }

  async getConfiguration(
    options?: ReadOptions
  ): Promise<MonitoringConfigurationResponse> {
    return this.client.get<MonitoringConfigurationResponse>(
      this.path('configuration'),
      options
    );
  }

  /** Fires a REAL test alert through Prometheus → Alertmanager → Slack. */
  async armSyntheticAlert(minutes: number): Promise<SyntheticAlertState> {
    return this.client.post<SyntheticAlertState, { minutes: number }>(
      this.path('synthetic-alert'),
      { minutes }
    );
  }

  async resolveSyntheticAlert(): Promise<SyntheticAlertState> {
    return this.client.delete<SyntheticAlertState>(
      this.path('synthetic-alert')
    );
  }
}

/**
 * Drops absent filters rather than sending `severity=undefined`, which a
 * strict `@IsIn` validator would reject as a malformed value.
 */
function stripEmpty(query: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[1] !== ''
    )
  );
}

export const platformObservabilityService = new PlatformObservabilityService();
