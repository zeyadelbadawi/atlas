/**
 * Platform Organization Administration types (Prompt 13).
 *
 * The Platform Owner's cross-tenant view of every Organization on Atlas —
 * distinct from `OrganizationContext` (the CURRENT user's own active
 * organization, Prompt 1/2) and from `TenantSubscription`/`TenantUsage`
 * (a Tenant's OWN view of its own subscription, Prompt 6). This is a
 * read-only console: no mutation is defined here, because no
 * organization-administration mutation (suspend/archive/edit) is defined
 * by the product specification — building one would be inventing a
 * business rule (see `Reports/ARCHITECTURE.md`, Prompt 13, "Read-Only By
 * Specification Boundary").
 *
 * References existing domain types (`TenantSubscription`, `TenantUsage`)
 * rather than duplicating their shape — an organization's subscription
 * IS the same `TenantSubscription` a Tenant Owner already sees of their
 * own organization, just read here from the Platform Owner's vantage
 * point.
 */
import type { TenantSubscription, TenantUsage } from './tenant.types';

/**
 * An organization's operational status on the platform. Distinct from
 * `TenantSubscriptionStatus` (which describes the subscription's
 * lifecycle, not the organization record itself) — mirrors the shape
 * `AcademyStatus` already establishes for a comparable concept.
 */
export type PlatformOrganizationStatus = 'active' | 'suspended' | 'archived';

/** A lightweight reference to one of the organization's academies — never a full `Academy` projection (see Global Academy Console for the authoritative full view). */
export interface PlatformOrganizationAcademyRef {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

/** A lightweight reference to one of the organization's members. */
export interface PlatformOrganizationMemberRef {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

/** One row in the Platform Owner's organization list. */
export interface PlatformOrganizationSummary {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly status: PlatformOrganizationStatus;
  readonly planName?: string;
  readonly subscriptionStatus?: string;
  readonly academyCount: number;
  readonly memberCount: number;
  readonly createdAt: string;
}

/** The full detail view — subscription/usage reused verbatim from the Tenant SaaS domain (Prompt 6), never re-shaped. */
export interface PlatformOrganizationDetail extends PlatformOrganizationSummary {
  readonly ownerName?: string;
  readonly ownerEmail?: string;
  /**
   * B0-IAM-08 — present ONLY when the owner opted in to WhatsApp contact at
   * sign-up (the server never returns it otherwise, and never a learner's).
   */
  readonly ownerPhone?: PlatformOrganizationOwnerPhone;
  /** B0-ANL-04 — sanitised sign-up attribution, or `null` (untagged / not captured). */
  readonly signupAttribution?: Readonly<Record<string, string>> | null;
  readonly subscription?: TenantSubscription;
  readonly usage?: TenantUsage;
  readonly academies: readonly PlatformOrganizationAcademyRef[];
  readonly members: readonly PlatformOrganizationMemberRef[];
}

/** B0-IAM-08 — an opted-in organization owner's number and the consent it rests on. */
export interface PlatformOrganizationOwnerPhone {
  readonly e164: string;
  readonly country: string;
  readonly whatsappConsentAt: string;
  readonly whatsappConsentVersion: string;
}
