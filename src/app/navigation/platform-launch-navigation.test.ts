/**
 * B3 / G1 — the "Launch & content" sidebar section: exactly five
 * Platform-Owner pages (launch center, blog, banners & pop-ups, launch
 * checklist, and G1's Growth & capacity right after the checklist), every
 * route (including the editors) guarded for `platform_owner`, labels in
 * both languages. The router source is read as text (rendering it would
 * mount the whole application).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { getDashboardNavigation } from '@app/navigation/navigation.config';
import { filterNavigationItems } from './navigation.utils';
import en from '@/localization/resources/en/navigation.json';
import ar from '@/localization/resources/ar/navigation.json';
import type { CurrentUser } from '@types';

const SIDEBAR_KEYS = [
  'platformLaunch',
  'platformBlog',
  'platformAnnouncements',
  'platformLaunchChecklist',
  'platformGrowth',
] as const;

const ROUTE_KEYS = [
  ...SIDEBAR_KEYS,
  'platformBlogNew',
  'platformBlogEdit',
  'platformAnnouncementNew',
  'platformAnnouncementEdit',
] as const;

const section = () =>
  getDashboardNavigation().find((s) => s.id === 'platform-launch');

describe('Launch & content navigation (B3)', () => {
  it('has exactly the five pages, platform-owner only, after Email & Notifications', () => {
    const sections = getDashboardNavigation();
    const index = sections.findIndex((s) => s.id === 'platform-launch');
    expect(index).toBeGreaterThan(
      sections.findIndex((s) => s.id === 'platform-email')
    );
    expect(section()?.labelKey).toBe('navigation:sections.platformLaunch');
    expect(section()?.items.map((item) => item.path)).toEqual(
      SIDEBAR_KEYS.map((key) => DASHBOARD_ROUTES[key])
    );
    for (const item of section()?.items ?? []) {
      expect(item.requiredRoles).toEqual(['platform_owner']);
      expect(item.icon).toBeDefined();
    }
  });

  it('is hidden from every other role', () => {
    const items = section()?.items ?? [];
    const visible = (roles: string[]) =>
      filterNavigationItems(items, {
        isAuthenticated: true,
        user: {
          id: 'u',
          name: 'U',
          email: 'u@x.dev',
          roles,
        } as unknown as CurrentUser,
        isFeatureEnabled: () => true,
      });
    expect(visible(['platform_owner'])).toHaveLength(5);
    expect(visible(['organization_owner'])).toHaveLength(0);
    expect(visible(['instructor'])).toHaveLength(0);
  });

  it('keeps stable paths under /dashboard/platform', () => {
    expect(DASHBOARD_ROUTES.platformLaunch).toBe('/dashboard/platform/launch');
    expect(DASHBOARD_ROUTES.platformBlog).toBe('/dashboard/platform/blog');
    expect(DASHBOARD_ROUTES.platformBlogNew).toBe(
      '/dashboard/platform/blog/new'
    );
    expect(DASHBOARD_ROUTES.platformBlogEdit).toBe(
      '/dashboard/platform/blog/:postId'
    );
    expect(DASHBOARD_ROUTES.platformAnnouncements).toBe(
      '/dashboard/platform/announcements'
    );
    expect(DASHBOARD_ROUTES.platformLaunchChecklist).toBe(
      '/dashboard/platform/launch-checklist'
    );
    expect(DASHBOARD_ROUTES.platformGrowth).toBe('/dashboard/platform/growth');
  });

  it('guards every route, editors included, for platform owners', () => {
    const router = readFileSync(
      resolve(__dirname, '../routes/AtlasAppRoutes.tsx'),
      'utf8'
    );
    for (const key of ROUTE_KEYS) {
      const start = router.indexOf(`path={DASHBOARD_ROUTES.${key}}`);
      expect(start, key).toBeGreaterThan(-1);
      const block = router.slice(start, router.indexOf('</RouteGuard>', start));
      expect(block, key).toMatch(
        /<RouteGuard\s+requireAuthentication\s+requiredRoles=\{\['platform_owner'\]\}/
      );
    }
  });

  it('labels the section and its pages in English and Arabic', () => {
    expect(en.sections.platformLaunch).toBe('Launch & content');
    expect(ar.sections.platformLaunch).toBe('الإطلاق والمحتوى');
    expect(en.items.platformGrowth).toBe('Growth & capacity');
    expect(ar.items.platformGrowth).toBe('النمو والسعة');
    for (const key of SIDEBAR_KEYS) {
      expect((en.items as Record<string, string>)[key]).toBeTruthy();
      expect((ar.items as Record<string, string>)[key]).toBeTruthy();
    }
  });
});
