/**
 * Per-domain cache invalidation.
 *
 * A mutation rarely changes only the screen it was made from: creating a
 * course changes the course list, but also the dashboard counts, the
 * academy statistics, the instructor's course list and the public
 * website's course grid. Spelling that fan-out in every hook is how views
 * drift apart, so each domain declares it ONCE here, next to the key
 * factories it targets, and hooks call the helper.
 *
 * Every helper targets the narrowest prefixes that cover the affected
 * reads (one academy's lists, one organization's history, ...) — never a
 * whole root such as `courseKeys.all` when a scoped prefix exists — and
 * every prefix goes through `invalidateQueryPrefixes`, which drops trailing
 * `undefined`s so `list(scope)` also matches `list(scope, query)` entries.
 *
 * Invalidation marks matching queries stale; only the ones currently on
 * screen refetch. An inactive entry simply refetches when next mounted.
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  academyKeys,
  courseDiscoveryKeys,
  courseKeys,
  dashboardOverviewKeys,
  instructorKeys,
  paymentKeys,
  planKeys,
  platformPlanKeys,
  provisioningKeys,
  publicPlanKeys,
  publicWebsiteKeys,
  supportKeys,
  tenantSupportCaseKeys,
  websiteKeys,
} from './query-keys';
import { invalidateQueryPrefixes } from './query-utils';

/** Matches query keys a prefix cannot express. */
export type KeyMatcher = (queryKey: QueryKey) => boolean;

/** What one domain refresh targets: key prefixes plus, where needed, matchers. */
export interface InvalidationTargets {
  readonly prefixes: readonly (readonly unknown[])[];
  readonly matchers: readonly KeyMatcher[];
}

/**
 * Matches `['academy', kind, <organization id>, academyId, ...rest]`.
 *
 * Every `academyKeys` entry embeds the organization id BEFORE the academy
 * id. A mutation knows the academy it changed but not always which
 * organization id the screens were keyed with (it comes from the session,
 * which course and website hooks do not otherwise read), so these entries
 * are matched by academy id whatever the organization element holds. An
 * academy belongs to exactly one organization, so nothing else matches.
 */
export function academyTreeMatcher(
  kind: string,
  academyId: string,
  ...rest: readonly unknown[]
): KeyMatcher {
  return (key) =>
    key[0] === academyKeys.all[0] &&
    key[1] === kind &&
    key[3] === academyId &&
    rest.every((value, index) => key[4 + index] === value);
}

/** Invalidates every prefix (trailing `undefined`s dropped) and every matcher. */
export async function invalidateTargets(
  queryClient: QueryClient,
  { prefixes, matchers }: InvalidationTargets
): Promise<void> {
  await Promise.all([
    invalidateQueryPrefixes(queryClient, prefixes),
    ...matchers.map((matches) =>
      queryClient.invalidateQueries({
        predicate: (query) => matches(query.queryKey),
      })
    ),
  ]);
}

/* ------------------------------------------------------------------ */
/* Course catalog (create / update / delete / publish / unpublish).    */
/* Curriculum (sections, lessons, quizzes) is the course builder's.    */
/* ------------------------------------------------------------------ */

export interface CourseCatalogScope {
  readonly academyId: string;
  /** The course that changed; omitted when unknown. */
  readonly courseId?: string;
}

/** What `invalidateCourseCatalog` targets (exported for tests and the matrix). */
export function courseCatalogTargets({
  academyId,
  courseId,
}: CourseCatalogScope): InvalidationTargets {
  return {
    prefixes: [
      // The academy's own course lists (every filter/page) and categories.
      courseKeys.lists(academyId),
      courseKeys.categories(academyId),
      courseId
        ? courseKeys.detail(academyId, courseId)
        : courseKeys.details(academyId),
      // Counts on the dashboard (organization or academy scope).
      dashboardOverviewKeys.overviews(),
      // The instructor's own views of the same courses (instructor-scoped
      // keys; the `courses`/`course`/`dashboard` branches only).
      [...instructorKeys.all, 'courses'],
      [...instructorKeys.all, 'course'],
      [...instructorKeys.all, 'dashboard'],
      // The student catalog and the academy's public website.
      courseDiscoveryKeys.all,
      publicWebsiteKeys.coursesAll(academyId),
      publicWebsiteKeys.statistics(academyId),
      publicWebsiteKeys.categories(academyId),
      ...(courseId
        ? [
            publicWebsiteKeys.course(academyId, courseId),
            publicWebsiteKeys.courseCurriculum(academyId, courseId),
          ]
        : []),
    ],
    // The academy overview's counts.
    matchers: [academyTreeMatcher('stats', academyId)],
  };
}

/** A course was created, edited, deleted, published or unpublished. */
export async function invalidateCourseCatalog(
  queryClient: QueryClient,
  scope: CourseCatalogScope
): Promise<void> {
  await invalidateTargets(queryClient, courseCatalogTargets(scope));
}

/* ------------------------------------------------------------------ */
/* Academy branding / identity.                                        */
/* ------------------------------------------------------------------ */

export function brandingTargets(academyId: string): InvalidationTargets {
  return {
    prefixes: [
      // Switcher and sidebar read the academy list (only the active
      // organization's lists are ever cached).
      [...academyKeys.all, 'list'],
      // The combined identity read behind the LMS/public logo and colours
      // (cached for five minutes, so it must be told explicitly).
      publicWebsiteKeys.identity(academyId),
      publicWebsiteKeys.configuration(academyId),
      websiteKeys.configuration(academyId),
    ],
    matchers: [
      // Settings and the dashboard header read the academy detail.
      academyTreeMatcher('detail', academyId),
      // The academy's activity feed records the change.
      academyTreeMatcher('activity', academyId),
    ],
  };
}

