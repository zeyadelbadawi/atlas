/**
 * W3 — clients for the Platform Owner's Academy Email Activity
 * (`platform-communications/email-activity`) and OTP & Security Monitoring
 * (`platform-security`) APIs. Both are guarded server-side by
 * `PlatformOwnerGuard` and RLS under the caller's own context; the route
 * guard in this app is convenience, never the control.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  EmailActivityFilters,
  EmailActivityPage,
  EmailActivitySummary,
  SecurityEventPage,
  SecurityMonitoringFilters,
  SecurityMonitoringSummary,
} from './platform-email-monitoring.types';

/** Drops empty filters so the query string carries only what is set. */
function compact(params: object): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  ) as Record<string, string | number>;
}

export class PlatformEmailActivityService extends BaseService {
  protected readonly resource = 'platform-communications';

  async list(
    filters: EmailActivityFilters & {
      readonly limit?: number;
      readonly cursor?: string;
    },
    options?: ReadOptions
  ): Promise<EmailActivityPage> {
    return this.client.get<EmailActivityPage>(this.path('email-activity'), {
      ...options,
      params: compact(filters),
    });
  }

  async summary(
    filters: EmailActivityFilters,
    options?: ReadOptions
  ): Promise<EmailActivitySummary> {
    return this.client.get<EmailActivitySummary>(
      this.path('email-activity', 'summary'),
      { ...options, params: compact({ ...filters, status: undefined }) }
    );
  }
}

export class PlatformSecurityMonitoringService extends BaseService {
  protected readonly resource = 'platform-security';

  async summary(
    filters: SecurityMonitoringFilters,
    options?: ReadOptions
  ): Promise<SecurityMonitoringSummary> {
    return this.client.get<SecurityMonitoringSummary>(this.path('summary'), {
      ...options,
      params: compact({ ...filters, type: undefined }),
    });
  }

  async events(
    filters: SecurityMonitoringFilters & {
      readonly limit?: number;
      readonly cursor?: string;
    },
    options?: ReadOptions
  ): Promise<SecurityEventPage> {
    return this.client.get<SecurityEventPage>(this.path('events'), {
      ...options,
      params: compact(filters),
    });
  }
}

export const platformEmailActivityService = new PlatformEmailActivityService();
export const platformSecurityMonitoringService =
  new PlatformSecurityMonitoringService();
