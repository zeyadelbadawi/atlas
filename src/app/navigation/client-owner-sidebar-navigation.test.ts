/**
 * Client Owner sidebar cleanup: Revenue & payouts is not a sidebar entry,
 * there is exactly one Add-ons entry, and Student Analytics sits with the
 * academy items rather than under Cloud Services. The pages and routes
 * themselves stay registered and reachable by URL.
 */
import { describe, expect, it } from 'vitest';
import { flattenNavigation, getDashboardNavigation } from './navigation.config';

describe('Client Owner sidebar', () => {
  const sections = getDashboardNavigation('academy-1');
  const items = flattenNavigation(sections);
  const ids = items.map((item) => item.id);
  const section = (id: string) => sections.find((s) => s.id === id);

  it('does not link Revenue & payouts', () => {
    expect(ids).not.toContain('academy-revenue');
  });

  it('has a single Add-ons entry', () => {
    const addOnEntries = items.filter((item) =>
      ['add-ons-catalog', 'tenant-add-ons'].includes(item.id)
    );
    expect(addOnEntries.map((item) => item.id)).toEqual(['tenant-add-ons']);
  });

  it('lists Student Analytics with the academy items, with or without an active academy', () => {
    for (const academyId of [undefined, 'academy-1']) {
      const all = getDashboardNavigation(academyId);
      const academyIds = all
        .find((s) => s.id === 'academy')!
        .items.map((item) => item.id);
      expect(academyIds).toContain('student-analytics');
      const saasIds = all.find((s) => s.id === 'saas')!.items.map((item) => item.id);
      expect(saasIds).not.toContain('student-analytics');
    }
    expect(section('academy')).toBeDefined();
  });
});
