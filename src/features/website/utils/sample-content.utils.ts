/**
 * Sample social proof (Theme 1 plan §D.4) — the frontend mirror of the
 * backend's `collectSampleContent`: which saved pages/sections still hold
 * `sample: true` testimonials, so the publish dialog can warn before
 * publishing (a warning, never a block). The publish response carries the
 * server's own list too.
 */
import type { SampleContentEntry, SectionInstance, WebsitePage } from '@types';

export function countSampleItems(
  section: SectionInstance | null | undefined
): number {
  if (section?.type !== 'testimonials') return 0;
  const items = (section.config as { items?: unknown } | undefined)?.items;
  if (!Array.isArray(items)) return 0;
  return items.filter(
    (item) => (item as { sample?: unknown } | null)?.sample === true
  ).length;
}

/** Every section, on every page, that still holds sample items — in page and section order. */
export function collectSampleContent(
  pages: readonly Pick<WebsitePage, 'id' | 'title' | 'sections'>[]
): SampleContentEntry[] {
  const entries: SampleContentEntry[] = [];
  for (const page of pages) {
    for (const section of page.sections ?? []) {
      const sampleItems = countSampleItems(section);
      if (sampleItems > 0) {
        entries.push({
          pageId: page.id,
          pageTitle: page.title,
          sectionId: section.id,
          sectionType: section.type,
          sampleItems,
        });
      }
    }
  }
  return entries;
}
