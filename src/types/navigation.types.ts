/**
 * Navigation types.
 *
 * Describes the shape of navigation items, sections and metadata used by the
 * sidebar, breadcrumbs and navigation components.
 */
import type { LucideIcon } from 'lucide-react';

/** A single navigation item. */
export interface NavigationItem {
  readonly id: string;
  /** Translation key for the label. */
  readonly labelKey: string;
  /** Route path this item navigates to. */
  readonly path: string;
  /** Icon component. */
  readonly icon?: LucideIcon;
  /** Badge content (e.g., notification count). */
  readonly badge?: string | number;
  /** Nested child items. */
  readonly children?: readonly NavigationItem[];
  /** Whether this item requires authentication. */
  readonly requiresAuth?: boolean;
  /** Permissions required to view this item. */
  readonly requiredPermissions?: readonly string[];
  /** Roles required to view this item. */
  readonly requiredRoles?: readonly string[];
  /** Feature flag required to view this item. */
  readonly featureFlag?: string;
  /** Whether to match nested paths under this route. */
  readonly matchNestedPaths?: boolean;
  /**
   * Phase 11 — whether this item leads to GATED PRODUCT functionality
   * that requires a working entitlement (an active plan or a live trial).
   *
   * Marked items disappear for a customer in `no_plan`, `trial_expired`
   * or `expired`, leaving only the areas they need in order to recover:
   * the dashboard, plans, billing, the organization, their own account
   * and support. Never mark one of THOSE — hiding the way out of an
   * expired state is how a recoverable billing problem becomes a lost
   * customer.
   *
   * HIDING IS UX, NOT SECURITY. The matching route is independently
   * gated by `RouteGuard`, and the API independently refuses the write.
   * This flag only stops the product from advertising a door that is
   * locked.
   */
  readonly requiresEntitlement?: boolean;

  /**
   * Whether this item belongs to the TENANT product surface — the parts of
   * Atlas that only make sense to someone who owns an Organization and an
   * Academy, or who is learning inside one.
   *
   * A Platform/SaaS Owner is a platform operator, not a customer: they do
   * not create an Organization for themselves, do not subscribe, do not
   * start a trial and do not take courses. Before this flag existed the
   * Platform Owner's sidebar advertised "Organization", "My Learning",
   * "My Results" and "Discover Courses" — verified live, signed in as the
   * real seeded Platform Owner (`admin@atlas.dev`, `organizations: 0`).
   * The Learning entries appeared because `BASE_USER_PERMISSIONS` grants
   * `student.*` to EVERY authenticated user (correctly — those are
   * self-service permissions), so a permission gate could never have hidden
   * them; only a role-shaped rule can.
   *
   * HIDING IS UX, NOT SECURITY — the same rule `requiresEntitlement`
   * documents above. The backend already refuses a Platform Owner on tenant
   * routes (verified: `GET /organizations/:id/subscription` → 403), and the
   * Learning routes are not a leak at all: enrollment RLS keys on
   * `student_id = app.current_user_id`, so a Platform Owner reading them
   * sees their own empty set. This flag stops Atlas advertising a surface
   * that is irrelevant to the role; it is not what protects anything.
   */
  readonly tenantSurface?: boolean;
}

/** A navigation section containing grouped items. */
export interface NavigationSection {
  readonly id: string;
  /** Translation key for the section label. */
  readonly labelKey: string;
  readonly items: readonly NavigationItem[];
  /** Whether to show a divider after this section. */
  readonly showDivider?: boolean;
}

/** Breadcrumb item. */
export interface BreadcrumbItem {
  /** Translation key for the label. */
  readonly labelKey: string;
  /** Direct label text (overrides labelKey if provided). */
  readonly label?: string;
  /** Route path, if this breadcrumb is navigable. */
  readonly path?: string;
}
