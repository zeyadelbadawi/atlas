/**
 * Website CMS Content domain types (Prompt 10).
 *
 * Structured, reusable website content — distinct from a page's own
 * inline section content (Prompt 9's `FaqItem`/`TestimonialItem`). Both
 * now share this same `LocalizedText` shape as of Phase 6 (Bilingual
 * Academy Websites) — this file's original doc comment described
 * page-inline content as "remain[ing] single-locale, page-authored
 * strings, unchanged," which was the correct, deliberate boundary before
 * Phase 6 but is superseded by it: every visitor-facing copy field across
 * both the CMS library (this file) and inline section content
 * (`website-section.types.ts`) is `LocalizedText` now, for the same
 * reason — a website that only exists in one language is not "bilingual
 * by default." A CMS entry here remains distinct in one real way: it is
 * Academy-scoped LIBRARY content, authored once, carrying its own
 * draft/published/archived lifecycle, and can be referenced by id from any
 * number of FAQ or Testimonials sections across a website (see
 * `FaqSectionConfig.libraryEntryIds` / `TestimonialsSectionConfig.libraryEntryIds`
 * in `website-section.types.ts`) instead of the same content being
 * copy-pasted into every page that wants it — inline content is still
 * page-specific and one-off, just no longer single-locale.
 *
 * Both entry types below share one deliberate shape (localized fields +
 * `order` + `visible` + `status`), which is itself the extension point:
 * a future content type (e.g. Team Members, Partners) is a new file that
 * follows the same shape and the same service/hook pattern, not a new
 * CMS framework.
 */

/** A piece of tenant-authored content independently editable in English and Arabic — never a translation key, and never inferred/machine-translated. */
export interface LocalizedText {
  readonly en: string;
  readonly ar: string;
}

/**
 * Content lifecycle. `archived` is a terminal, non-destructive state —
 * archiving removes an entry from active website rendering without
 * deleting it; there is deliberately no hard-delete for CMS content (see
 * `Reports/ARCHITECTURE.md`, Prompt 10, "Content Lifecycle").
 */
export type WebsiteContentStatus = 'draft' | 'published' | 'archived';

export interface WebsiteFaqEntry {
  readonly id: string;
  readonly academyId: string;
  readonly question: LocalizedText;
  readonly answer: LocalizedText;
  readonly order: number;
  readonly visible: boolean;
  readonly status: WebsiteContentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWebsiteFaqEntryPayload {
  readonly question: LocalizedText;
  readonly answer: LocalizedText;
}

export interface UpdateWebsiteFaqEntryPayload {
  readonly question?: LocalizedText;
  readonly answer?: LocalizedText;
  readonly order?: number;
  readonly visible?: boolean;
}

export interface WebsiteTestimonialEntry {
  readonly id: string;
  readonly academyId: string;
  readonly quote: LocalizedText;
  readonly authorName: string;
  readonly authorRole?: LocalizedText;
  /** Reuses the existing website image-asset convention (`useFilePicker` + base64) — never a second upload pipeline. */
  readonly avatar?: string;
  readonly order: number;
  readonly visible: boolean;
  readonly status: WebsiteContentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWebsiteTestimonialEntryPayload {
  readonly quote: LocalizedText;
  readonly authorName: string;
  readonly authorRole?: LocalizedText;
  readonly avatar?: string;
}

export interface UpdateWebsiteTestimonialEntryPayload {
  readonly quote?: LocalizedText;
  readonly authorName?: string;
  readonly authorRole?: LocalizedText;
  readonly avatar?: string;
  readonly order?: number;
  readonly visible?: boolean;
}
