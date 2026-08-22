/**
 * Provisioning status / step status → tone mapping.
 *
 * Same tone-mapping pattern already used for Tenant subscription status
 * (Prompt 6) and Payment status (Prompt 7).
 */
import type { StatusTone } from '@components/data-display';
import type { ProvisioningStatus, ProvisioningStepStatus } from '@types';

export function getProvisioningStatusTone(status: ProvisioningStatus): StatusTone {
  switch (status) {
    case 'ready':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'cancelled':
      return 'neutral';
    default:
      return 'info';
  }
}

export function getProvisioningStepStatusTone(status: ProvisioningStepStatus): StatusTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'running':
      return 'info';
    case 'skipped':
      return 'neutral';
    case 'pending':
    default:
      return 'neutral';
  }
}
