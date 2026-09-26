/**
 * Data hooks for the Observability Center.
 *
 * Each read refetches on an interval — this is a live console, and a
 * health page that silently shows a five-minute-old "operational" is worse
 * than none. `REFRESH_INTERVAL_MS` is exported so the freshness indicator
 * applies the SAME interval when it decides the data has gone stale.
 *
 * Filtered reads keep the previous response on screen while the next one
 * loads (`keepPreviousData`), so changing a filter dims the frame instead
 * of flashing a skeleton.
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { platformObservabilityKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  AlertRuleDetailResponse,
  AlertsResponse,
  MetricCatalogResponse,
  MetricRange,
  MetricSeriesResponse,
  MonitoringConfigurationResponse,
  SyntheticAlertState,
  SystemHealthResponse,
} from '@types';
import {
  platformObservabilityService,
  type AlertsQuery,
} from '../services/PlatformObservabilityService';

/** How often each surface refetches, in milliseconds. */
export const REFRESH_INTERVAL_MS = {
  health: 30_000,
  alerts: 30_000,
  alertRule: 30_000,
  metrics: 60_000,
  configuration: 30_000,
} as const;

export function useSystemHealth() {
  return useApiQuery<SystemHealthResponse, ApiError>({
    queryKey: platformObservabilityKeys.health(),
    queryFn: () => platformObservabilityService.getHealth(),
    refetchInterval: REFRESH_INTERVAL_MS.health,
    staleTime: 0,
  });
}

export function useAlerts(query: AlertsQuery) {
  return useApiQuery<AlertsResponse, ApiError>({
    queryKey: platformObservabilityKeys.alerts(query),
    queryFn: () => platformObservabilityService.listAlerts(query),
    refetchInterval: REFRESH_INTERVAL_MS.alerts,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useAlertRule(ruleName: string | undefined, range: MetricRange) {
  return useApiQuery<AlertRuleDetailResponse, ApiError>({
    queryKey: platformObservabilityKeys.alertRule(ruleName, range),
    queryFn: () => platformObservabilityService.getAlertRule(ruleName!, range),
    enabled: Boolean(ruleName),
    refetchInterval: REFRESH_INTERVAL_MS.alertRule,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useMetricCatalog() {
  return useApiQuery<MetricCatalogResponse, ApiError>({
    queryKey: platformObservabilityKeys.metricCatalog(),
    queryFn: () => platformObservabilityService.getMetricCatalog(),
    refetchInterval: REFRESH_INTERVAL_MS.metrics,
    staleTime: 0,
  });
}

/**
 * One metric's series. `enabled` lets a card defer its request until it is
 * scrolled into view, so a page of ~40 charts does not fire 40 queries.
 */
export function useMetricSeries(
  metricId: string,
  range: MetricRange,
  enabled: boolean
) {
  return useApiQuery<MetricSeriesResponse, ApiError>({
    queryKey: platformObservabilityKeys.metricSeries(metricId, range),
    queryFn: () =>
      platformObservabilityService.getMetricSeries(metricId, range),
    enabled,
    refetchInterval: REFRESH_INTERVAL_MS.metrics,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useMonitoringConfiguration() {
  return useApiQuery<MonitoringConfigurationResponse, ApiError>({
    queryKey: platformObservabilityKeys.configuration(),
    queryFn: () => platformObservabilityService.getConfiguration(),
    refetchInterval: REFRESH_INTERVAL_MS.configuration,
    staleTime: 0,
  });
}

/**
 * Arming and resolving both change what Health, Alerts and Configuration
 * show, so all three are refetched. Errors render inline on the control
 * (through `apiErrorMessage`), not as a toast that disappears.
 */
const SYNTHETIC_INVALIDATES = [
  platformObservabilityKeys.configuration(),
  platformObservabilityKeys.health(),
  [...platformObservabilityKeys.all, 'alerts'],
] as const;

export function useArmSyntheticAlert() {
  return useApiMutation<SyntheticAlertState, number, ApiError>({
    mutationFn: (minutes: number) =>
      platformObservabilityService.armSyntheticAlert(minutes),
    successMessageKey: 'platformObservability:configuration.synthetic.armed',
    showErrorToast: false,
    invalidateKeys: SYNTHETIC_INVALIDATES,
  });
}

export function useResolveSyntheticAlert() {
  return useApiMutation<SyntheticAlertState, void, ApiError>({
    mutationFn: () => platformObservabilityService.resolveSyntheticAlert(),
    successMessageKey: 'platformObservability:configuration.synthetic.resolved',
    showErrorToast: false,
    invalidateKeys: SYNTHETIC_INVALIDATES,
  });
}
