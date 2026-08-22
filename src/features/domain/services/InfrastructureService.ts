/**
 * Infrastructure Service (Prompt 11).
 *
 * The provider-abstraction boundary this prompt's "Cloudflare Readiness"
 * requirement asks for — a flat, account-level status check, distinct
 * from `DomainService` (which is per-Academy domain lifecycle).
 * `getProviderStatus` answers one question only: "does Atlas's backend
 * currently have real, working infrastructure-provider credentials
 * configured at all?" — never assumed `true` by the frontend.
 *
 * Credentials themselves NEVER reach this layer or the frontend at all —
 * they are a server-side-only concern (see
 * `Reports/ARCHITECTURE.md`, Prompt 11, "Cloudflare Configuration"). This
 * service only reads a safe, public status flag the backend computes.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { InfrastructureProviderName, InfrastructureProviderStatus } from '@types';

export class InfrastructureService extends BaseService {
  protected readonly resource = 'infrastructure';

  /** Reports whether the given provider is genuinely connected — never faked, never optimistic. */
  async getProviderStatus(
    provider: InfrastructureProviderName,
    options?: ReadOptions
  ): Promise<InfrastructureProviderStatus> {
    return this.client.get<InfrastructureProviderStatus>(
      this.path(provider, 'status'),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const infrastructureService = new InfrastructureService();
