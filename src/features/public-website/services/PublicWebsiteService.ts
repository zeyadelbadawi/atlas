/**
 * Public Website Service (Prompt 11).
 *
 * The public-runtime counterpart to `WebsiteConfigurationService`
 * (`@features/website`) — deliberately a SEPARATE service, not an
 * extension of it, because the authorization shape is completely
 * different (no session, no `academyId` in the URL — the Academy is
 * resolved FROM the hostname, never trusted as a client-supplied
 * parameter) and the data returned is PUBLISHED-only by contract, never
 * draft. This mirrors the same "third service tree over a related
 * domain" reasoning `InstructorService`/`PlatformPaymentService`/
 * `PlatformProvisioningService` already established.
 *
 * Every method here is a real, unauthenticated-shaped HTTP call through
 * the existing `BaseService`/`apiClient` — `apiClient` already tolerates
 * requests with no access token (the same client sign-in itself uses),
 * so no second HTTP client was introduced.
 */
import { BaseService, isApiError } from '@services';
import type { ReadOptions } from '@services';
import type { HostnameResolution, WebsiteConfiguration, WebsitePage } from '@types';

export class PublicWebsiteService extends BaseService {
  protected readonly resource = 'public';

  /**
   * Resolves a hostname to an Academy. Returns `null` for a genuinely
   * unrecognized hostname (a normal, expected outcome for a public
   * visitor — never treated as a query error); any other failure
   * (network/server) is rethrown so the caller can distinguish "unknown
   * hostname" from "infrastructure unavailable" (see
   * `Reports/ARCHITECTURE.md`, Prompt 11, "Public Runtime Error States").
   */
  async resolveHostname(
    hostname: string,
    options?: ReadOptions
  ): Promise<HostnameResolution | null> {
    try {
      return await this.client.get<HostnameResolution>(this.path('websites', 'resolve'), {
        ...options,
        params: { hostname },
      });
    } catch (error) {
      if (isApiError(error) && error.kind === 'notFound') return null;
      throw error;
    }
  }

  /** The Academy's PUBLISHED website configuration only — the backend is the sole authority that a draft never reaches this response. */
  async getPublishedWebsite(
    academyId: string,
    options?: ReadOptions
  ): Promise<WebsiteConfiguration> {
    return this.client.get<WebsiteConfiguration>(
      this.path('websites', academyId),
      options
    );
  }

  /** Every published, visible page for the Academy's website. */
  async getPublishedPages(
    academyId: string,
    options?: ReadOptions
  ): Promise<readonly WebsitePage[]> {
    return this.client.get<readonly WebsitePage[]>(
      this.path('websites', academyId, 'pages'),
      options
    );
  }

  /** One published page by slug. `null` for a genuinely unknown/unpublished/hidden slug. */
  async getPublishedPage(
    academyId: string,
    slug: string,
    options?: ReadOptions
  ): Promise<WebsitePage | null> {
    try {
      return await this.client.get<WebsitePage>(
        this.path('websites', academyId, 'pages', slug),
        options
      );
    } catch (error) {
      if (isApiError(error) && error.kind === 'notFound') return null;
      throw error;
    }
  }
}

/** Singleton instance following the Atlas service pattern. */
export const publicWebsiteService = new PublicWebsiteService();
