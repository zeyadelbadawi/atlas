/**
 * Navigation configuration.
 *
 * Navigation is declared as data so future modules register their entries by
 * appending to a section — never by editing the shell components that render it.
 * Labels are translation keys and paths come from the route registry, so nothing
 * here is hardcoded.
 */
import {
  LayoutDashboard,
  User,
  Settings,
  Bell,
  CreditCard,
  BarChart3,
  Building2,
  Search,
  GraduationCap,
  Users,
  Palette,
  BookOpen,
  BookMarked,
  ClipboardList,
  Megaphone,
  Newspaper,
  Boxes,
  Gauge,
  Gift,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { NavigationItem, NavigationSection } from '@types';

/**
 * Builds the Academy section of the sidebar.
 *
 * Members/Branding/Settings link to a specific academy, so they only appear
 * once an academy is active — an unresolved `:academyId` is never rendered as
 * a link. The overview entry has no param and is always shown.
 */
function buildAcademySection(activeAcademyId?: string): NavigationSection {
  const items: NavigationItem[] = [
    {
      id: 'academy-overview',
      labelKey: 'navigation:items.academyOverview',
      path: DASHBOARD_ROUTES.academy,
      icon: GraduationCap,
      requiresAuth: true,
      requiredPermissions: ['academy.view'],
      matchNestedPaths: true,
    },
  ];

  if (activeAcademyId) {
    items.push(
      {
        id: 'academy-courses',
        labelKey: 'navigation:items.academyCourses',
        path: buildPath(DASHBOARD_ROUTES.academyCourses, {
          academyId: activeAcademyId,
        }),
        icon: BookOpen,
        requiresAuth: true,
        requiredPermissions: ['course.view'],
        matchNestedPaths: true,
      },
      {
        id: 'academy-members',
        labelKey: 'navigation:items.academyMembers',
        path: buildPath(DASHBOARD_ROUTES.academyMembers, {
          academyId: activeAcademyId,
        }),
        icon: Users,
        requiresAuth: true,
        requiredPermissions: ['academy.members.view'],
      },
      {
        id: 'academy-branding',
        labelKey: 'navigation:items.academyBranding',
        path: buildPath(DASHBOARD_ROUTES.academyBranding, {
          academyId: activeAcademyId,
        }),
        icon: Palette,
        requiresAuth: true,
        requiredPermissions: ['academy.branding.update'],
      },
      {
        id: 'academy-settings',
        labelKey: 'navigation:items.academySettings',
        path: buildPath(DASHBOARD_ROUTES.academySettings, {
          academyId: activeAcademyId,
        }),
        icon: Settings,
        requiresAuth: true,
        requiredPermissions: ['academy.configure'],
      }
    );
  }

  return {
    id: 'academy',
    labelKey: 'navigation:sections.academy',
    items,
    showDivider: true,
  };
}

/**
 * Sections of the dashboard sidebar, in display order.
 *
 * Only the overview entry exists in the foundation; business modules add their
 * own sections and entries when they are implemented. The Academy section
 * depends on which academy is currently active, so the full list is a function
 * of that value rather than a single static constant.
 */
export function getDashboardNavigation(
  activeAcademyId?: string
): readonly NavigationSection[] {
  return [
    {
      id: 'overview',
      labelKey: 'navigation:sections.overview',
      items: [
        {
          id: 'dashboard',
          labelKey: 'navigation:items.dashboard',
          path: DASHBOARD_ROUTES.root,
          icon: LayoutDashboard,
          matchNestedPaths: true,
        },
      ],
    },
    {
      id: 'platform',
      labelKey: 'navigation:sections.platform',
      items: [
        {
          id: 'platform-dashboard',
          labelKey: 'navigation:items.platformDashboard',
          path: DASHBOARD_ROUTES.platform,
          icon: Building2,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
        },
      ],
      showDivider: true,
    },
    buildAcademySection(activeAcademyId),
    {
      id: 'teaching',
      labelKey: 'navigation:sections.teaching',
      items: [
        {
          id: 'instructor-dashboard',
          labelKey: 'navigation:items.instructorDashboard',
          path: DASHBOARD_ROUTES.instructorDashboard,
          icon: LayoutDashboard,
          requiresAuth: true,
          requiredPermissions: ['instructor.dashboard.view'],
        },
        {
          id: 'instructor-courses',
          labelKey: 'navigation:items.myTeachingCourses',
          path: DASHBOARD_ROUTES.instructorCourses,
          icon: ClipboardList,
          requiresAuth: true,
          requiredPermissions: ['instructor.course.view'],
          matchNestedPaths: true,
        },
      ],
      showDivider: true,
    },
    {
      id: 'learning',
      labelKey: 'navigation:sections.learning',
      items: [
        {
          id: 'learning-courses',
          labelKey: 'navigation:items.myLearning',
          path: DASHBOARD_ROUTES.learningCourses,
          icon: BookMarked,
          requiresAuth: true,
          requiredPermissions: ['student.learning.view'],
          matchNestedPaths: true,
        },
      ],
      showDivider: true,
    },
    {
      id: 'community',
      labelKey: 'navigation:sections.community',
      items: [
        {
          id: 'announcements',
          labelKey: 'navigation:items.announcements',
          path: DASHBOARD_ROUTES.announcements,
          icon: Megaphone,
          requiresAuth: true,
          requiredPermissions: ['announcement.view'],
        },
        {
          id: 'blog',
          labelKey: 'navigation:items.blog',
          path: DASHBOARD_ROUTES.blog,
          icon: Newspaper,
          requiresAuth: true,
          requiredPermissions: ['blog.view'],
          matchNestedPaths: true,
        },
      ],
      showDivider: true,
    },
    {
      id: 'saas',
      labelKey: 'navigation:sections.saas',
      items: [
        {
          id: 'tenant-overview',
          labelKey: 'navigation:items.tenantOverview',
          path: DASHBOARD_ROUTES.tenant,
          icon: Gauge,
          requiresAuth: true,
          requiredPermissions: ['tenant.dashboard.view'],
        },
        {
          id: 'tenant-subscription',
          labelKey: 'navigation:items.tenantSubscription',
          path: DASHBOARD_ROUTES.tenantSubscription,
          icon: CreditCard,
          requiresAuth: true,
          requiredPermissions: ['tenant.subscription.view'],
        },
        {
          id: 'tenant-usage',
          labelKey: 'navigation:items.tenantUsage',
          path: DASHBOARD_ROUTES.tenantUsage,
          icon: Boxes,
          requiresAuth: true,
          requiredPermissions: ['tenant.usage.view'],
        },
        {
          id: 'tenant-add-ons',
          labelKey: 'navigation:items.tenantAddOns',
          path: DASHBOARD_ROUTES.tenantAddOns,
          icon: Gift,
          requiresAuth: true,
          requiredPermissions: ['tenant.addon.view'],
        },
        {
          id: 'tenant-billing',
          labelKey: 'navigation:items.tenantBilling',
          path: DASHBOARD_ROUTES.tenantBilling,
          icon: Receipt,
          requiresAuth: true,
          requiredPermissions: ['tenant.billing.view'],
          matchNestedPaths: true,
        },
      ],
      showDivider: true,
    },
    {
      id: 'user',
      labelKey: 'navigation:sections.user',
      items: [
        {
          id: 'profile',
          labelKey: 'navigation:items.profile',
          path: DASHBOARD_ROUTES.profile,
          icon: User,
          requiresAuth: true,
        },
        {
          id: 'notifications',
          labelKey: 'navigation:items.notifications',
          path: DASHBOARD_ROUTES.notifications,
          icon: Bell,
          requiresAuth: true,
        },
      ],
    },
    {
      id: 'administration',
      labelKey: 'navigation:sections.administration',
      items: [
        {
          id: 'settings',
          labelKey: 'navigation:items.settings',
          path: DASHBOARD_ROUTES.settings,
          icon: Settings,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
        },
        {
          id: 'billing',
          labelKey: 'navigation:items.billing',
          path: DASHBOARD_ROUTES.billing,
          icon: CreditCard,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
        },
        {
          id: 'analytics',
          labelKey: 'navigation:items.analytics',
          path: DASHBOARD_ROUTES.analytics,
          icon: BarChart3,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
        },
        {
          id: 'platform-trial-policy',
          labelKey: 'navigation:items.platformTrialPolicy',
          path: DASHBOARD_ROUTES.platformTrialPolicy,
          icon: Gift,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
        },
        {
          id: 'platform-payments',
          labelKey: 'navigation:items.platformPayments',
          path: DASHBOARD_ROUTES.platformPayments,
          icon: ShieldCheck,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
        },
      ],
      showDivider: true,
    },
  ];
}

/** Flattens sections into a single list, including nested children. */
export function flattenNavigation(
  sections: readonly NavigationSection[]
): ReadonlyArray<NavigationSection['items'][number]> {
  return sections.flatMap((section) =>
    section.items.flatMap((item) => [item, ...(item.children ?? [])])
  );
}