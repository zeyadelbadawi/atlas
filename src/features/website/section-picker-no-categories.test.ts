/**
 * B0-LRN-04 — academies cannot create course categories, so the "Add
 * section" picker no longer offers the Course categories section (it would
 * never render publicly). A page that already contains one keeps working:
 * the section type, its metadata and its config schema are unchanged.
 */
import { describe, expect, it } from 'vitest';
import { SECTION_TYPE_ORDER } from './constants/website.constants';
import { SECTION_METADATA } from './sections/section-metadata.registry';
import { courseCategoriesSectionSchema } from './schemas/website-section.schemas';

describe('Add section picker — course categories', () => {
  it('is not offered for new sections', () => {
    expect(SECTION_TYPE_ORDER).not.toContain('courseCategories');
  });

  it('still offers the other section types', () => {
    expect(SECTION_TYPE_ORDER).toContain('courseCatalog');
    expect(SECTION_TYPE_ORDER).toContain('featuredCourses');
  });

  it('still knows the section, so existing pages load', () => {
    expect(SECTION_METADATA.courseCategories.type).toBe('courseCategories');
    expect(
      courseCategoriesSectionSchema.safeParse({ maxItems: 6, showCounts: true })
        .success
    ).toBe(true);
  });
});
