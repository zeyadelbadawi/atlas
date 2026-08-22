/**
 * Domain / DNS / SSL / CDN readiness (Prompt 11).
 *
 * Reuses Prompt 8's `DomainStatus`/`DomainVerificationRecord`/
 * `DomainConnection`/`SubdomainAllocation` (`provisioning.types.ts`) for
 * the actual custom-domain lifecycle vocabulary — this file does NOT
 * redeclare a parallel domain-status state machine. It adds exactly what
 * Prompt 8 didn't need: an ONGOING (not one-time-provisioning) Academy
 * domain management surface, SSL/CDN status layered on top of it, and
 * Platform-wide base-domain configuration.
 *
 * Nothing here represents a real, connected integration. `connected`/
 * every status defaults to the "not configured" end of its spectrum, and
 * the frontend never marks any of it active on its own — only an
 * authoritative backend response can (see `Reports/ARCHITECTURE.md`,
 * Prompt 11, "No Fake Infrastructure").
 */
import type { DomainConnection, SubdomainAllocation } from './provisioning.types';

/**
 * SSL certificate lifecycle for a domain (Atlas subdomain or custom).
 * `not_configured` is the only honest value while no real Cloudflare/CA
 * integration exists — nothing in this prompt can move a domain past it.
 */
export type SslStatus =
  | 'not_configured'
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'failed'
  | 'expired';

/** CDN status for a domain. `not_configured` until a real edge/CDN provider is connected. */
export type CdnStatus = 'not_configured' | 'active' | 'degraded' | 'error';

/** The only infrastructure provider Atlas intends to integrate with — a single-entry union today, extensible without touching existing call sites (see `Reports/ARCHITECTURE.md`, Prompt 11, "Provider Abstraction"). */
export type InfrastructureProviderName = 'cloudflare';

/**
 * Whether Atlas's backend has real, working credentials configured for
 * a provider — reported by the backend, never assumed true by the
 * frontend. `connected: false` is the correct, honest value in every
 * environment today.
 */
export interface InfrastructureProviderStatus {
  readonly provider: InfrastructureProviderName;
  readonly connected: boolean;
}

/**
 * The Academy's complete domain configuration — its Atlas subdomain
 * allocation (reused from provisioning) plus, optionally, a custom
 * domain connection (also reused), with SSL/CDN state layered on top of
 * whichever is currently the Academy's active public address.
 */
export interface AcademyDomainConfiguration {
  readonly academyId: string;
  readonly subdomain?: SubdomainAllocation;
  readonly customDomain?: DomainConnection;
  readonly ssl: { readonly status: SslStatus };
  readonly cdn: { readonly status: CdnStatus; readonly provider?: InfrastructureProviderName };
}

export interface AddCustomDomainPayload {
  readonly hostname: string;
}

/**
 * Platform-wide base domain configuration — a Platform Owner setting,
 * always a singleton record (there is exactly one Atlas platform
 * domain). Mirrors Prompt 6's `TrialPolicy` precedent exactly: one
 * backend-configurable value, read via a query whose `initialData` is a
 * compiled, clearly-unconfigured default (see
 * `src/config/env.config.ts`'s `platformBaseDomain` and
 * `usePlatformDomainConfiguration`).
 */
export interface PlatformDomainConfiguration {
  readonly baseDomain?: string;
  readonly configured: boolean;
  readonly updatedAt?: string;
}

export interface UpdatePlatformDomainConfigurationPayload {
  readonly baseDomain: string;
}
