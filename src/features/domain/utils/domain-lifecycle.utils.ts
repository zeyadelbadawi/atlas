/**
 * Customer-facing derivation of "where is my custom domain in its
 * lifecycle" (P63, extended P63c, reworked P63d). Pure: the server's
 * stored facts in, one step out. Nothing here decides anything the
 * backend has not already recorded — it only chooses which of the
 * backend's truths to lead with.
 *
 * P63d: "connected" is NOT "live". The provider saying the hostname is
 * active at its edge is one fact; the certificate being issued is a
 * second; Atlas's own probe getting a real answer is a third. The server
 * computes `live` from all three (`isCustomDomainLive`), and the steps
 * between "verified" and "live" are named here instead of collapsed.
 */
import type {
  DomainConnection,
  DomainDnsInstructions,
  DomainStatus,
} from '@types';

export type CustomDomainStep =
  /** No custom domain yet — or the customer is entering a replacement. */
  | 'connect'
  /** Atlas cannot offer DNS setup yet — an Atlas-side provider/routing problem, never the customer's. */
  | 'blocked'
  /** Row exists and the provider holds it; the customer must add DNS records. */
  | 'configure_dns'
  /** DNS submitted; the provider is validating ownership. */
  | 'verifying'
  /** Provider reports the hostname active; the certificate and/or Atlas's HTTPS check are still pending. */
  | 'securing'
  /** Provider reports the hostname active but HTTPS does not work for visitors (certificate failed, or the edge returns an error). */
  | 'https_failed'
  /** Hostname active, certificate active, HTTPS verified by Atlas. */
  | 'live'
  /** Provider reports failure/disconnection — action needed. */
  | 'attention';

export function deriveCustomDomainStep(
  customDomain: DomainConnection | undefined,
  dns?: DomainDnsInstructions
): CustomDomainStep {
  if (!customDomain?.hostname) return 'connect';
  const step = stepForConnection(customDomain);
  // Before the domain is live, the customer can only act on DNS when the
  // provider actually holds the hostname and there is a target to point
  // at. Otherwise the honest state is "Atlas is not ready", not "add
  // these (non-existent) records".
  if ((step === 'configure_dns' || step === 'verifying') && dns && !dns.ready) {
    return 'blocked';
  }
  return step;
}

/** The step for a provider `connected` row: live only when the server says so; otherwise which of the remaining facts is missing or failing. */
function stepForConnected(customDomain: DomainConnection): CustomDomainStep {
  if (customDomain.live) return 'live';
  if (
    customDomain.httpsReachable === false ||
    customDomain.sslStatus === 'failed' ||
    customDomain.sslStatus === 'expired'
  ) {
    return 'https_failed';
  }
  return 'securing';
}

export function stepForConnection(
  customDomain: DomainConnection
): CustomDomainStep {
  if (customDomain.status === 'connected')
    return stepForConnected(customDomain);
  return stepForStatus(customDomain.status);
}

/** Steps for every provider status other than `connected` (which needs the certificate and probe facts too — see `stepForConnection`). */
export function stepForStatus(status: DomainStatus): CustomDomainStep {
  switch (status) {
    case 'connected':
      // Without the certificate/probe facts the most that can be said is
      // that HTTPS is not yet confirmed. Callers with the row use
      // `stepForConnection`.
      return 'securing';
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

/**
 * The step to DISPLAY while the customer is editing a replacement
 * hostname. The stored domain's progress belongs to the old hostname; a
 * new one has none yet, so the indicator returns to "Connect" and only
 * a submitted, server-recorded row can move it forward again.
 */
export function stepWhileEditing(
  step: CustomDomainStep,
  formMode: 'closed' | 'add' | 'change'
): CustomDomainStep {
  return formMode === 'change' ? 'connect' : step;
}

/** The five positions of the progress indicator (`https` hosts both `securing` and `https_failed`). */
export type CustomDomainDisplayStep =
  'connect' | 'configure_dns' | 'verifying' | 'https' | 'live';

/** Steps in display order for the progress indicator. */
export const CUSTOM_DOMAIN_STEPS: readonly CustomDomainDisplayStep[] = [
  'connect',
  'configure_dns',
  'verifying',
  'https',
  'live',
];

/** Positions along `CUSTOM_DOMAIN_STEPS`. `attention` sits at the verifying position (something happened after DNS), `blocked` at the DNS position (that is the step Atlas cannot offer yet), `securing`/`https_failed` at the HTTPS position. */
export function stepIndex(step: CustomDomainStep): number {
  switch (step) {
    case 'attention':
      return 2;
    case 'blocked':
      return 1;
    case 'securing':
    case 'https_failed':
      return 3;
    case 'live':
      return 4;
    case 'verifying':
      return 2;
    case 'configure_dns':
      return 1;
    case 'connect':
    default:
      return 0;
  }
}

/** Steps that render as a failure at their position (not merely "in progress"). */
export function isFailedStep(step: CustomDomainStep): boolean {
  return step === 'attention' || step === 'blocked' || step === 'https_failed';
}

/** Whether the DNS instructions are worth showing prominently — until the domain is live, the records (including the certificate validation ones) may still need adding. */
export function shouldShowDnsInstructions(step: CustomDomainStep): boolean {
  return (
    step === 'configure_dns' ||
    step === 'verifying' ||
    step === 'attention' ||
    step === 'securing' ||
    step === 'https_failed'
  );
}

/** Whether the customer may change the hostname without a confirmation: everything before "live". */
export function canChangeDomainFreely(step: CustomDomainStep): boolean {
  return step !== 'connect' && step !== 'live';
}

/** Steps where the server (provider, sweep, origin) can still move the domain forward on its own — worth re-reading periodically without a click. */
export function isInProgressStep(step: CustomDomainStep): boolean {
  return (
    step === 'verifying' ||
    step === 'securing' ||
    step === 'blocked' ||
    step === 'https_failed' ||
    step === 'configure_dns'
  );
}
