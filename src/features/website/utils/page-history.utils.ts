/**
 * CMS phase 4 — page history: what a refused restore means, as something
 * the author can read and act on. Pure, so each case can be asserted.
 *
 * The restore endpoint answers (see the phase-4 contract):
 * - 409 `stale_resource_version`: the page was saved since it was loaded;
 * - 422 `website_page_version_invalid` with `violations` whose fields are
 *   prefixed (`sections.0.type`, `seo.title.en`, `slug`, …): the kept copy
 *   fails today's rules, nothing was written;
 * - 409 `errors.website.slugTaken` / `errors.website.slugReserved`: the
 *   copy's address now belongs to another page / is reserved;
 * - 404: the version (or page) is gone — older versions are pruned.
 */
import type { ApiError } from '@api';
import type { SectionType, WebsitePageVersionKind } from '@types';
import { readSaveConflict, type SaveConflict } from './save-conflict.utils';

export const PAGE_VERSION_INVALID_CODE = 'website_page_version_invalid';

/** The label key of each kind of kept version. */
export const PAGE_VERSION_KIND_LABEL_KEYS: Record<
  WebsitePageVersionKind,
  string
> = {
  published: 'website:history.kind.published',
  draft_snapshot: 'website:history.kind.draft_snapshot',
  restore_backup: 'website:history.kind.restore_backup',
};

export type RestoreFailure =
  | { readonly type: 'stale'; readonly conflict: SaveConflict }
  | { readonly type: 'invalid'; readonly parts: readonly InvalidPart[] }
  | { readonly type: 'slugTaken' }
  | { readonly type: 'slugReserved' }
  | { readonly type: 'notFound' }
  | { readonly type: 'other' };

/** One part of a kept copy that no longer passes today's rules. */
export type InvalidPart =
  | {
      readonly kind: 'section';
      /** Zero-based position in the kept copy's sections. */
      readonly index: number;
      readonly sectionType?: SectionType;
    }
  | { readonly kind: 'title' | 'slug' | 'seo' | 'visible' | 'other' };

/**
 * The parts of the kept copy the API named, in a stable order (page
 * fields first, then sections in page order), each once.
 */
export function invalidPartsOf(
  violations: readonly { readonly field: string }[] | undefined,
  sections: readonly { readonly type: string }[]
): InvalidPart[] {
  const page = new Set<'title' | 'slug' | 'seo' | 'visible' | 'other'>();
  const sectionIndexes = new Set<number>();
  for (const { field } of violations ?? []) {
    const [head, second] = field.split('.');
    if (head === 'sections') {
      const index = Number(second);
      if (Number.isInteger(index) && index >= 0) {
        sectionIndexes.add(index);
        continue;
      }
    }
    if (head === 'title' || head === 'slug' || head === 'seo') page.add(head);
    else if (head === 'visible') page.add('visible');
    else page.add('other');
  }
  const order = ['title', 'slug', 'visible', 'seo', 'other'] as const;
  return [
    ...order
      .filter((kind) => page.has(kind))
      .map((kind) => ({ kind }) as InvalidPart),
    ...[...sectionIndexes]
      .sort((a, b) => a - b)
      .map((index): InvalidPart => ({
        kind: 'section',
        index,
        sectionType: sections[index]?.type as SectionType | undefined,
      })),
  ];
}

/** What a refused restore means (see this file's doc comment). */
export function readRestoreFailure(
  error: ApiError | null,
  sections: readonly { readonly type: string }[]
): RestoreFailure | null {
  if (!error) return null;
  const conflict = readSaveConflict(error);
  if (conflict) return { type: 'stale', conflict };
  if (
    error.code === PAGE_VERSION_INVALID_CODE ||
    error.messageKey === 'errors.website.versionNoLongerValid'
  ) {
    return {
      type: 'invalid',
      parts: invalidPartsOf(error.violations, sections),
    };
  }
  if (error.messageKey === 'errors.website.slugTaken')
    return { type: 'slugTaken' };
  if (error.messageKey === 'errors.website.slugReserved')
    return { type: 'slugReserved' };
  if (error.kind === 'notFound' || error.status === 404)
    return { type: 'notFound' };
  return { type: 'other' };
}
