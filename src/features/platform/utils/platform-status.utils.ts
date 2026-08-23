/**
 * Status → `StatusBadge` tone mappings for the Platform Owner Control
 * Plane consoles (Prompt 13). Centralized so every list/detail surface
 * renders the same tone for the same status.
 */
import type { StatusTone } from '@components/data-display';
import type {
  AcademyStatus,
  PlatformOrganizationStatus,
  PlatformUserAccountStatus,
  ProvisioningStatus,
  WebsitePublishStatus,
} from '@types';

export function getPlatformOrganizationStatusTone(status: PlatformOrganizationStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'destructive';
    case 'archived':
    default:
      return 'neutral';
  }
}

export function getPlatformAcademyStatusTone(status: AcademyStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'destructive';
    case 'draft':
      return 'warning';
    case 'archived':
    default:
      return 'neutral';
  }
}

export function getPlatformUserStatusTone(status: PlatformUserAccountStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'destructive';
    case 'invited':
    default:
      return 'warning';
  }
}

/**
 * Mirrors `provisioning/utils/provisioning-status.utils.ts`'s
 * `getProvisioningStatusTone` exactly — duplicated (not imported) because
 * the `provisioning` feature has no public barrel, and `no-restricted-imports`
 * forbids reaching into another feature's internals.
 */
export function getPlatformProvisioningStatusTone(status: ProvisioningStatus): StatusTone {
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

/** Mirrors `website/components/WebsitePublishBar.tsx`'s local `STATUS_TONE` map exactly. */
export function getPlatformWebsitePublishStatusTone(status: WebsitePublishStatus): StatusTone {
  switch (status) {
    case 'published':
      return 'success';
    case 'publishing':
      return 'info';
    case 'failed':
      return 'destructive';
    case 'draft':
    default:
      return 'neutral';
  }
}
