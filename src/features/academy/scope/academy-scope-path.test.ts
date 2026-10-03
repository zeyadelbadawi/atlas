/** W5 — reading the academy from the URL, and where a switch lands. */
import { describe, expect, it } from 'vitest';
import { academyIdFromPath, switchTargetPath } from './academy-scope-path';

describe('academyIdFromPath', () => {
  it('reads the academy of any academy-scoped screen', () => {
    expect(academyIdFromPath('/dashboard/academy/A')).toBe('A');
    expect(academyIdFromPath('/dashboard/academy/A/courses/c1/builder')).toBe(
      'A'
    );
  });

  it('is undefined outside the academy scope and for static children', () => {
    expect(academyIdFromPath('/dashboard/academy')).toBeUndefined();
    expect(academyIdFromPath('/dashboard/academy/create')).toBeUndefined();
    expect(academyIdFromPath('/dashboard/profile')).toBeUndefined();
    expect(
      academyIdFromPath('/dashboard/platform/academies/A')
    ).toBeUndefined();
  });
});

describe('switchTargetPath', () => {
  it('keeps the screen and swaps the academy', () => {
    expect(switchTargetPath('/dashboard/academy/A/members', 'B')).toBe(
      '/dashboard/academy/B/members'
    );
    expect(switchTargetPath('/dashboard/academy/A/website/settings', 'B')).toBe(
      '/dashboard/academy/B/website/settings'
    );
  });

  it("drops the old academy's resource ids and create forms", () => {
    expect(
      switchTargetPath('/dashboard/academy/A/courses/c-123/builder', 'B')
    ).toBe('/dashboard/academy/B/courses');
    expect(switchTargetPath('/dashboard/academy/A/courses/create', 'B')).toBe(
      '/dashboard/academy/B/courses'
    );
    expect(switchTargetPath('/dashboard/academy/A/orders/o-9', 'B')).toBe(
      '/dashboard/academy/B/orders'
    );
  });

  it('lands on the overview from the overview or from outside any academy', () => {
    expect(switchTargetPath('/dashboard/academy/A', 'B')).toBe(
      '/dashboard/academy/B'
    );
    expect(switchTargetPath('/dashboard/profile', 'B')).toBe(
      '/dashboard/academy/B'
    );
  });
});
