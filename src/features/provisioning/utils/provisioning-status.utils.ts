/**
 * Provisioning status / step status → tone mapping.
 *
 * Same tone-mapping pattern already used for Tenant subscription status
 * (Prompt 6) and Payment status (Prompt 7).
 */
import type { StatusTone } from '@components/data-display';
import type { ProvisioningStatus, ProvisioningStepStatus } from '@types';

export function getProvisioningStatusTone(
  status: ProvisioningStatus
): StatusTone {
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

export function getProvisioningStepStatusTone(
  status: ProvisioningStepStatus
): StatusTone {
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

/**
 * The status page's subtitle and checklist heading for each lifecycle
 * state. "Preparing …" is only true while the request is still running: a
 * ready Academy says so, and a failed or cancelled request no longer claims
 * to be preparing anything.
 */
export function getProvisioningHeadingKeys(status: ProvisioningStatus): {
  readonly subtitleKey: string;
  readonly checklistTitleKey: string;
} {
  switch (status) {
    case 'ready':
      return {
        subtitleKey: 'provisioning:status.subtitleReady',
        checklistTitleKey: 'provisioning:status.checklistTitleReady',
      };
    case 'failed':
    case 'cancelled':
      return {
        subtitleKey: 'provisioning:status.subtitleStopped',
        checklistTitleKey: 'provisioning:status.checklistTitleStopped',
      };
    default:
      return {
        subtitleKey: 'provisioning:status.subtitle',
        checklistTitleKey: 'provisioning:status.checklistTitle',
      };
  }
}
