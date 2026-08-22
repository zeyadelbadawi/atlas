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