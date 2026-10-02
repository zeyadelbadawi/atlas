/**
 * The content-library entries a FAQ / Testimonials section shows.
 *
 * ONE rule on both surfaces — published, visible, this Academy's, in the
 * order the Owner picked (`libraryEntryIds`), each id once — applied by
 * whoever can apply it:
 *   - PUBLIC site: the public pages API has already resolved them into
 *     `config.libraryEntries` (server-side, RLS-scoped, public fields
 *     only). Nothing is fetched: a visitor has no access to the
 *     management API, and must not need it.
 *   - DASHBOARD preview (signed-in staff): the management library read,
 *     filtered here by the same rule, so the preview shows what will be
 *     public — not drafts or hidden entries.
 * Which surface this is follows the renderer's own contract: the public
 * runtime supplies a `linkRenderer`, a preview does not
 * (`website-link-renderer.types.ts`).
 */
import type {
  FaqSectionConfig,
  PublicFaqLibraryEntry,
  PublicTestimonialLibraryEntry,
  TestimonialsSectionConfig,
  WebsiteFaqEntry,
  WebsiteTestimonialEntry,
} from '@types';
import { useWebsiteFaqEntries } from './useWebsiteFaqEntries';
import { useWebsiteTestimonialEntries } from './useWebsiteTestimonialEntries';

/** The library is small and bounded; one page at the API's maximum size covers it. */
export const LIBRARY_PREVIEW_QUERY = {
  pagination: { page: 1, pageSize: 100 },
  filters: { status: 'published' },
} as const;

type LibraryRow = {
  readonly id: string;
  readonly status: string;
  readonly visible: boolean;
};

/** The ids' entries that the public site would show, in id order, each once. */
export function selectPublicEntries<T extends LibraryRow>(
  ids: readonly string[],
  rows: readonly T[] | undefined
): T[] {
  if (!rows) return [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  return [...new Set(ids)].flatMap((id) => {
    const row = byId.get(id);
    return row && row.status === 'published' && row.visible ? [row] : [];
  });
}

export function toPublicFaqEntry(
  entry: WebsiteFaqEntry
): PublicFaqLibraryEntry {
  return { id: entry.id, question: entry.question, answer: entry.answer };
}

export function toPublicTestimonialEntry(
  entry: WebsiteTestimonialEntry
): PublicTestimonialLibraryEntry {
  return {
    id: entry.id,
    quote: entry.quote,
    authorName: entry.authorName,
    ...(entry.authorRole ? { authorRole: entry.authorRole } : {}),
    ...(entry.avatar ? { avatar: entry.avatar } : {}),
  };
}

export function useFaqLibraryEntries(
  config: FaqSectionConfig,
  academyId: string,
  isPreview: boolean
): readonly PublicFaqLibraryEntry[] {
  const ids = config.libraryEntryIds ?? [];
  const resolved = config.libraryEntries;
  const { data } = useWebsiteFaqEntries(academyId, {
    query: LIBRARY_PREVIEW_QUERY,
    enabled: isPreview && resolved === undefined && ids.length > 0,
  });
  if (resolved) return resolved;
  if (!isPreview) return [];
  return selectPublicEntries(ids, data?.items).map(toPublicFaqEntry);
}

export function useTestimonialLibraryEntries(
  config: TestimonialsSectionConfig,
  academyId: string,
  isPreview: boolean
): readonly PublicTestimonialLibraryEntry[] {
  const ids = config.libraryEntryIds ?? [];
  const resolved = config.libraryEntries;
  const { data } = useWebsiteTestimonialEntries(academyId, {
    query: LIBRARY_PREVIEW_QUERY,
    enabled: isPreview && resolved === undefined && ids.length > 0,
  });
  if (resolved) return resolved;
  if (!isPreview) return [];
  return selectPublicEntries(ids, data?.items).map(toPublicTestimonialEntry);
}
