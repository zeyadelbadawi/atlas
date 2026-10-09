/**
 * Customer Requests — presentation helpers: status → `StatusBadge` tone and
 * label, type → icon and label, the "what happens next" copy per status,
 * and the translated message for an API refusal.
 */
import {
  Globe,
  LayoutTemplate,
  Palette,
  PenTool,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { StatusTone } from '@components/data-display';
import { isApiError } from '@api';
import { toErrorsNamespaceKey } from '@utils';
import {
  CLOSED_CUSTOMER_REQUEST_STATUSES,
  CR_NS,
} from '../constants/customer-request.constants';
import type {
  CustomerRequestPriority,
  CustomerRequestStatus,
  CustomerRequestType,
} from '../types/customer-request.types';

export function isCustomerRequestClosed(
  status: CustomerRequestStatus
): boolean {
  return CLOSED_CUSTOMER_REQUEST_STATUSES.has(status);
}

export function customerRequestStatusTone(
  status: CustomerRequestStatus
): StatusTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'waiting_for_customer':
      return 'warning';
    case 'rejected':
      return 'destructive';
    case 'cancelled':
      return 'neutral';
    case 'in_progress':
    case 'under_review':
      return 'info';
    case 'received':
    case 'submitted':
    default:
      return 'neutral';
  }
}

export function customerRequestStatusLabelKey(
  status: CustomerRequestStatus
): string {
  return `${CR_NS}:status.${status}`;
}

export function customerRequestPriorityTone(
  priority: CustomerRequestPriority
): StatusTone {
  switch (priority) {
    case 'high':
      return 'warning';
    case 'low':
      return 'neutral';
    case 'normal':
    default:
      return 'info';
  }
}

export function customerRequestPriorityLabelKey(
  priority: CustomerRequestPriority
): string {
  return `${CR_NS}:priority.${priority}`;
}

const TYPE_ICONS: Readonly<Record<CustomerRequestType, LucideIcon>> = {
  logo: PenTool,
  domain: Globe,
  theme: Palette,
  custom_section: LayoutTemplate,
  custom_feature: Sparkles,
};

export function customerRequestTypeIcon(type: CustomerRequestType): LucideIcon {
  return TYPE_ICONS[type];
}

export function customerRequestTypeLabelKey(type: CustomerRequestType): string {
  return `${CR_NS}:types.${type}.label`;
}

/** The "what happens next" helper copy, for the requester. */
export function customerRequestNextStepKey(
  status: CustomerRequestStatus
): string {
  return `${CR_NS}:nextStep.${status}`;
}

/** Known refusals the API answers with; anything else falls back to a generic message. */
const KNOWN_ERROR_KEYS: ReadonlySet<string> = new Set([
  'errors.customerRequest.invalidDetails',
  'errors.customerRequest.closed',
  'errors.customerRequest.duplicateClientId',
  'errors.customerRequest.invalidTransition',
  'errors.customerRequest.nothingToUpdate',
  'errors.customerRequest.invalidAssignee',
  'errors.customerRequest.duplicateRoutingType',
]);

/**
 * The `errors:` translation key describing why the API refused, when it is
 * one this feature knows; `undefined` otherwise (the caller shows its own
 * generic failure copy).
 */
export function customerRequestErrorKey(error: unknown): string | undefined {
  if (!isApiError(error)) return undefined;
  return KNOWN_ERROR_KEYS.has(error.messageKey)
    ? toErrorsNamespaceKey(error.messageKey)
    : undefined;
}

/** A v4 uuid for the create call's `clientRequestId` (crypto.randomUUID when available). */
export function newClientRequestId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else
    for (let i = 0; i < bytes.length; i += 1)
      bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
