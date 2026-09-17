/**
 * Customer-facing derivation of "where is my custom domain in its
 * lifecycle" (P63, extended P63c). Pure: the server's stored facts in,
 * one step out. Nothing here decides anything the backend has not
 * already recorded — it only chooses which of the backend's truths to
 * lead with.
 */
import type {
  DomainConnection,
  DomainDnsInstructions,
  DomainStatus,
} from '@types';

export type CustomDomainStep =
  /** No custom domain yet. */
  | 'connect'
  /** Atlas cannot offer DNS setup yet — an Atlas-side provider/routing problem, never the customer's. */
  | 'blocked'
  /** Row exists and the provider holds it; the customer must add DNS records. */
  | 'configure_dns'
  /** DNS submitted; the provider is validating. */
  | 'verifying'
  /** Provider reports the hostname live at the edge. */
  | 'live'
  /** Provider reports failure/disconnection — action needed. */
  | 'attention';

export function deriveCustomDomainStep(
  customDomain: DomainConnection | undefined,
  dns?: DomainDnsInstructions
): CustomDomainStep {
  if (!customDomain?.hostname) return 'connect';
  const step = stepForStatus(customDomain.status);
  // Before the domain is live, the customer can only act on DNS when the
  // provider actually holds the hostname and there is a target to point
  // at. Otherwise the honest state is "Atlas is not ready", not "add
  // these (non-existent) records".
  if ((step === 'configure_dns' || step === 'verifying') && dns && !dns.ready) {
    return 'blocked';
  }
  return step;
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
export const CUSTOM_DOMAIN_STEPS: readonly Exclude<
  CustomDomainStep,
  'attention' | 'blocked'
>[] = ['connect', 'configure_dns', 'verifying', 'live'];

/** Index of a step along `CUSTOM_DOMAIN_STEPS`; `attention` sits at the verifying position (something happened after DNS), `blocked` at the DNS position (that is the step Atlas cannot offer yet). */
export function stepIndex(step: CustomDomainStep): number {
  if (step === 'attention') return CUSTOM_DOMAIN_STEPS.indexOf('verifying');
  if (step === 'blocked') return CUSTOM_DOMAIN_STEPS.indexOf('configure_dns');
  return CUSTOM_DOMAIN_STEPS.indexOf(step);
}

/** Whether the DNS instructions are worth showing prominently. */
export function shouldShowDnsInstructions(step: CustomDomainStep): boolean {
  return (
    step === 'configure_dns' || step === 'verifying' || step === 'attention'
  );
}

/** Whether the customer may change the hostname without a confirmation: everything before "live". */
export function canChangeDomainFreely(step: CustomDomainStep): boolean {
  return step !== 'connect' && step !== 'live';
}