/** An academy's name, logo, colours or visual identity changed. */
export async function invalidateBranding(
  queryClient: QueryClient,
  academyId: string
): Promise<void> {
  await invalidateTargets(queryClient, brandingTargets(academyId));
}

/* ------------------------------------------------------------------ */
/* Learner roster.                                                     */
/* ------------------------------------------------------------------ */

export interface RosterScope {
  readonly academyId: string;
  /** The learner whose detail drawer should refresh, when there is one. */
  readonly userId?: string;
}

export function rosterTargets({
  academyId,
  userId,
}: RosterScope): InvalidationTargets {
  return {
    prefixes: [dashboardOverviewKeys.overviews()],
    matchers: [
      // Every roster page/filter of the academy.
      academyTreeMatcher('roster', academyId),
      ...(userId
        ? [academyTreeMatcher('roster-student', academyId, userId)]
        : []),
      academyTreeMatcher('stats', academyId),
    ],
  };
}

/** A learner was added, blocked, approved, enrolled, revoked, ... */
export async function invalidateRoster(
  queryClient: QueryClient,
  scope: RosterScope
): Promise<void> {
  await invalidateTargets(queryClient, rosterTargets(scope));
}

/* ------------------------------------------------------------------ */
/* Plan catalog.                                                       */
/* ------------------------------------------------------------------ */

export function planPrefixes(
  planKey?: string
): readonly (readonly unknown[])[] {
  return [
    planKeys.list(),
    ...(planKey
      ? [planKeys.detail(planKey), platformPlanKeys.historyAll(planKey)]
      : []),
    publicPlanKeys.all,
  ];
}

/** A plan was created, edited or archived. */
export async function invalidatePlans(
  queryClient: QueryClient,
  planKey?: string
): Promise<void> {
  await invalidateQueryPrefixes(queryClient, planPrefixes(planKey));
}

/* ------------------------------------------------------------------ */
/* Tenant payments and provisioning.                                   */
/* ------------------------------------------------------------------ */

export function tenantPaymentPrefixes(
  organizationId: string,
  paymentId?: string
): readonly (readonly unknown[])[] {
  return [
    paymentKeys.lists(organizationId),
    ...(paymentId ? [paymentKeys.detail(organizationId, paymentId)] : []),
  ];
}

/** A tenant's own payment was created, cancelled or given a proof. */
export async function invalidateTenantPayments(
  queryClient: QueryClient,
  organizationId: string,
  paymentId?: string
): Promise<void> {
  await invalidateQueryPrefixes(
    queryClient,
    tenantPaymentPrefixes(organizationId, paymentId)
  );
}

export function provisioningPrefixes(
  organizationId: string,
  requestId?: string
): readonly (readonly unknown[])[] {
  return [
    provisioningKeys.lists(organizationId),
    ...(requestId ? [provisioningKeys.detail(organizationId, requestId)] : []),
  ];
}

/** A tenant's provisioning request was created, cancelled or retried. */
export async function invalidateProvisioning(
  queryClient: QueryClient,
  organizationId: string,
  requestId?: string
): Promise<void> {
  await invalidateQueryPrefixes(
    queryClient,
    provisioningPrefixes(organizationId, requestId)
  );
}

/* ------------------------------------------------------------------ */
/* Website content libraries.                                          */
/* ------------------------------------------------------------------ */

export function faqEntryPrefixes(
  academyId: string,
  entryId?: string
): readonly (readonly unknown[])[] {
  return [
    websiteKeys.faqEntriesAll(academyId),
    ...(entryId ? [websiteKeys.faqEntry(academyId, entryId)] : []),
  ];
}

/** An FAQ library entry was created, edited, published or archived. */
export async function invalidateFaqEntries(
  queryClient: QueryClient,
  academyId: string,
  entryId?: string
): Promise<void> {
  await invalidateQueryPrefixes(
    queryClient,
    faqEntryPrefixes(academyId, entryId)
  );
}

export function testimonialEntryPrefixes(
  academyId: string,
  entryId?: string
): readonly (readonly unknown[])[] {
  return [
    websiteKeys.testimonialEntriesAll(academyId),
    ...(entryId ? [websiteKeys.testimonialEntry(academyId, entryId)] : []),
  ];
}

/** A testimonial library entry was created, edited, published or archived. */
export async function invalidateTestimonialEntries(
  queryClient: QueryClient,
  academyId: string,
  entryId?: string
): Promise<void> {
  await invalidateQueryPrefixes(
    queryClient,
    testimonialEntryPrefixes(academyId, entryId)
  );
}

/** The public website runtime reads of one academy (after a site publish/unpublish). */
export function publicWebsiteSitePrefixes(
  academyId: string
): readonly (readonly unknown[])[] {
  return [
    publicWebsiteKeys.configuration(academyId),
    publicWebsiteKeys.pages(academyId),
    [...publicWebsiteKeys.all, 'page', academyId],
  ];
}

/** The academy website was published or unpublished. */
export async function invalidatePublicWebsiteSite(
  queryClient: QueryClient,
  academyId: string
): Promise<void> {
  await invalidateQueryPrefixes(
    queryClient,
    publicWebsiteSitePrefixes(academyId)
  );
}

/* ------------------------------------------------------------------ */
/* Support tickets.                                                    */
/* ------------------------------------------------------------------ */

/**
 * A ticket was opened, answered or changed status. The requester's own
 * tickets are listed in two places (the Support page, `supportKeys.mine*`,
 * and the dashboard's tracker, `tenantSupportCaseKeys`); both refresh.
 */
export async function invalidateSupportCases(
  queryClient: QueryClient
): Promise<void> {
  await invalidateQueryPrefixes(queryClient, [
    supportKeys.all,
    tenantSupportCaseKeys.all,
  ]);
}
