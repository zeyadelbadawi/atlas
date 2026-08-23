/**
 * Query key factory.
 *
 * Provides deterministic query keys for every entity and operation. Keys are
 * namespaced by resource and include the relevant identifiers so cache
 * invalidation can target exactly the affected queries.
 */
import type { AnalyticsQuery, CollectionQuery, CourseListQuery } from '@types';

/** Base keys for resource categories. */
export const QUERY_KEY_ROOTS = {
  auth: ['auth'] as const,
  user: ['user'] as const,
  organizations: ['organizations'] as const,
  academy: ['academy'] as const,
  course: ['course'] as const,
  courseDiscovery: ['course-discovery'] as const,
  enrollment: ['enrollment'] as const,
  progress: ['progress'] as const,
  quiz: ['quiz'] as const,
  assignment: ['assignment'] as const,
  instructor: ['instructor'] as const,
  announcement: ['announcement'] as const,
  blog: ['blog'] as const,
  forum: ['forum'] as const,
  tenant: ['tenant'] as const,
  plan: ['plan'] as const,
  checkout: ['checkout'] as const,
  paymentMethod: ['payment-method'] as const,
  payment: ['payment'] as const,
  invoice: ['invoice'] as const,
  platformPayment: ['platform-payment'] as const,
  provisioning: ['provisioning'] as const,
  subdomain: ['subdomain'] as const,
  platformProvisioning: ['platform-provisioning'] as const,
  website: ['website'] as const,
  domain: ['domain'] as const,
  platformDomain: ['platform-domain'] as const,
  infrastructure: ['infrastructure'] as const,
  publicWebsite: ['public-website'] as const,
  platformOrganization: ['platform-organization'] as const,
  platformAcademy: ['platform-academy'] as const,
  platformUser: ['platform-user'] as const,
  role: ['role'] as const,
  auditLog: ['audit-log'] as const,
  support: ['support'] as const,
  platformMetrics: ['platform-metrics'] as const,
  analytics: ['analytics'] as const,
  notification: ['notification'] as const,
  platformSettings: ['platform-settings'] as const,
  media: ['media'] as const,
  search: ['search'] as const,
} as const;

/**
 * Query keys for authentication and identity.
 */
