/**
 * Provisioning domain types (Prompt 8).
 *
 * Represents the lifecycle that turns an authorized request into a ready
 * Academy: Tenant → Academy → Theme → Branding → Subdomain → Domain →
 * Provisioning → Ready. This is an ORCHESTRATION contract, not
 * infrastructure — nothing here knows about databases, containers, DNS
 * providers, or deployment mechanics (see `Reports/ARCHITECTURE.md`,
 * Prompt 8, "No Infrastructure Leakage"). The domain speaks only in
 * business capabilities: create academy, apply theme, apply branding,
 * allocate subdomain, connect domain, provision, complete.
 *
 * Tenant/Organization identity, Plan/entitlement limits and Academy's own
 * record shape remain owned by Prompt 6/Prompt 3B respectively — this file
 * only adds `organizationId`/`academyId` references, never redeclares them.
 */

/**
 * A ProvisioningRequest's overall milestone — which stage of the canonical
 * lifecycle it has reached. Coarser than step-level state (`ProvisioningStep`
 * below carries the real per-operation detail); this is the "where are we"
 * summary a list/history view reads.
 */
export type ProvisioningStatus =
  | 'payment_success'
  | 'tenant_created'
  | 'academy_created'
  | 'theme_applied'
  | 'branding_applied'
  | 'subdomain_assigned'
  | 'custom_domain_pending'
  | 'custom_domain_connected'
  | 'provisioning'
  | 'ready'
  | 'failed'
  | 'cancelled';

/** Terminal statuses — once reached, polling stops (see `useProvisioningRequest`). */
export const TERMINAL_PROVISIONING_STATUSES: readonly ProvisioningStatus[] = [
  'ready',
  'failed',
  'cancelled',
];

/**
 * The named steps every ProvisioningRequest's orchestration walks through.
 * `tenant` exists for observability/completeness — Prompt 8 does NOT create
 * Tenants itself (that remains the existing registration/Organization
 * flow); a request is always created within an already-authenticated
 * Tenant context, so the backend reports this step `'completed'` or
 * `'skipped'`, never something the frontend triggers. `theme` is
 * represented only as an assignment boundary — Prompt 8 does not implement
 * a Theme Engine (that is Prompt 9's), so this step has no picker UI today
 * and is reported `'skipped'` until one exists.
 */
export type ProvisioningStepKey =
  | 'tenant'
  | 'academy'
  | 'theme'
  | 'branding'
  | 'subdomain'
  | 'domain'
  | 'finalization';

export type ProvisioningStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * A safe, user-facing error. `messageKey` is a translation key the UI can
 * always show a customer; `detail` is raw backend/diagnostic text shown
 * only where the viewer is authorized (the Platform Provisioning console),
 * never on the customer-facing status page (see
 * `Reports/ARCHITECTURE.md`, Prompt 8, "Provisioning Failure UX").
 */
export interface ProvisioningError {
  readonly code: string;
  readonly messageKey: string;
  readonly detail?: string;
}

export interface ProvisioningStep {
  readonly key: ProvisioningStepKey;
  readonly status: ProvisioningStepStatus;
  readonly attemptNumber: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly failedAt?: string;
  readonly error?: ProvisioningError;
}

/** Where a subdomain allocation currently stands. */
export type SubdomainStatus =
  | 'suggested'
  | 'available'
  | 'unavailable'
  | 'reserved'
  | 'assigned';

export interface SubdomainAllocation {
  readonly subdomain: string;
  readonly status: SubdomainStatus;
  /** Full backend-resolved host (e.g. an Atlas subdomain address) — never constructed on the frontend from a guessed root domain. */
  readonly fullHost?: string;
}

/**
 * A custom domain's connection state. Represents ONLY the status/metadata
 * a customer needs to see — no real DNS record creation, no SSL issuance,
 * no verification infrastructure exists behind this (see
 * `Reports/ARCHITECTURE.md`, Prompt 8, "Custom Domain Abstraction").
 */
export type DomainStatus =
  | 'not_configured'
  | 'pending'
  | 'verification_required'
  | 'verifying'
  | 'connected'
  | 'failed'
  | 'disconnected';

/** One DNS record the customer would configure at their registrar — display data only, never acted on by the frontend. */
export interface DomainVerificationRecord {
  readonly type: string;
  readonly name: string;
  readonly value: string;
}

export interface DomainConnection {
  readonly hostname?: string;
  readonly status: DomainStatus;
  readonly verificationRecords?: readonly DomainVerificationRecord[];
  readonly connectedAt?: string;
}

/**
 * The provisioning request itself. Always Tenant-scoped
 * (`organizationId`) — never addressable by an arbitrary id without that
 * scope (see `Reports/ARCHITECTURE.md`, Prompt 8, "Tenant Isolation").
 * `academyId` is populated once the `academy` step completes; before that
 * it is absent, not a placeholder id.
 */
export interface ProvisioningRequest {
  readonly id: string;
  readonly organizationId: string;
  readonly academyId?: string;
  readonly status: ProvisioningStatus;
  readonly currentStepKey: ProvisioningStepKey;
  readonly steps: readonly ProvisioningStep[];
  readonly subdomain?: SubdomainAllocation;
  readonly domain?: DomainConnection;
  /** Replayed verbatim on retry — see `generateProvisioningIdempotencyKey`. */
  readonly idempotencyKey: string;
  readonly attemptCount: number;
  readonly requestedAcademyName: string;
  readonly requestedSubdomain: string;
  /** Present only when this request was triggered by a specific Prompt 7 Payment (e.g. a plan/academy-slot purchase) — not every request needs one, since an existing Tenant may still be within its plan's academy limit. */
  readonly triggeringPaymentId?: string;
  readonly lastError?: ProvisioningError;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly failedAt?: string;
}

export interface CreateProvisioningRequestPayload {
  readonly academyName: string;
  readonly requestedSubdomain: string;
  readonly triggeringPaymentId?: string;
  readonly idempotencyKey: string;
}

/**
 * Normalized provisioning event contract — documentation for a future
 * observability/audit backend, not consumed by any frontend runtime code
 * path, the same "documented contract only" treatment
 * `PaymentWebhookEvent` (Prompt 7) got. Provisioning progress reaches the
 * UI exclusively through polling `ProvisioningRequest`/`ProvisioningStep`,
 * never through these events directly.
 */
export type ProvisioningEventType =
  | 'provisioning.request_created'
  | 'provisioning.step_started'
  | 'provisioning.step_completed'
  | 'provisioning.step_failed'
  | 'provisioning.retry_requested'
  | 'provisioning.resumed'
  | 'provisioning.completed'
  | 'provisioning.cancelled';

export interface ProvisioningEvent {
  readonly id: string;
  readonly type: ProvisioningEventType;
  readonly requestId: string;
  readonly stepKey?: ProvisioningStepKey;
  readonly occurredAt: string;
}
