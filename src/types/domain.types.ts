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
import type {
  DomainConnection,
  DomainStatus,
  DomainVerificationRecord,
  SubdomainAllocation,
} from './provisioning.types';

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
/** P63 — which address is canonical for an Academy website, and why. Server-computed; never chosen in React. */
export type CanonicalHostSource = 'custom_domain' | 'subdomain';

export interface CanonicalHost {
  readonly host: string;
  readonly source: CanonicalHostSource;
}

/** P63 — what the customer configures at their DNS provider. `cnameTarget` is absent when the platform has no fallback origin configured yet. */
export interface DomainDnsInstructions {
  readonly cnameTarget?: string;
  readonly records: readonly DomainVerificationRecord[];
}

export interface AcademyDomainConfiguration {
  readonly academyId: string;
  readonly subdomain?: SubdomainAllocation;
  readonly customDomain?: DomainConnection;
  /** P63 — absent only when neither a base domain nor a connected custom domain exists. */
  readonly canonicalHost?: CanonicalHost;
  /** P63 — present whenever a custom domain is configured. */
  readonly dns?: DomainDnsInstructions;
  readonly ssl: { readonly status: SslStatus };
  readonly cdn: {
    readonly status: CdnStatus;
    readonly provider?: InfrastructureProviderName;
  };
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
/** P63 — where the effective base domain comes from: the deployment environment wins over the database row. */
export type PlatformBaseDomainSource = 'environment' | 'database';

export interface PlatformDomainConfiguration {
  readonly baseDomain?: string;
  readonly configured: boolean;
  readonly updatedAt?: string;
  readonly source?: PlatformBaseDomainSource;
}

/** P63 — the Platform Owner's truthful readiness view; every field is a live provider answer, a live probe, or absent. */
export interface PlatformDomainReadiness {
  readonly baseDomain?: string;
  readonly source?: PlatformBaseDomainSource;
  readonly provider: {
    readonly name: InfrastructureProviderName;
    readonly connected: boolean;
  };
  readonly customHostnames: {
    readonly ready: boolean;
    readonly fallbackOrigin?: string;
    readonly fallbackOriginStatus?: string;
    readonly originSslMode?: string;
    readonly originSslModeCompatible?: boolean;
  };
  readonly platformHttps: {
    readonly baseDomainReachable?: boolean;
    readonly wildcardReachable?: boolean;
    readonly checkedAt: string;
  };
  readonly checkedAt: string;
}

/** P63 — one Platform Owner operations row per Academy. */
export interface PlatformDomainRow {
  readonly academyId: string;
  readonly academyName: string;
  readonly academySlug: string;
  readonly academyStatus: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly subdomain?: SubdomainAllocation;
  readonly customDomain?: DomainConnection;
  readonly canonicalHost?: CanonicalHost;
  readonly needsAttention: boolean;
  readonly createdAt: string;
}

export interface PlatformDomainsOverview {
  readonly academies: number;
  readonly withSubdomain: number;
  readonly withCustomDomain: number;
  readonly customConnected: number;
  readonly customAwaitingProvider: number;
  readonly customFailed: number;
  readonly needingAttention: number;
  readonly checkedAt: string;
}

export type PlatformDomainKindFilter = 'custom' | 'subdomain';

export interface PlatformDomainsFilters {
  readonly kind?: PlatformDomainKindFilter;
  readonly status?: DomainStatus;
  readonly attention?: boolean;
}

export interface UpdatePlatformDomainConfigurationPayload {
  readonly baseDomain: string;
}
