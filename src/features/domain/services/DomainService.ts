/**
 * Domain Service (Prompt 11).
 *
 * An Academy's ONGOING domain configuration — distinct from Prompt 8's
 * `DomainConnection`/`SubdomainAllocation`, which are a one-time snapshot
 * captured during Academy provisioning. This service lets an Academy
 * Owner view/manage their domain at any time afterward, nested under the
 * same `academies/:academyId/website/...` resource tree
 * `WebsiteConfigurationService`/`WebsiteContentService` already
 * established. It reuses Prompt 8's `DomainConnection`/
 * `DomainVerificationRecord`/`SubdomainAllocation` TYPES verbatim (see
 * `domain.types.ts`) — this file adds behavior around them, never a
 * parallel status vocabulary.
 *
 * Every method here is a real HTTP call through the existing
 * `BaseService`/`apiClient` — there is no real DNS/SSL/CDN provisioning
 * behind any of it yet (see `Reports/ARCHITECTURE.md`, Prompt 11, "No
 * Fake Infrastructure"). The frontend never marks a domain
 * verified/active itself; it only ever reflects what the backend
 * authoritatively reports.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { AcademyDomainConfiguration, AddCustomDomainPayload } from '@types';

export class DomainService extends BaseService {
  protected readonly resource = 'academies';

  private domainPath(academyId: string, ...segments: readonly string[]): string {
    return this.path(academyId, 'website', 'domain', ...segments);
  }

  /** Retrieves the Academy's current domain configuration — Atlas subdomain, optional custom domain, SSL/CDN status. */
  async getDomainConfiguration(
    academyId: string,
    options?: ReadOptions
  ): Promise<AcademyDomainConfiguration> {
    return this.client.get<AcademyDomainConfiguration>(this.domainPath(academyId), options);
  }

  /** Begins connecting a custom domain — creates a PENDING association and the DNS verification instructions the owner must configure. Never itself touches real DNS. */
  async addCustomDomain(
    academyId: string,
    payload: AddCustomDomainPayload,
    options?: WriteOptions
  ): Promise<AcademyDomainConfiguration> {
    return this.client.post<AcademyDomainConfiguration, AddCustomDomainPayload>(
      this.domainPath(academyId, 'custom-domain'),
      payload,
      options
    );
  }

  /** Disconnects the Academy's custom domain. The Atlas subdomain is unaffected and remains the fallback address. */
  async removeCustomDomain(
    academyId: string,
    options?: WriteOptions
  ): Promise<AcademyDomainConfiguration> {
    return this.client.delete<AcademyDomainConfiguration>(
      this.domainPath(academyId, 'custom-domain'),
      options
    );
  }

  /** Asks the backend to (re-)check the DNS verification record. The backend is the sole authority on whether it actually resolves — this call never simulates success. */
  async verifyDomain(
    academyId: string,
    options?: WriteOptions
  ): Promise<AcademyDomainConfiguration> {
    return this.client.post<AcademyDomainConfiguration, undefined>(
      this.domainPath(academyId, 'verify'),
      undefined,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const domainService = new DomainService();
