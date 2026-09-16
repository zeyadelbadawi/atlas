/**
 * Customer-facing derivation of "where is my custom domain in its
 * lifecycle" (P63). Pure: the server's stored facts in, one step out.
 * Nothing here decides anything the backend has not already recorded —
 * it only chooses which of the backend's truths to lead with.
 */
import type { DomainConnection, DomainStatus } from '@types';

export type CustomDomainStep =
  /** No custom domain yet. */
  | 'connect'
  /** Row exists; the customer must add DNS records (or the provider has not accepted it yet). */
  | 'configure_dns'
  /** DNS submitted; the provider is validating. */
  | 'verifying'
  /** Provider reports the hostname live at the edge. */
  | 'live'
  /** Provider reports failure/disconnection — action needed. */
  | 'attention';

export function deriveCustomDomainStep(
  customDomain: DomainConnection | undefined
): CustomDomainStep {
  if (!customDomain?.hostname) return 'connect';
  return stepForStatus(customDomain.status);
}

export function stepForStatus(status: DomainStatus): CustomDomainStep {
  switch (status) {
    case 'connected':
      return 'live';
    case 'failed':
    case 'disconnected':
      return 'attention';
    case 'pending':
    case 'verifying':
      return 'verifying';
    case 'verification_required':
    case 'not_configured':
    default:
      return 'configure_dns';
  }
}

/** Steps in display order for the progress indicator. */
export const CUSTOM_DOMAIN_STEPS: readonly Exclude<CustomDomainStep, 'attention'>[] = [
  'connect',
  'configure_dns',
  'verifying',
  'live',
];

/** Index of a step along `CUSTOM_DOMAIN_STEPS`; `attention` sits at the verifying position (something happened after DNS). */
export function stepIndex(step: CustomDomainStep): number {
  if (step === 'attention') return CUSTOM_DOMAIN_STEPS.indexOf('verifying');
  return CUSTOM_DOMAIN_STEPS.indexOf(step);
}

/** Whether the DNS instructions are still worth showing prominently. */
export function shouldShowDnsInstructions(step: CustomDomainStep): boolean {
  return step === 'configure_dns' || step === 'verifying' || step === 'attention';
}
