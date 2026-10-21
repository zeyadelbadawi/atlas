import { describe, expect, it } from 'vitest';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { academyEntryRoute } from './academy-entry-route';

describe('academyEntryRoute (marketing signed-in CTAs, `?open=`)', () => {
  it('opens the named section of the chosen academy', () => {
    expect(academyEntryRoute('payments')).toBe(
      DASHBOARD_ROUTES.academyPayments
    );
    expect(academyEntryRoute('courses')).toBe(DASHBOARD_ROUTES.academyCourses);
    expect(academyEntryRoute('team')).toBe(DASHBOARD_ROUTES.academyMembers);
    expect(academyEntryRoute('website')).toBe(DASHBOARD_ROUTES.websiteOverview);
  });

  it('falls back to the overview for anything else, so the parameter cannot route elsewhere', () => {
    for (const value of [
      null,
      '',
      'overview',
      'toString',
      '__proto__',
      'constructor',
      '/dashboard/platform',
      'https://evil.example',
    ]) {
      expect(academyEntryRoute(value), String(value)).toBe(
        DASHBOARD_ROUTES.academyOverview
      );
    }
  });
});
