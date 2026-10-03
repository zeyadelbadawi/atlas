/**
 * W3 — query hooks for the Email & Notifications consoles. The two feeds
 * are infinite queries keyed by their filters: a filter change is a new
 * key, so "Load more" never mixes pages from two filter sets.
 */
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useApiQuery } from '@/shared/hooks';
import { platformEmailMonitoringKeys } from '@services/query';
import type { ApiError } from '@api';
import {
  platformEmailActivityService,
  platformSecurityMonitoringService,
} from '../services/PlatformEmailMonitoringService';
import type {
  EmailActivityFilters,
  EmailActivityPage,
  EmailActivitySummary,
  SecurityEventPage,
  SecurityMonitoringFilters,
  SecurityMonitoringSummary,
} from '../services/platform-email-monitoring.types';

export const EMAIL_MONITORING_PAGE_SIZE = 25;

export function useEmailActivityFeed(filters: EmailActivityFilters) {
  const limit = EMAIL_MONITORING_PAGE_SIZE;
  return useInfiniteQuery<
    EmailActivityPage,
    ApiError,
    InfiniteData<EmailActivityPage, string | undefined>,
    ReturnType<typeof platformEmailMonitoringKeys.activity>,
    string | undefined
  >({
    queryKey: platformEmailMonitoringKeys.activity({ ...filters, limit }),
    queryFn: ({ pageParam }) =>
      platformEmailActivityService.list({
        ...filters,
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useEmailActivitySummary(filters: EmailActivityFilters) {
  const { status: _status, ...summaryFilters } = filters;
  return useApiQuery<EmailActivitySummary, ApiError>({
    queryKey: platformEmailMonitoringKeys.activitySummary(summaryFilters),
    queryFn: () => platformEmailActivityService.summary(summaryFilters),
  });
}

export function useSecurityMonitoringSummary(
  filters: SecurityMonitoringFilters
) {
  const { type: _type, ...summaryFilters } = filters;
  return useApiQuery<SecurityMonitoringSummary, ApiError>({
    queryKey: platformEmailMonitoringKeys.securitySummary(summaryFilters),
    queryFn: () => platformSecurityMonitoringService.summary(summaryFilters),
  });
}

export function useSecurityEventsFeed(filters: SecurityMonitoringFilters) {
  const limit = EMAIL_MONITORING_PAGE_SIZE;
  return useInfiniteQuery<
    SecurityEventPage,
    ApiError,
    InfiniteData<SecurityEventPage, string | undefined>,
    ReturnType<typeof platformEmailMonitoringKeys.securityEvents>,
    string | undefined
  >({
    queryKey: platformEmailMonitoringKeys.securityEvents({ ...filters, limit }),
    queryFn: ({ pageParam }) =>
      platformSecurityMonitoringService.events({
        ...filters,
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
