/**
 * Sample social proof (Theme 1 plan §D.4) — the frontend mirror of the
 * backend's `collectSampleContent`: which saved pages/sections still hold
 * `sample: true` items (testimonials, results, schedule rows, video reviews), so the publish dialog can warn before
 * publishing (a warning, never a block). The publish response carries the
 * server's own list too.
 */
import type {
  SampleContentEntry,
  SectionInstance,
  SectionType,
  WebsitePage,
} from '@types';

/**
 * The section types whose `items` may hold `sample: true` starter items —
 * the backend's `SAMPLE_ITEM_SECTION_TYPES` exactly. CMS phase 3d adds
 * student results and the class schedule: a starter "top student" or a
 * starter timetable on the live site would be invented facts.
 */
export const SAMPLE_ITEM_SECTION_TYPES: ReadonlySet<SectionType> = new Set([
  'testimonials',
  'results',
  'schedule',
  // CMS phase 3d (batch D) — a starter video review is an invented one.
  'videoTestimonials',
]);

export function countSampleItems(
  section: SectionInstance | null | undefined
): number {
  if (!section || !SAMPLE_ITEM_SECTION_TYPES.has(section.type)) return 0;
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
