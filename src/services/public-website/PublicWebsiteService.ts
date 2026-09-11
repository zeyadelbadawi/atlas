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
import { BaseService } from '../base.service';
// Imported from `@api` directly rather than from this package's own `@services`
// barrel — the barrel re-exports this very file, so routing through it would
// close a cycle.
import { isApiError, toCollectionParams } from '@api';
import type { ReadOptions } from '@api';
import type {
  AcademyIdentity,
  ContactMessagePayload,
  Course,
  CourseListQuery,
  HostnameResolution,
  PaginatedResult,
  PublicCourseCurriculumSection,
  PublicWebsiteStatistics,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';

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
      return await this.client.get<HostnameResolution>(
        this.path('websites', 'resolve'),
        {
          ...options,
          params: { hostname },
        }
      );
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

  /** Phase 6 — the combined Academy Identity/Branding read, reused by the public site, the LMS, and the dashboard. `null` for a genuinely unrecognized academyId, same convention as `resolveHostname`. */
  async getIdentity(
    academyId: string,
    options?: ReadOptions
  ): Promise<AcademyIdentity | null> {
    try {
      return await this.client.get<AcademyIdentity>(
        this.path('websites', academyId, 'identity'),
        options
      );
    } catch (error) {
      if (isApiError(error) && error.kind === 'notFound') return null;
      throw error;
    }
  }

  /** Phase 6 — `StatisticsSection`'s real, live counts. `null` for a genuinely unrecognized academyId, same convention as `resolveHostname`. */
  async getStatistics(
    academyId: string,
    options?: ReadOptions
  ): Promise<PublicWebsiteStatistics | null> {
    try {
      return await this.client.get<PublicWebsiteStatistics>(
        this.path('websites', academyId, 'statistics'),
        options
      );
    } catch (error) {
      if (isApiError(error) && error.kind === 'notFound') return null;
      throw error;
    }
  }

  /**
   * `FeaturedCoursesSection`/`InstructorsSection`'s real, public,
   * published-only course list — added after both sections were found
   * calling the tenant-scoped `courseService.getCourses` (`@features/
   * course`), which 403s for any real visitor with no `OrganizationMembership`
   * in this Academy's org (i.e. every genuine public visitor). `null` for a
   * genuinely unrecognized academyId, same convention as `resolveHostname`.
   */
  async getPublicCourses(
    academyId: string,
    query?: CourseListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Course> | null> {
    try {
      return await this.client.get<PaginatedResult<Course>>(
        this.path('websites', academyId, 'courses'),
        {
          ...options,
          params: { ...toCollectionParams(query), ...options?.params },
        }
      );
    } catch (error) {
      if (isApiError(error) && error.kind === 'notFound') return null;
      throw error;
    }
  }

  /**
   * The public Course Details page's real data source — `null` for a
   * genuinely unknown/unpublished/private/wrong-academy course, same
   * convention as `resolveHostname`. See backend
   * `PublicWebsiteService.getPublicCourse`'s own doc comment for the real
   * 401 bug this replaces (the page previously called the tenant-scoped
   * `useCourse`, which fails for every unauthenticated visitor).
   */
  async getPublicCourse(
    academyId: string,
    courseId: string,
    options?: ReadOptions
  ): Promise<Course | null> {
    try {
      return await this.client.get<Course>(
        this.path('websites', academyId, 'courses', courseId),
        options
      );
    } catch (error) {
      if (isApiError(error) && error.kind === 'notFound') return null;
      throw error;
    }
  }

  /** The public Course Details page's curriculum preview — real section/lesson titles, never gated `contentUrl`/`description`. `null` for the same not-found cases as `getPublicCourse`. */
  async getPublicCourseCurriculum(
    academyId: string,
    courseId: string,
    options?: ReadOptions
  ): Promise<readonly PublicCourseCurriculumSection[] | null> {
    try {
      return await this.client.get<readonly PublicCourseCurriculumSection[]>(
        this.path('websites', academyId, 'courses', courseId, 'curriculum'),
        options
      );
    } catch (error) {
      if (isApiError(error) && error.kind === 'notFound') return null;
      throw error;
    }
  }

  /** Phase 6 — the real backend destination for the public Contact section's form (previously an intentional no-op). */
  async submitContactMessage(
    academyId: string,
    payload: ContactMessagePayload
  ): Promise<void> {
    await this.client.post(
      this.path('websites', academyId, 'contact'),
      payload
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const publicWebsiteService = new PublicWebsiteService();
