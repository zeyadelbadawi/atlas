/**
 * Website Configuration Service.
 *
 * Every website belongs to a specific Academy, so every operation is
 * nested under that Academy's resource path — the same nesting pattern
 * `CourseService` already uses (`academies/:academyId/courses/...`).
 * Extends BaseService to keep the same architectural contract.
 *
 * Section add/remove/hide/edit/duplicate are all expressed as one
 * "replace this page's section array" PATCH (`updatePage`) — matching how
 * the rest of Atlas treats a record's sub-array (e.g. `AcademyService`
 * updating a whole record via one PATCH). `reorderPageSections` is kept as
 * a separate, dedicated fast-path because Course Management (Prompt 3C)
 * already established that exact precedent (`reorderCourseSections`) for
 * drag/keyboard reordering, reusing the same `ReorderItemsPayload` shape.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CreateWebsitePagePayload,
  PaginatedResult,
  CollectionQuery,
  QueryParams,
  ReorderItemsPayload,
  UpdateWebsiteConfigurationPayload,
  UpdateWebsitePagePayload,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';

export class WebsiteConfigurationService extends BaseService {
  protected readonly resource = 'academies';

  private websitePath(academyId: string, ...segments: readonly string[]): string {
    return this.path(academyId, 'website', ...segments);
  }

  /** Retrieves the Academy's website configuration — always the current draft working copy. */
  async getConfiguration(
    academyId: string,
    options?: ReadOptions
  ): Promise<WebsiteConfiguration> {
    return this.client.get<WebsiteConfiguration>(
      this.websitePath(academyId, 'configuration'),
      options
    );
  }

  /** Updates the draft configuration (theme, brand, SEO, navigation, header, footer). Never changes what's published. */
  async updateConfiguration(
    academyId: string,
    payload: UpdateWebsiteConfigurationPayload,
    options?: WriteOptions
  ): Promise<WebsiteConfiguration> {
    return this.client.patch<WebsiteConfiguration, UpdateWebsiteConfigurationPayload>(
      this.websitePath(academyId, 'configuration'),
      payload,
      options
    );
  }

  /** Promotes the current draft to published. The backend is the sole authority on when this actually succeeds — the frontend never marks a website "Published" itself. */
  async publishConfiguration(
    academyId: string,
    options?: WriteOptions
  ): Promise<WebsiteConfiguration> {
    return this.client.post<WebsiteConfiguration, undefined>(
      this.websitePath(academyId, 'publish'),
      undefined,
      options
    );
  }

  /** Retrieves every page (core + custom) for the Academy's website. */
  async getPages(
    academyId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<WebsitePage>> {
    return this.client.get<PaginatedResult<WebsitePage>>(
      this.websitePath(academyId, 'pages'),
      { ...options, params: query as QueryParams }
    );
  }

  /** Retrieves one page, including its section composition. */
  async getPage(
    academyId: string,
    pageId: string,
    options?: ReadOptions
  ): Promise<WebsitePage> {
    return this.client.get<WebsitePage>(
      this.websitePath(academyId, 'pages', pageId),
      options
    );
  }

  /** Creates a custom page. Slug uniqueness is enforced by the backend, scoped to this Academy. */
  async createPage(
    academyId: string,
    payload: CreateWebsitePagePayload,
    options?: WriteOptions
  ): Promise<WebsitePage> {
    return this.client.post<WebsitePage, CreateWebsitePagePayload>(
      this.websitePath(academyId, 'pages'),
      payload,
      options
    );
  }

  /** Updates a page — title/slug/visibility/SEO, or its full section composition (add/remove/hide/edit/duplicate all flow through `sections`). */
  async updatePage(
    academyId: string,
    pageId: string,
    payload: UpdateWebsitePagePayload,
    options?: WriteOptions
  ): Promise<WebsitePage> {
    return this.client.patch<WebsitePage, UpdateWebsitePagePayload>(
      this.websitePath(academyId, 'pages', pageId),
      payload,
      options
    );
  }

  /** Deletes a custom page. Core pages cannot be deleted — the backend enforces this; the UI never offers the action for a core page. */
  async deletePage(
    academyId: string,
    pageId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(
      this.websitePath(academyId, 'pages', pageId),
      options
    );
  }

  /** Reorders a page's sections. Reuses the exact `ReorderItemsPayload` shape Course Management's curriculum reordering already established. */
  async reorderPageSections(
    academyId: string,
    pageId: string,
    payload: ReorderItemsPayload,
    options?: WriteOptions
  ): Promise<WebsitePage> {
    return this.client.post<WebsitePage, ReorderItemsPayload>(
      this.websitePath(academyId, 'pages', pageId, 'sections', 'reorder'),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const websiteConfigurationService = new WebsiteConfigurationService();
