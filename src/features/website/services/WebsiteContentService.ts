/**
 * Website Content Service (Prompt 10).
 *
 * The CMS layer's structured, reusable content — FAQ and Testimonial
 * library entries — nested under the same `academies/:academyId/website/`
 * resource tree `WebsiteConfigurationService` already established, kept
 * as its own service file because it is a genuinely separate domain
 * concern (content, not configuration/composition), the same reasoning
 * that split `CheckoutService`/`PaymentService` in Prompt 7.
 *
 * Every entry type follows one identical CRUD + publish + archive shape.
 * There is deliberately no `deleteEntry` — Archive is the one, terminal,
 * non-destructive removal action (see `Reports/ARCHITECTURE.md`, Prompt
 * 10, "Content Lifecycle"); this mirrors the existing `BlogService`
 * publish/archive precedent exactly, minus hard delete.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CollectionQuery,
  CreateWebsiteFaqEntryPayload,
  CreateWebsiteTestimonialEntryPayload,
  PaginatedResult,
  QueryParams,
  UpdateWebsiteFaqEntryPayload,
  UpdateWebsiteTestimonialEntryPayload,
  WebsiteFaqEntry,
  WebsiteTestimonialEntry,
} from '@types';

export class WebsiteContentService extends BaseService {
  protected readonly resource = 'academies';

  private contentPath(
    academyId: string,
    collection: 'faq-entries' | 'testimonial-entries',
    ...segments: readonly string[]
  ): string {
    return this.path(academyId, 'website', collection, ...segments);
  }

  /* ------------------------------ FAQ ------------------------------ */

  async getFaqEntries(
    academyId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<WebsiteFaqEntry>> {
    return this.client.get<PaginatedResult<WebsiteFaqEntry>>(
      this.contentPath(academyId, 'faq-entries'),
      { ...options, params: query as QueryParams }
    );
  }

  async getFaqEntry(
    academyId: string,
    entryId: string,
    options?: ReadOptions
  ): Promise<WebsiteFaqEntry> {
    return this.client.get<WebsiteFaqEntry>(
      this.contentPath(academyId, 'faq-entries', entryId),
      options
    );
  }

  async createFaqEntry(
    academyId: string,
    payload: CreateWebsiteFaqEntryPayload,
    options?: WriteOptions
  ): Promise<WebsiteFaqEntry> {
    return this.client.post<WebsiteFaqEntry, CreateWebsiteFaqEntryPayload>(
      this.contentPath(academyId, 'faq-entries'),
      payload,
      options
    );
  }

  async updateFaqEntry(
    academyId: string,
    entryId: string,
    payload: UpdateWebsiteFaqEntryPayload,
    options?: WriteOptions
  ): Promise<WebsiteFaqEntry> {
    return this.client.patch<WebsiteFaqEntry, UpdateWebsiteFaqEntryPayload>(
      this.contentPath(academyId, 'faq-entries', entryId),
      payload,
      options
    );
  }

  /** Draft → Published. A dedicated action, never implicit in a field edit — see the file's doc comment. */
  async publishFaqEntry(
    academyId: string,
    entryId: string,
    options?: WriteOptions
  ): Promise<WebsiteFaqEntry> {
    return this.client.post<WebsiteFaqEntry, undefined>(
      this.contentPath(academyId, 'faq-entries', entryId, 'publish'),
      undefined,
      options
    );
  }

  /** Terminal, non-destructive — see the file's doc comment. */
  async archiveFaqEntry(
    academyId: string,
    entryId: string,
    options?: WriteOptions
  ): Promise<WebsiteFaqEntry> {
    return this.client.post<WebsiteFaqEntry, undefined>(
      this.contentPath(academyId, 'faq-entries', entryId, 'archive'),
      undefined,
      options
    );
  }

  /* --------------------------- Testimonial -------------------------- */

  async getTestimonialEntries(
    academyId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<WebsiteTestimonialEntry>> {
    return this.client.get<PaginatedResult<WebsiteTestimonialEntry>>(
      this.contentPath(academyId, 'testimonial-entries'),
      { ...options, params: query as QueryParams }
    );
  }

  async getTestimonialEntry(
    academyId: string,
    entryId: string,
    options?: ReadOptions
  ): Promise<WebsiteTestimonialEntry> {
    return this.client.get<WebsiteTestimonialEntry>(
      this.contentPath(academyId, 'testimonial-entries', entryId),
      options
    );
  }

  async createTestimonialEntry(
    academyId: string,
    payload: CreateWebsiteTestimonialEntryPayload,
    options?: WriteOptions
  ): Promise<WebsiteTestimonialEntry> {
    return this.client.post<WebsiteTestimonialEntry, CreateWebsiteTestimonialEntryPayload>(
      this.contentPath(academyId, 'testimonial-entries'),
      payload,
      options
    );
  }

  async updateTestimonialEntry(
    academyId: string,
    entryId: string,
    payload: UpdateWebsiteTestimonialEntryPayload,
    options?: WriteOptions
  ): Promise<WebsiteTestimonialEntry> {
    return this.client.patch<WebsiteTestimonialEntry, UpdateWebsiteTestimonialEntryPayload>(
      this.contentPath(academyId, 'testimonial-entries', entryId),
      payload,
      options
    );
  }

  async publishTestimonialEntry(
    academyId: string,
    entryId: string,
    options?: WriteOptions
  ): Promise<WebsiteTestimonialEntry> {
    return this.client.post<WebsiteTestimonialEntry, undefined>(
      this.contentPath(academyId, 'testimonial-entries', entryId, 'publish'),
      undefined,
      options
    );
  }

  async archiveTestimonialEntry(
    academyId: string,
    entryId: string,
    options?: WriteOptions
  ): Promise<WebsiteTestimonialEntry> {
    return this.client.post<WebsiteTestimonialEntry, undefined>(
      this.contentPath(academyId, 'testimonial-entries', entryId, 'archive'),
      undefined,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const websiteContentService = new WebsiteContentService();