export const authKeys = {
  all: QUERY_KEY_ROOTS.auth,
  session: () => [...authKeys.all, 'session'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
} as const;

/**
 * Query keys for user-related queries.
 */
export const userKeys = {
  all: QUERY_KEY_ROOTS.user,
  profile: (userId: string) => [...userKeys.all, 'profile', userId] as const,
  preferences: (userId: string) =>
    [...userKeys.all, 'preferences', userId] as const,
} as const;

/**
 * Query keys for organization-related queries.
 */
export const organizationKeys = {
  all: QUERY_KEY_ROOTS.organizations,
  list: (filters?: Record<string, unknown>) =>
    [...organizationKeys.all, 'list', filters] as const,
  detail: (orgId: string) => [...organizationKeys.all, 'detail', orgId] as const,
  memberships: (userId: string) =>
    [...organizationKeys.all, 'memberships', userId] as const,
} as const;

/**
 * Query keys for Academy Management.
 *
 * Every key embeds the active organization ID, so `PlatformProvider`'s
 * org-switch invalidation (which matches keys containing the organization id)
 * always catches Academy data without any Academy-specific wiring there.
 */
export const academyKeys = {
  all: QUERY_KEY_ROOTS.academy,
  list: (organizationId: string | undefined, query?: CollectionQuery) =>
    [...academyKeys.all, 'list', organizationId, query] as const,
  detail: (organizationId: string | undefined, academyId: string) =>
    [...academyKeys.all, 'detail', organizationId, academyId] as const,
  members: (
    organizationId: string | undefined,
    academyId: string,
    query?: CollectionQuery
  ) =>
    [...academyKeys.all, 'members', organizationId, academyId, query] as const,
  stats: (organizationId: string | undefined, academyId: string) =>
    [...academyKeys.all, 'stats', organizationId, academyId] as const,
  activity: (
    organizationId: string | undefined,
    academyId: string,
    query?: CollectionQuery
  ) =>
    [...academyKeys.all, 'activity', organizationId, academyId, query] as const,
} as const;

/**
 * Query keys for Course Management.
 *
 * Every course belongs to a specific academy, so every key embeds the
 * academy id. Switching academies therefore produces different keys — the
 * previous academy's course data simply isn't addressed by the new keys, so
 * it can never leak across academies, without any Course-specific
 * invalidation wiring (the same technique `academyKeys` uses for org id).
 */
export const courseKeys = {
  all: QUERY_KEY_ROOTS.course,
  list: (academyId: string | undefined, query?: CourseListQuery) =>
    [...courseKeys.all, 'list', academyId, query] as const,
  detail: (academyId: string | undefined, courseId: string) =>
    [...courseKeys.all, 'detail', academyId, courseId] as const,
  categories: (academyId: string | undefined) =>
    [...courseKeys.all, 'categories', academyId] as const,
  sections: (academyId: string | undefined, courseId: string) =>
    [...courseKeys.all, 'sections', academyId, courseId] as const,
} as const;

/**
 * Query keys for the student-facing cross-academy course catalog.
 *
 * Deliberately not scoped by academy — `discoverCourses` reads across every
 * academy, so its own key tree is separate from the owner-facing `courseKeys`.
 */
export const courseDiscoveryKeys = {
  all: QUERY_KEY_ROOTS.courseDiscovery,
  list: (query?: CourseListQuery) =>
    [...courseDiscoveryKeys.all, 'list', query] as const,
} as const;

/**
 * Query keys for Student Learning.
 *
 * Every key embeds the current student's id (not just the course/quiz/
 * assignment id) so that signing in as a different student in the same
 * browser session can never surface the previous student's cached
 * progress, attempts or submissions — the same technique `academyKeys`/
 * `courseKeys` use for organization/academy id.
 */
export const enrollmentKeys = {
  all: QUERY_KEY_ROOTS.enrollment,
  list: (studentId: string | undefined) =>
    [...enrollmentKeys.all, 'list', studentId] as const,
  course: (studentId: string | undefined, courseId: string) =>
    [...enrollmentKeys.all, 'course', studentId, courseId] as const,
} as const;

export const progressKeys = {
  all: QUERY_KEY_ROOTS.progress,
  course: (studentId: string | undefined, courseId: string) =>
    [...progressKeys.all, 'course', studentId, courseId] as const,
} as const;

export const quizKeys = {
  all: QUERY_KEY_ROOTS.quiz,
  list: (studentId: string | undefined, courseId: string) =>
    [...quizKeys.all, 'list', studentId, courseId] as const,
  detail: (studentId: string | undefined, courseId: string, quizId: string) =>
    [...quizKeys.all, 'detail', studentId, courseId, quizId] as const,
  attempts: (
    studentId: string | undefined,
    courseId: string,
    quizId: string
  ) => [...quizKeys.all, 'attempts', studentId, courseId, quizId] as const,
} as const;

export const assignmentKeys = {
  all: QUERY_KEY_ROOTS.assignment,
  list: (studentId: string | undefined, courseId: string) =>
    [...assignmentKeys.all, 'list', studentId, courseId] as const,
  detail: (
    studentId: string | undefined,
    courseId: string,
    assignmentId: string
  ) => [...assignmentKeys.all, 'detail', studentId, courseId, assignmentId] as const,
  submission: (
    studentId: string | undefined,
    courseId: string,
    assignmentId: string
  ) =>
    [
      ...assignmentKeys.all,
      'submission',
      studentId,
      courseId,
      assignmentId,
    ] as const,
} as const;

/**
 * Query keys for the Instructor experience.
 *
 * Every key embeds the current instructor's id, for the same reason
 * `enrollmentKeys`/`progressKeys` embed the current student's id: no cached
 * teaching data can surface for a different instructor signed in in the
 * same session.
 */
export const instructorKeys = {
  all: QUERY_KEY_ROOTS.instructor,
  dashboard: (instructorId: string | undefined) =>
    [...instructorKeys.all, 'dashboard', instructorId] as const,
  courses: (instructorId: string | undefined, query?: CollectionQuery) =>
    [...instructorKeys.all, 'courses', instructorId, query] as const,
  course: (instructorId: string | undefined, courseId: string) =>
    [...instructorKeys.all, 'course', instructorId, courseId] as const,
  students: (
    instructorId: string | undefined,
    courseId: string,
    query?: CollectionQuery
  ) => [...instructorKeys.all, 'students', instructorId, courseId, query] as const,
  studentProgress: (
    instructorId: string | undefined,
    courseId: string,
    studentId: string
  ) =>
    [
      ...instructorKeys.all,
      'studentProgress',
      instructorId,
      courseId,
      studentId,
    ] as const,
  quizAttempts: (
    instructorId: string | undefined,
    courseId: string,
    quizId: string,
    query?: CollectionQuery
  ) =>
    [
      ...instructorKeys.all,
      'quizAttempts',
      instructorId,
      courseId,
      quizId,
      query,
    ] as const,
  submissions: (
    instructorId: string | undefined,
    courseId: string,
    assignmentId: string,
    query?: CollectionQuery
  ) =>
    [
      ...instructorKeys.all,
      'submissions',
      instructorId,
      courseId,
      assignmentId,
      query,
    ] as const,
  submission: (
    instructorId: string | undefined,
    courseId: string,
    assignmentId: string,
    submissionId: string
  ) =>
    [
      ...instructorKeys.all,
      'submission',
      instructorId,
      courseId,
      assignmentId,
      submissionId,
    ] as const,
} as const;

/**
 * Query keys for Announcements.
 *
 * `feed` embeds the current user's id (their visible feed differs by
 * identity); `course` is scoped by courseId alone, matching how course
 * ownership is otherwise expressed in this codebase.
 */
export const announcementKeys = {
  all: QUERY_KEY_ROOTS.announcement,
  feed: (userId: string | undefined, query?: CollectionQuery) =>
    [...announcementKeys.all, 'feed', userId, query] as const,
  detail: (userId: string | undefined, id: string) =>
    [...announcementKeys.all, 'detail', userId, id] as const,
  course: (courseId: string, query?: CollectionQuery) =>
    [...announcementKeys.all, 'course', courseId, query] as const,
} as const;

/** Query keys for the Blog (Knowledge Content) feature. */
export const blogKeys = {
  all: QUERY_KEY_ROOTS.blog,
  list: (userId: string | undefined, query?: CollectionQuery) =>
    [...blogKeys.all, 'list', userId, query] as const,
  detail: (userId: string | undefined, id: string) =>
    [...blogKeys.all, 'detail', userId, id] as const,
} as const;

/**
 * Query keys for the Course Forum.
 *
 * Every key is rooted in `courseId` — a forum, its threads and its replies
 * only ever exist in the context of the course they were fetched for, so a
 * cache entry for one course's forum can never be read as another's.
 */
export const forumKeys = {
  all: QUERY_KEY_ROOTS.forum,
  forum: (courseId: string) => [...forumKeys.all, 'forum', courseId] as const,
  threads: (courseId: string, query?: CollectionQuery) =>
    [...forumKeys.all, 'threads', courseId, query] as const,
  thread: (courseId: string, threadId: string) =>
    [...forumKeys.all, 'thread', courseId, threadId] as const,
  replies: (courseId: string, threadId: string, query?: CollectionQuery) =>
    [...forumKeys.all, 'replies', courseId, threadId, query] as const,
} as const;

/**
 * Query keys for the Tenant SaaS domain (subscription/usage/add-ons).
 *
 * Every key embeds `organizationId` — the existing Organization IS the
 * Tenant boundary (see `Reports/ARCHITECTURE.md`, Prompt 6). This is the
 * same technique `academyKeys` uses for the same reason: `PlatformProvider`'s
 * `atlas:organization-switched` handler invalidates every cached query whose
 * key contains the active organization id, so switching organizations can
 * never leave a different Tenant's subscription/usage/add-ons visible —
 * without any Tenant-specific invalidation wiring there.
 */
export const tenantKeys = {
  all: QUERY_KEY_ROOTS.tenant,
  subscription: (organizationId: string | undefined) =>
    [...tenantKeys.all, 'subscription', organizationId] as const,
  usage: (organizationId: string | undefined) =>
    [...tenantKeys.all, 'usage', organizationId] as const,
  addOns: (organizationId: string | undefined) =>
    [...tenantKeys.all, 'addOns', organizationId] as const,
} as const;

/**
 * Query keys for the Plan/Add-on catalog and the platform Trial Policy.
 *
 * Deliberately NOT organization-scoped — the catalog and the trial policy
 * are the same for every Tenant; only `tenantKeys` (the Tenant's own
 * subscription/usage/active add-ons) varies by organization.
 */
export const planKeys = {
  all: QUERY_KEY_ROOTS.plan,
  list: () => [...planKeys.all, 'list'] as const,
  detail: (key: string) => [...planKeys.all, 'detail', key] as const,
  addOnList: () => [...planKeys.all, 'add-ons', 'list'] as const,
  addOnDetail: (key: string) => [...planKeys.all, 'add-ons', 'detail', key] as const,
  trialPolicy: () => [...planKeys.all, 'trial-policy'] as const,
} as const;

/**
 * Query keys for Checkout (Prompt 7).
 *
 * Embeds `organizationId` — the same technique `tenantKeys` (Prompt 6)
 * uses, so `PlatformProvider`'s existing `atlas:organization-switched`
 * invalidation catches Checkout data automatically, with no new wiring.
 */
export const checkoutKeys = {
  all: QUERY_KEY_ROOTS.checkout,
  detail: (organizationId: string | undefined, checkoutId: string) =>
    [...checkoutKeys.all, 'detail', organizationId, checkoutId] as const,
} as const;

/** Query keys for the payment method catalog. NOT organization-scoped — the same list for every Tenant, like `planKeys`. */
export const paymentMethodKeys = {
  all: QUERY_KEY_ROOTS.paymentMethod,
  list: () => [...paymentMethodKeys.all, 'list'] as const,
} as const;

/** Query keys for a Tenant's own Payments. Embeds `organizationId`, same reasoning as `checkoutKeys`. */
export const paymentKeys = {
  all: QUERY_KEY_ROOTS.payment,
  list: (organizationId: string | undefined, query?: CollectionQuery) =>
    [...paymentKeys.all, 'list', organizationId, query] as const,
  detail: (organizationId: string | undefined, paymentId: string) =>
    [...paymentKeys.all, 'detail', organizationId, paymentId] as const,
} as const;

/** Query keys for a Tenant's own Invoices. Embeds `organizationId`, same reasoning as `checkoutKeys`. */
export const invoiceKeys = {
  all: QUERY_KEY_ROOTS.invoice,
  list: (organizationId: string | undefined, query?: CollectionQuery) =>
    [...invoiceKeys.all, 'list', organizationId, query] as const,
} as const;

/**
 * Query keys for Platform payment review.
 *
 * Deliberately NOT organization-scoped — a platform reviewer's list spans
 * every Tenant by design (see `PlatformPaymentService`'s doc comment).
 * Organization-switch invalidation intentionally does not touch these:
 * they aren't "this Tenant's" data to begin with.
 */
export const platformPaymentKeys = {
  all: QUERY_KEY_ROOTS.platformPayment,
  list: (query?: CollectionQuery) =>
    [...platformPaymentKeys.all, 'list', query] as const,
  detail: (paymentId: string) =>
    [...platformPaymentKeys.all, 'detail', paymentId] as const,
} as const;

/**
 * Query keys for Provisioning (Prompt 8).
 *
 * Embeds `organizationId` — the same technique `checkoutKeys`/`paymentKeys`
 * (Prompt 7) use, so `PlatformProvider`'s existing `atlas:organization-switched`
 * invalidation catches provisioning data automatically, with no new wiring.
 */
export const provisioningKeys = {
  all: QUERY_KEY_ROOTS.provisioning,
  list: (organizationId: string | undefined, query?: CollectionQuery) =>
    [...provisioningKeys.all, 'list', organizationId, query] as const,
  detail: (organizationId: string | undefined, requestId: string) =>
    [...provisioningKeys.all, 'detail', organizationId, requestId] as const,
} as const;

/** Query keys for subdomain availability checks. Not organization-scoped — a subdomain is unique across all of Atlas. */
export const subdomainKeys = {
  all: QUERY_KEY_ROOTS.subdomain,
  availability: (subdomain: string) =>
    [...subdomainKeys.all, 'availability', subdomain] as const,
} as const;

/**
 * Query keys for the Platform Provisioning console.
 *
 * Deliberately NOT organization-scoped — the same reasoning
 * `platformPaymentKeys` documents: a Platform Owner's list spans every
 * Tenant by design, so organization-switch invalidation intentionally does
 * not touch these.
 */
export const platformProvisioningKeys = {
  all: QUERY_KEY_ROOTS.platformProvisioning,
  list: (query?: CollectionQuery) =>
    [...platformProvisioningKeys.all, 'list', query] as const,
  detail: (requestId: string) =>
    [...platformProvisioningKeys.all, 'detail', requestId] as const,
} as const;

/**
 * Query keys for the Website domain (Prompt 9).
 *
 * Academy-scoped, not organization-scoped — a website belongs to one
 * Academy, the same boundary `courseKeys` already uses. Embedding
 * `academyId` directly means switching the active Academy produces
 * different keys automatically, so no cross-Academy website data can ever
 * be read from cache — the same technique `courseKeys` documents for
 * itself, requiring no new invalidation wiring.
 */
export const websiteKeys = {
  all: QUERY_KEY_ROOTS.website,
  configuration: (academyId: string | undefined) =>
    [...websiteKeys.all, 'configuration', academyId] as const,
  pages: (academyId: string | undefined, query?: CollectionQuery) =>
    [...websiteKeys.all, 'pages', academyId, query] as const,
  page: (academyId: string | undefined, pageId: string) =>
    [...websiteKeys.all, 'page', academyId, pageId] as const,
  /** CMS content (Prompt 10) — same academy-scoping technique as `configuration`/`pages` above. */
  faqEntries: (academyId: string | undefined, query?: CollectionQuery) =>
    [...websiteKeys.all, 'faq-entries', academyId, query] as const,
  faqEntry: (academyId: string | undefined, entryId: string) =>
    [...websiteKeys.all, 'faq-entry', academyId, entryId] as const,
  testimonialEntries: (academyId: string | undefined, query?: CollectionQuery) =>
    [...websiteKeys.all, 'testimonial-entries', academyId, query] as const,
  testimonialEntry: (academyId: string | undefined, entryId: string) =>
    [...websiteKeys.all, 'testimonial-entry', academyId, entryId] as const,
} as const;

/**
 * Query keys for an Academy's domain configuration (Prompt 11).
 * Academy-scoped — same technique `websiteKeys` already uses.
 */
export const domainKeys = {
  all: QUERY_KEY_ROOTS.domain,
  configuration: (academyId: string | undefined) =>
    [...domainKeys.all, 'configuration', academyId] as const,
} as const;

/**
 * Query keys for the Atlas-wide platform base-domain configuration
 * (Prompt 11) — deliberately unscoped, the same singleton-config
 * technique `planKeys.trialPolicy` already established.
 */
export const platformDomainKeys = {
  all: QUERY_KEY_ROOTS.platformDomain,
  configuration: () => [...platformDomainKeys.all, 'configuration'] as const,
} as const;

/** Query keys for infrastructure-provider status (Prompt 11) — unscoped, account-level. */
export const infrastructureKeys = {
  all: QUERY_KEY_ROOTS.infrastructure,
  providerStatus: (provider: string) => [...infrastructureKeys.all, 'provider-status', provider] as const,
} as const;

/**
 * Query keys for the PUBLIC website runtime (Prompt 11). These are
 * deliberately NOT scoped by any authenticated session identity (a
 * visitor has none) — Academy isolation instead comes from `academyId`/
 * `hostname` being embedded directly in every key, exactly like every
 * other Academy-scoped key tree in this codebase embeds its own scope
 * id. A request resolved for Academy A can never read Academy B's cached
 * entry because their keys are never equal.
 */
export const publicWebsiteKeys = {
  all: QUERY_KEY_ROOTS.publicWebsite,
  hostnameResolution: (hostname: string) => [...publicWebsiteKeys.all, 'resolve', hostname] as const,
  configuration: (academyId: string | undefined) =>
    [...publicWebsiteKeys.all, 'configuration', academyId] as const,
  pages: (academyId: string | undefined) => [...publicWebsiteKeys.all, 'pages', academyId] as const,
  page: (academyId: string | undefined, slug: string) =>
    [...publicWebsiteKeys.all, 'page', academyId, slug] as const,
} as const;

/**
 * Query keys for the Platform Owner Control Plane consoles (Prompt 13).
 * All deliberately unscoped by any Tenant/Academy id — these ARE the
 * cross-tenant views, gated instead by route-level `platform_owner`
 * role checks (see `Reports/ARCHITECTURE.md`, Prompt 13).
 */
export const platformOrganizationKeys = {
  all: QUERY_KEY_ROOTS.platformOrganization,
  list: (query?: CollectionQuery) => [...platformOrganizationKeys.all, 'list', query] as const,
  detail: (organizationId: string) => [...platformOrganizationKeys.all, 'detail', organizationId] as const,
} as const;

export const platformAcademyKeys = {
  all: QUERY_KEY_ROOTS.platformAcademy,
  list: (query?: CollectionQuery) => [...platformAcademyKeys.all, 'list', query] as const,
  detail: (academyId: string) => [...platformAcademyKeys.all, 'detail', academyId] as const,
} as const;

export const platformUserKeys = {
  all: QUERY_KEY_ROOTS.platformUser,
  list: (query?: CollectionQuery) => [...platformUserKeys.all, 'list', query] as const,
  detail: (userId: string) => [...platformUserKeys.all, 'detail', userId] as const,
} as const;

/** Roles & Permissions catalog (Prompt 13) — unscoped, platform-wide. */
export const roleKeys = {
  all: QUERY_KEY_ROOTS.role,
  list: () => [...roleKeys.all, 'list'] as const,
  detail: (roleId: string) => [...roleKeys.all, 'detail', roleId] as const,
  permissionCatalog: () => [...roleKeys.all, 'permission-catalog'] as const,
} as const;

/** Audit Log (Prompt 13) — unscoped, platform-wide; a future backend may accept org/academy filters as query params without changing this key shape. */
export const auditLogKeys = {
  all: QUERY_KEY_ROOTS.auditLog,
  list: (query?: CollectionQuery) => [...auditLogKeys.all, 'list', query] as const,
  detail: (eventId: string) => [...auditLogKeys.all, 'detail', eventId] as const,
} as const;

/** Support Operations (Prompt 13) — unscoped, platform-wide. */
export const supportKeys = {
  all: QUERY_KEY_ROOTS.support,
  list: (query?: CollectionQuery) => [...supportKeys.all, 'list', query] as const,
  detail: (caseId: string) => [...supportKeys.all, 'detail', caseId] as const,
} as const;

/** Platform-wide command-center metrics (Prompt 13). */
export const platformMetricsKeys = {
  all: QUERY_KEY_ROOTS.platformMetrics,
  overview: () => [...platformMetricsKeys.all, 'overview'] as const,
} as const;

/** Platform Analytics (Prompt 13). */
export const analyticsKeys = {
  all: QUERY_KEY_ROOTS.analytics,
  overview: (query?: AnalyticsQuery) => [...analyticsKeys.all, 'overview', query] as const,
  timeSeries: (metric: string, query?: AnalyticsQuery) =>
    [...analyticsKeys.all, 'time-series', metric, query] as const,
  breakdown: (dimension: string, query?: AnalyticsQuery) =>
    [...analyticsKeys.all, 'breakdown', dimension, query] as const,
} as const;

/**
 * Notifications (Prompt 13). User-scoped — embeds the current user's id,
 * the same technique `blogKeys`/`announcementKeys` already use, so one
 * user's notifications can never surface for another in the same
 * browser session.
 */
export const notificationKeys = {
  all: QUERY_KEY_ROOTS.notification,
  list: (userId: string | undefined, query?: CollectionQuery) =>
    [...notificationKeys.all, 'list', userId, query] as const,
  unreadCount: (userId: string | undefined) =>
    [...notificationKeys.all, 'unread-count', userId] as const,
  preferences: (userId: string | undefined) =>
    [...notificationKeys.all, 'preferences', userId] as const,
} as const;

/** Platform Settings (Prompt 13) — a singleton, unscoped, mirrors `platformDomainKeys`. */
export const platformSettingsKeys = {
  all: QUERY_KEY_ROOTS.platformSettings,
  configuration: () => [...platformSettingsKeys.all, 'configuration'] as const,
} as const;

/**
 * Media Library (Prompt 13) — academy-scoped, the same boundary
 * `websiteKeys` already uses (a shared asset library still belongs to
 * one Academy, never the whole platform).
 */
export const mediaKeys = {
  all: QUERY_KEY_ROOTS.media,
  list: (academyId: string | undefined, query?: CollectionQuery) =>
    [...mediaKeys.all, 'list', academyId, query] as const,
  detail: (academyId: string | undefined, assetId: string) =>
    [...mediaKeys.all, 'detail', academyId, assetId] as const,
} as const;

/** Global Search (Prompt 13) — user-scoped (results are permission-filtered per caller). */
export const searchKeys = {
  all: QUERY_KEY_ROOTS.search,
  results: (userId: string | undefined, query: string) =>
    [...searchKeys.all, 'results', userId, query] as const,
} as const;