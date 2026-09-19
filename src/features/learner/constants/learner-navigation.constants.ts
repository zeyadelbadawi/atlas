/**
 * The learner dashboard's own navigation (P64 Phase 2 §E.1).
 *
 * Declared as data, once, and read by all three presentations of it — the
 * desktop side navigation, the mobile drawer and the mobile bottom bar — so
 * a section can never exist in one of them and be missing from another.
 * That is not a hypothetical: the management sidebar learned the same
 * lesson (`navigation.config.ts`), and a learner who can reach Devices on a
 * laptop but not on a phone is locked out of the one screen that can undo a
 * device-limit refusal.
 *
 * Deliberately NOT `NavigationItem` from `@types`: that shape carries
 * `requiredPermissions`, `requiredRoles`, `requiresEntitlement` and
 * `tenantSurface`, every one of which is a MANAGEMENT concept. The learner
 * surface has no permission matrix to filter against — a learner sees their
 * own courses, their own results, their own devices, and the backend scopes
 * each of those to `app.current_user_id` regardless of what the frontend
 * renders. Borrowing the management shape would invite someone to start
 * gating learner sections on management permissions, which is exactly the
 * confusion D2 exists to end.
 *
 * Paths are the bare, unprefixed `LEARNER_ROUTES` values. The `/ar` prefix
 * and the dev-preview parameter are applied once, by the surface's
 * `buildHref` — see `LearnerSurface.context.tsx`.
 */
import {
  Award,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MonitorSmartphone,
  Receipt,
  ShieldCheck,
  User,
  type LucideIcon,
} from 'lucide-react';
import { LEARNER_ROUTES } from '@app/routes/route-paths';

/** Stable identity of a learner dashboard section. */
export type LearnerSectionId =
  | 'overview'
  | 'courses'
  | 'assessments'
  | 'certificates'
  | 'purchases'
  | 'devices'
  | 'profile'
  | 'security';

export interface LearnerNavigationItem {
  readonly id: LearnerSectionId;
  /** Translation key for the full label, used by the side nav and drawer. */
  readonly labelKey: string;
  /**
   * Translation key for the bottom bar's shorter label, where four items
   * share the full width of a 320 px phone and "My Courses" wraps.
   * Absent when the full label already fits.
   */
  readonly shortLabelKey?: string;
  /** A bare `LEARNER_ROUTES` path. */
  readonly path: string;
  readonly icon: LucideIcon;
  /** Keeps the entry active on the section's own deeper pages. */
  readonly matchNestedPaths?: boolean;
}

export const LEARNER_NAVIGATION: readonly LearnerNavigationItem[] = [
  {
    id: 'overview',
    labelKey: 'learning:learnerDashboard.nav.overview',
    path: LEARNER_ROUTES.root,
    icon: LayoutDashboard,
  },
  {
    id: 'courses',
    labelKey: 'learning:learnerDashboard.nav.courses',
    shortLabelKey: 'learning:learnerDashboard.nav.coursesShort',
    path: LEARNER_ROUTES.courses,
    icon: GraduationCap,
    // `/my/courses/:courseId` is still "Courses" as far as the learner is
    // concerned; the breadcrumb, not the nav, says which course.
    matchNestedPaths: true,
  },
  {
    id: 'assessments',
    labelKey: 'learning:learnerDashboard.nav.assessments',
    path: LEARNER_ROUTES.assessments,
    icon: ClipboardList,
  },
  {
    id: 'certificates',
    labelKey: 'learning:learnerDashboard.nav.certificates',
    path: LEARNER_ROUTES.certificates,
    icon: Award,
  },
  {
    id: 'purchases',
    labelKey: 'learning:learnerDashboard.nav.purchases',
    path: LEARNER_ROUTES.purchases,
    icon: Receipt,
  },
  {
    id: 'devices',
    labelKey: 'learning:learnerDashboard.nav.devices',
    path: LEARNER_ROUTES.devices,
    icon: MonitorSmartphone,
  },
  {
    id: 'profile',
    labelKey: 'learning:learnerDashboard.nav.profile',
    path: LEARNER_ROUTES.profile,
    icon: User,
  },
  {
    id: 'security',
    labelKey: 'learning:learnerDashboard.nav.security',
    path: LEARNER_ROUTES.security,
    icon: ShieldCheck,
  },
];

/**
 * The four sections the mobile bottom bar carries, in order.
 *
 * Exactly four is a product decision (§E.1), not a layout accident: a fifth
 * item at 320 px either truncates its label or forces icon-only entries,
 * and an unlabelled glyph bar is the single most common way a mobile LMS
 * becomes unusable. Everything else stays one tap away in the drawer.
 */
export const LEARNER_BOTTOM_NAVIGATION_IDS: readonly LearnerSectionId[] = [
  'overview',
  'courses',
  'assessments',
  'profile',
];

/** The bottom bar's items, resolved from the one navigation declaration. */
export const LEARNER_BOTTOM_NAVIGATION: readonly LearnerNavigationItem[] =
  LEARNER_BOTTOM_NAVIGATION_IDS.map((id) => {
    const item = LEARNER_NAVIGATION.find((candidate) => candidate.id === id);
    if (!item) {
      // Unreachable while both lists are literal, and the point is that it
      // stays unreachable: a typo in the id list would otherwise render a
      // three-item bar in production and nowhere else.
      throw new Error(`Unknown learner navigation section: ${id}`);
    }
    return item;
  });

/** Looks up one section's declaration. */
export function learnerSection(
  id: LearnerSectionId
): LearnerNavigationItem | undefined {
  return LEARNER_NAVIGATION.find((item) => item.id === id);
}
