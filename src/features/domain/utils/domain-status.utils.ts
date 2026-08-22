/**
 * Domain/SSL/CDN status → `StatusBadge` tone mapping (Prompt 11).
 *
 * Centralized so every surface (Website Domain tab, a future Platform
 * console) renders the exact same tone for the exact same status —
 * never a per-component ad hoc color choice.
 */
import type { StatusTone } from '@components/data-display';
import type { CdnStatus, DomainStatus, SslStatus } from '@types';

export function getDomainStatusTone(status: DomainStatus): StatusTone {
  switch (status) {
    case 'connected':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'pending':
    case 'verification_required':
    case 'verifying':
      return 'warning';
    case 'not_configured':
    case 'disconnected':
    default:
      return 'neutral';
  }
}

export function getSslStatusTone(status: SslStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'failed':
    case 'expired':
      return 'destructive';
    case 'pending':
    case 'provisioning':
      return 'warning';
    case 'not_configured':
    default:
      return 'neutral';
  }
}

export function getCdnStatusTone(status: CdnStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'error':
      return 'destructive';
    case 'degraded':
      return 'warning';
    case 'not_configured':
    default:
      return 'neutral';
  }
}
