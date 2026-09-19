/**
 * Navigation configuration.
 *
 * Navigation is declared as data so future modules register their entries by
 * appending to a section — never by editing the shell components that render it.
 * Labels are translation keys and paths come from the route registry, so nothing
 * here is hardcoded.
 */
import {
  Video,
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
  LineChart,
  ClipboardList,
  Image as ImageIcon,
  Megaphone,
  Newspaper,
  Boxes,
  Gauge,
  Gift,
  Receipt,
  ShieldCheck,
  Rocket,
  Globe,
  ShieldQuestion,
  LifeBuoy,
  Plug,
  Layers,
  Radio,
  PackageCheck,
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
      requiresEntitlement: true,
      labelKey: 'navigation:items.academyOverview',
      path: DASHBOARD_ROUTES.academy,
      icon: GraduationCap,
      requiresAuth: true,
      requiredPermissions: ['academy.view'],
      matchNestedPaths: true,
    },
    {
      id: 'academy-provisioning',
      requiresEntitlement: true,
      labelKey: 'navigation:items.academyProvisioning',
      path: DASHBOARD_ROUTES.provisioning,
      icon: Rocket,
      requiresAuth: true,
      requiredPermissions: ['academy.provisioning.view'],
      matchNestedPaths: true,
    },
  ];

  if (activeAcademyId) {
    items.push(
      {
        id: 'academy-courses',
        requiresEntitlement: true,
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
        requiresEntitlement: true,
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
        requiresEntitlement: true,
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
        requiresEntitlement: true,
        labelKey: 'navigation:items.academySettings',
        path: buildPath(DASHBOARD_ROUTES.academySettings, {
          academyId: activeAcademyId,
        }),
        icon: Settings,
        requiresAuth: true,
        requiredPermissions: ['academy.configure'],
      },
      {
        id: 'academy-media',
        requiresEntitlement: true,
        labelKey: 'navigation:items.academyMedia',
        path: buildPath(DASHBOARD_ROUTES.academyMedia, {
          academyId: activeAcademyId,
        }),
        icon: ImageIcon,
        requiresAuth: true,
        // Viewing the library needs academy access; the page itself gates
        // upload/edit/archive on `academy.website.manage`, and the backend
        // gates them on the caller's real academy role.
        requiredPermissions: ['academy.view'],
      },
      {
        id: 'academy-announcements',
        requiresEntitlement: true,
        labelKey: 'navigation:items.academyAnnouncements',
        path: buildPath(DASHBOARD_ROUTES.academyAnnouncements, {
          academyId: activeAcademyId,
        }),
        icon: Megaphone,
        requiresAuth: true,
        // `view` gates the ENTRY, not the authoring controls — an
        // instructor legitimately reads their academy's announcements.
        // The page itself checks `announcement.manage` before rendering
        // the create/edit/publish controls, and the backend checks the
        // caller's real `academy_members` row regardless.
        requiredPermissions: ['announcement.view'],
      },
      {
        id: 'academy-website',
        requiresEntitlement: true,
        labelKey: 'navigation:items.academyWebsite',
        path: buildPath(DASHBOARD_ROUTES.websiteOverview, {
          academyId: activeAcademyId,
        }),
        icon: Globe,
        requiresAuth: true,
        requiredPermissions: ['academy.website.view'],
        matchNestedPaths: true,
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
          // The tenant dashboard. A Platform Owner has no organization, so
          // every card on it would be empty for them — they land on and
          // navigate to the Platform Dashboard instead
          // (`DashboardIndexRoute`). This empties the whole OVERVIEW group
          // for an operator, and `DashboardSidebar` already drops sections
          // with no visible items.
          tenantSurface: true,
        },
      ],
    },
    {
      id: 'organization',
      labelKey: 'navigation:sections.organization',
      items: [
        {
          id: 'organization-overview',
          tenantSurface: true,
          labelKey: 'navigation:items.organizationOverview',
          path: DASHBOARD_ROUTES.organization,
          icon: Building2,
        },
      ],
      showDivider: true,
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
          requiresEntitlement: true,
          labelKey: 'navigation:items.instructorDashboard',
          path: DASHBOARD_ROUTES.instructorDashboard,
          icon: LayoutDashboard,
          requiresAuth: true,
          requiredPermissions: ['instructor.dashboard.view'],
        },
        {
          id: 'instructor-courses',
          requiresEntitlement: true,
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
    /*
     * P64 Phase 1 (D2 / AD-12) — the "Learning" section is gone from the
     * management sidebar. Learning happens on the academy's own website
     * (`/my-learning` on the academy host), never inside the management
     * dashboard, and a `learner` principal cannot reach `/dashboard/*` at
     * all. The route constants survive (`DASHBOARD_ROUTES.myLearning` and
     * friends) and resolve to `LearnerSurfaceRedirectPage`, so an old
     * bookmark still lands somewhere useful — but nothing advertises them
     * to staff any more.
     */
    {
      id: 'community',
      labelKey: 'navigation:sections.community',
      items: [
        {
          id: 'announcements',
          requiresEntitlement: true,
          labelKey: 'navigation:items.announcements',
          path: DASHBOARD_ROUTES.announcements,
          icon: Megaphone,
          requiresAuth: true,
          requiredPermissions: ['announcement.view'],
        },
        {
          id: 'blog',
          requiresEntitlement: true,
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
      /*
        Phase 12 — the Add-ons area.

        A CATEGORY, not a link: each installed add-on is a child with its
        own sub-pages, which is what makes this scale when a second add-on
        arrives instead of accreting unrelated top-level entries.

        Deliberately NOT marked `requiresEntitlement`: this is where a
        customer goes to SEE and INSTALL add-ons, so hiding it from anyone
        without one would hide the only route to getting one. The pages
        themselves report each dependency, and every API call is
        independently authorized regardless of what the sidebar shows.
      */
      id: 'add-ons',
      labelKey: 'navigation:sections.addOns',
      items: [
        {
          id: 'add-ons-catalog',
          labelKey: 'navigation:items.addOnsCatalog',
          path: DASHBOARD_ROUTES.addOns,
          icon: Boxes,
          requiresAuth: true,
          // Add-ons are a commercial decision, so this is billing
          // territory — the same owner-exclusive permission the
          // subscription screens use.
          requiredPermissions: ['tenant.subscription.view'],
        },
        {
          id: 'live-sessions',
          labelKey: 'navigation:items.liveSessions',
          path: DASHBOARD_ROUTES.liveSessions,
          icon: Radio,
          requiresAuth: true,
          requiredPermissions: ['academy.view'],
          // DEFERRED: customer Live Sessions navigation is hidden while the
          // feature is Coming Soon. Reuses the existing feature-flag gate
          // (navigation.utils honors `featureFlag` via isFeatureEnabled).
          featureFlag: 'liveSessions',
          matchNestedPaths: true,
          children: [
            {
              id: 'live-sessions-list',
              labelKey: 'navigation:items.liveSessionsList',
              path: DASHBOARD_ROUTES.liveSessionsList,
              requiresAuth: true,
              requiredPermissions: ['academy.view'],
            },
            {
              id: 'live-sessions-recordings',
              labelKey: 'navigation:items.liveSessionsRecordings',
              path: DASHBOARD_ROUTES.liveSessionsRecordings,
              requiresAuth: true,
              requiredPermissions: ['academy.view'],
            },
            {
              id: 'live-sessions-connection',
              labelKey: 'navigation:items.liveSessionsConnection',
              path: DASHBOARD_ROUTES.liveSessionsSettings,
              requiresAuth: true,
              // Connecting a provider is an academy-configuration action.
              requiredPermissions: ['academy.configure'],
            },
          ],
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
          tenantSurface: true,
          labelKey: 'navigation:items.tenantOverview',
          path: DASHBOARD_ROUTES.tenant,
          icon: Gauge,
          requiresAuth: true,
          requiredPermissions: ['tenant.dashboard.view'],
        },
        {
          // Phase 9 (roadmap CO11) — same owner-exclusive permission the
          // backend endpoint itself requires, so nav and server agree.
          id: 'student-analytics',
          tenantSurface: true,
          requiresEntitlement: true,
          labelKey: 'navigation:items.studentAnalytics',
          path: DASHBOARD_ROUTES.studentAnalytics,
          icon: LineChart,
          requiresAuth: true,
          requiredPermissions: ['tenant.dashboard.view'],
        },
        {
          // Phase P19 — no `requiredPermissions`: reachable before a
          // subscription (and therefore before the `tenant.*` permissions
          // a real subscription's org membership carries) exists. See
          // `Reports/DEVELOPMENT_E2E_FLOW_AUDIT.md` P2 "Plans browsing".
          id: 'plans',
          tenantSurface: true,
          labelKey: 'navigation:items.plans',
          path: DASHBOARD_ROUTES.plans,
          icon: Layers,
          requiresAuth: true,
        },
        {
          id: 'tenant-subscription',
          tenantSurface: true,
          labelKey: 'navigation:items.tenantSubscription',
          path: DASHBOARD_ROUTES.tenantSubscription,
          icon: CreditCard,
          requiresAuth: true,
          requiredPermissions: ['tenant.subscription.view'],
        },
        {
          id: 'tenant-usage',
          tenantSurface: true,
          labelKey: 'navigation:items.tenantUsage',
          path: DASHBOARD_ROUTES.tenantUsage,
          icon: Boxes,
          requiresAuth: true,
          requiredPermissions: ['tenant.usage.view'],
        },
        {
          id: 'tenant-add-ons',
          tenantSurface: true,
          labelKey: 'navigation:items.tenantAddOns',
          path: DASHBOARD_ROUTES.tenantAddOns,
          icon: Gift,
          requiresAuth: true,
          requiredPermissions: ['tenant.addon.view'],
        },
        {
          id: 'tenant-billing',
          tenantSurface: true,
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
        {
          // In the USER section, with no `requiredRoles`: support is for
          // everyone who can sign in. A student who cannot open a ticket
          // has no way to report a problem, and per-ticket authorization
          // is enforced by RLS rather than by hiding the page.
          id: 'support',
          labelKey: 'navigation:items.support',
          path: DASHBOARD_ROUTES.support,
          icon: LifeBuoy,
          requiresAuth: true,
          matchNestedPaths: true,
          // Raising a support ticket is a CUSTOMER action — it opens a case
          // against Atlas. A Platform Owner is the other end of that
          // conversation and answers cases from the platform Support
          // console (`platform-support`), so this entry only ever led them
          // to a form for filing tickets with themselves.
          tenantSurface: true,
        },
      ],
    },
    {
      /*
        SUBSCRIPTIONS & TRIALS — one coherent Platform-Owner group.

        Before this, the three surfaces that together answer "how is the
        commercial side of Atlas configured and performing?" were scattered:
        Subscriptions & Trials sat alone under PLATFORM, the trial policy sat
        in ADMINISTRATION between Zoom and Domains, and the platform plan
        CATALOG page existed at `platformPlanCatalog` but was linked from
        nowhere at all — reachable only by typing the URL. The "Plans" entry a
        Platform Owner could see was the CUSTOMER plan-selection page.

        Nested children, matching the `platformZoom` group's own shape — no
        new navigation mechanism.
      */
      id: 'platform-commerce',
      labelKey: 'navigation:sections.platformCommerce',
      items: [
        {
          id: 'platform-subscriptions',
          labelKey: 'navigation:items.platformSubscriptions',
          path: DASHBOARD_ROUTES.platformSubscriptions,
          icon: CreditCard,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
        },
        {
          id: 'platform-plan-catalog',
          labelKey: 'navigation:items.platformPlanCatalog',
          path: DASHBOARD_ROUTES.platformPlanCatalog,
          icon: Layers,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
        },
      ],
      showDivider: true,
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
          /* P59 — four nested children instead of four tabs. Same shape the
             `platformZoom` group already uses, so the sidebar and the page's
             own `SectionTabs` strip render the identical set. */
          id: 'analytics',
          labelKey: 'navigation:items.analytics',
          path: DASHBOARD_ROUTES.analytics,
          icon: BarChart3,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
          children: [
            {
              id: 'analytics-overview',
              labelKey: 'analytics:tabs.overview',
              path: DASHBOARD_ROUTES.analytics,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'analytics-users',
              labelKey: 'analytics:tabs.users',
              path: DASHBOARD_ROUTES.analyticsUsers,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'analytics-engagement',
              labelKey: 'analytics:tabs.engagement',
              path: DASHBOARD_ROUTES.analyticsEngagement,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'analytics-revenue',
              labelKey: 'analytics:tabs.revenue',
              path: DASHBOARD_ROUTES.analyticsRevenue,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
          ],
        },
        {
          /*
            ZOOM OPERATIONS CENTER (P50).

            A nested branch rather than eight top-level links: the children
            are one operational subject, and flattening them would push
            every other SaaS area off the screen. `matchNestedPaths` keeps
            the parent active while the operator is anywhere inside it, and
            `SidebarNavigation` only expands the sub-list when the branch is
            active, so the sidebar stays short by default.

            Platform-owner only at every level. This mirrors the server:
            `PlatformZoomController` is guarded by `PlatformOwnerGuard` and
            the queries run in a platform-owner RLS context, so hiding the
            menu is a courtesy and the API is the boundary.
          */
          id: 'platform-zoom',
          labelKey: 'navigation:items.platformZoom',
          path: DASHBOARD_ROUTES.platformZoom,
          icon: Video,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
          children: [
            {
              id: 'platform-zoom-overview',
              labelKey: 'navigation:items.platformZoomOverview',
              path: DASHBOARD_ROUTES.platformZoom,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'platform-zoom-connections',
              labelKey: 'navigation:items.platformZoomConnections',
              path: DASHBOARD_ROUTES.platformZoomConnections,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'platform-zoom-sessions',
              labelKey: 'navigation:items.platformZoomSessions',
              path: DASHBOARD_ROUTES.platformZoomSessions,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'platform-zoom-attendance',
              labelKey: 'navigation:items.platformZoomAttendance',
              path: DASHBOARD_ROUTES.platformZoomAttendance,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'platform-zoom-recordings',
              labelKey: 'navigation:items.platformZoomRecordings',
              path: DASHBOARD_ROUTES.platformZoomRecordings,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'platform-zoom-events',
              labelKey: 'navigation:items.platformZoomEvents',
              path: DASHBOARD_ROUTES.platformZoomEvents,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'platform-zoom-health',
              labelKey: 'navigation:items.platformZoomHealth',
              path: DASHBOARD_ROUTES.platformZoomHealth,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
            {
              id: 'platform-zoom-activity',
              labelKey: 'navigation:items.platformZoomActivity',
              path: DASHBOARD_ROUTES.platformZoomActivity,
              requiresAuth: true,
              requiredRoles: ['platform_owner'],
            },
          ],
        },
        {
          id: 'platform-domain',
          labelKey: 'navigation:items.platformDomain',
          path: DASHBOARD_ROUTES.platformDomain,
          icon: Globe,
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
        {
          id: 'platform-atlas-payment-provider',
          labelKey: 'navigation:items.platformAtlasPaymentProvider',
          path: DASHBOARD_ROUTES.platformAtlasPaymentProvider,
          icon: Plug,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
        },
        {
          id: 'platform-provisioning',
          labelKey: 'navigation:items.platformProvisioning',
          path: DASHBOARD_ROUTES.platformProvisioning,
          icon: Rocket,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
        },
        {
          id: 'platform-organizations',
          labelKey: 'navigation:items.platformOrganizations',
          path: DASHBOARD_ROUTES.platformOrganizations,
          icon: Building2,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
        },
        {
          id: 'platform-academies',
          labelKey: 'navigation:items.platformAcademies',
          path: DASHBOARD_ROUTES.platformAcademies,
          icon: GraduationCap,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
        },
        {
          // P60 — sits directly after Academies because that is the domain
          // order an operator thinks in: organization → academy → course.
          id: 'platform-courses',
          labelKey: 'navigation:items.platformCourses',
          path: DASHBOARD_ROUTES.platformCourses,
          icon: BookOpen,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
        },
        {
          id: 'platform-users',
          labelKey: 'navigation:items.platformUsers',
          path: DASHBOARD_ROUTES.platformUsers,
          icon: Users,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
        },
        {
          id: 'platform-roles-permissions',
          labelKey: 'navigation:items.platformRolesPermissions',
          path: DASHBOARD_ROUTES.platformRolesPermissions,
          icon: ShieldQuestion,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
        },
        {
          id: 'platform-audit-log',
          labelKey: 'navigation:items.platformAuditLog',
          path: DASHBOARD_ROUTES.platformAuditLog,
          icon: ClipboardList,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
        },
        {
          id: 'platform-support',
          labelKey: 'navigation:items.platformSupport',
          path: DASHBOARD_ROUTES.platformSupport,
          icon: LifeBuoy,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
          matchNestedPaths: true,
        },
        {
          // Add-ons Catalog Management (P51). Platform-owner only at every
          // level; `PlatformAddOnsController` is the server-side boundary,
          // this nav entry only decides what a platform owner is shown.
          id: 'platform-add-ons',
          labelKey: 'navigation:items.platformAddOns',
          path: DASHBOARD_ROUTES.platformAddOns,
          icon: PackageCheck,
          requiresAuth: true,
          requiredRoles: ['platform_owner'],
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
