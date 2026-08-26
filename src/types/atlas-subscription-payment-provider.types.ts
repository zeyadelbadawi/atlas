/**
 * Atlas Subscription Payment Provider types — Generic Payment Gateway
 * Integration Readiness (2026-08-26).
 *
 * Platform-Owner-only configuration of which registered payment provider
 * currently backs ATLAS's OWN subscription billing (Organization → Atlas).
 * Distinct from `payment.types.ts` (the Organization/Student-facing
 * checkout domain) and from the §5.8 Organization-owned course-payment
 * configuration types — never the same resource, never the same secrets.
 *
 * NEVER carries a raw/decrypted credential field — this file has no such
 * field to add one to by mistake.
 */

export type AtlasSubscriptionPaymentProviderStatus =
  | 'not_configured'
  | 'configured'
  | 'verified'
  | 'disabled';

export interface AtlasSubscriptionPaymentProviderTestResult {
  readonly success: boolean;
  readonly message?: string;
}

export interface AvailableAtlasSubscriptionPaymentProvider {
  readonly providerKey: string;
  readonly displayName: string;
}

export interface AtlasSubscriptionPaymentProviderConfig {
  readonly providerKey: string | null;
  readonly status: AtlasSubscriptionPaymentProviderStatus;
  readonly enabled: boolean;
  readonly lastTestedAt?: string;
  readonly lastTestResult?: AtlasSubscriptionPaymentProviderTestResult;
  readonly updatedAt?: string;
  /** Which adapter Atlas Subscription Payments are actually running on right now — `'atlas_manual'` (Manual Transfer) until a Platform Owner configures and enables something else. */
  readonly effectiveProviderKey: string;
  readonly effectiveProviderDisplayName: string;
}

/** `config` is an arbitrary, provider-shaped object — the frontend never inspects its keys generically; a future real-gateway-specific form would know its own field names. Write-only: the backend never echoes this back. */
export interface SaveAtlasSubscriptionPaymentProviderConfigPayload {
  readonly providerKey: string;
  readonly config: Readonly<Record<string, unknown>>;
}
