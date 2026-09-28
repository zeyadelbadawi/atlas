/**
 * Route registry.
 *
 * Every path in Atlas is declared here exactly once. Navigation, breadcrumbs,
 * redirects and links all read from this registry, so a URL can be changed in a
 * single place without breaking any consumer.
 *
 * Paths are grouped by the layout that renders them, which keeps the routing
 * tree and the layout structure aligned as modules are added.
 */

/** Paths rendered inside the public marketing layout. */
export const PUBLIC_ROUTES = {
  home: '/',
  features: '/features',
  pricing: '/pricing',
  /** Atlas's own legal documents — the SaaS platform's, not a tenant academy's. */
  privacyPolicy: '/privacy-policy',
  terms: '/terms',
  /**
   * P64 Phase 3 (D6) — the public certificate fact sheet. No session: the
   * code IS the credential. Mounted on the platform host here and on every
   * academy host by `PublicWebsiteRouter`, rendering the same component.
   */
  verify: '/verify/:code',
} as const;

/**
 * Paths rendered inside the authentication layout.
 */
export const AUTH_ROUTES = {
  root: '/auth',
  signIn: '/auth/sign-in',
  register: '/auth/register',
  /** The same sign-up page under the name the marketing site and people use. */
  signUpAlias: '/auth/sign-up',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  /** P64 Communications C0 — verification links may land on either surface; the academy hosts mount theirs in `PublicWebsiteRouter`. */
  verifyEmail: '/auth/verify-email',
  /**
   * Google Identity — where Google's callback hands the flow back, on the
   * origin it started from (the backend builds this exact path; academy
   * hosts mount it in `PublicWebsiteRouter`).
   */
  googleReturn: '/auth/google/return',
  /**
   * P64 Phase 1 (AD-5 / AD-12) — where a `learner` principal holding a
   * platform-host session is sent instead of the dashboard. Rendered in the
   * authentication layout (hence this group) but deliberately outside the
   * `/auth` subtree: it is a signed-in page, and `/auth`'s index redirect
   * and sign-in effects assume the opposite.
   */
  academyChooser: '/academy-chooser',
} as const;

/** Paths rendered inside the authenticated dashboard layout. */
export const DASHBOARD_ROUTES = {
  root: '/dashboard',
  organization: '/dashboard/organization',
  organizationCreate: '/dashboard/organization/create',
  profile: '/dashboard/profile',
  settings: '/dashboard/settings',
  notifications: '/dashboard/notifications',
  analytics: '/dashboard/analytics',
  /* P59 — Analysis became four routes instead of four tabs, so each area is
     deep-linkable and loads only its own data. `analytics` is the index. */
  analyticsUsers: '/dashboard/analytics/users',
  analyticsEngagement: '/dashboard/analytics/engagement',
  analyticsRevenue: '/dashboard/analytics/revenue',
  /* P64 Phase 4 — the Platform Owner's operational reporting: checkout
     commerce and content delivery each get a page, so the dashboard can
     stay an executive overview. */
  analyticsCommerce: '/dashboard/analytics/commerce',
  analyticsDelivery: '/dashboard/analytics/delivery',
  /** P64 Communications C7 — the platform email pipeline console. */
  analyticsCommunications: '/dashboard/analytics/communications',
  /** Phase 9 — the Client Owner's student progress rollup (roadmap CO11). */
  studentAnalytics: '/dashboard/student-analytics',
  platform: '/dashboard/platform',
  search: '/dashboard/search',
  academy: '/dashboard/academy',
  academyCreate: '/dashboard/academy/create',
  /**
   * RETIRED — the old client-side academy wizard. Kept only as a
   * forwarding address (`LegacyAcademyOnboardingRedirect`): an owner with
   * setup still open goes to `ONBOARDING_ROUTES.root`, anyone else to the
   * academy dashboard. Nothing should link here any more.
   */
  academyOnboarding: '/dashboard/academy/:academyId/onboarding',
  academyProfile: '/dashboard/academy/:academyId/profile',
  academySettings: '/dashboard/academy/:academyId/settings',
  academyBranding: '/dashboard/academy/:academyId/branding',
  academyMembers: '/dashboard/academy/:academyId/members',
  academyCourses: '/dashboard/academy/:academyId/courses',
  academyCourseCreate: '/dashboard/academy/:academyId/courses/create',
  academyCourseDetail: '/dashboard/academy/:academyId/courses/:courseId',
  academyCourseBuilder:
    '/dashboard/academy/:academyId/courses/:courseId/builder',
  academyCourseSettings:
    '/dashboard/academy/:academyId/courses/:courseId/settings',
  academyCourseReviews:
    '/dashboard/academy/:academyId/courses/:courseId/reviews',
  academyCourseQuizzes:
    '/dashboard/academy/:academyId/courses/:courseId/quizzes',
  academyCourseQuizCreate:
    '/dashboard/academy/:academyId/courses/:courseId/quizzes/create',
  academyCourseQuizEdit:
    '/dashboard/academy/:academyId/courses/:courseId/quizzes/:quizId',
  academyCourseAssignments:
    '/dashboard/academy/:academyId/courses/:courseId/assignments',
  /*
    P64 Phase 2 (D2 / AD-12) — there is no `learning` group here any more.

    Phase 1 stopped MOUNTING the learner pages under `/dashboard/learning/*`
    but kept their constants, so the paths still looked like real dashboard
    routes to every consumer that reads this registry (smart back, the
    navigation config, `LearningPaths`). Phase 2 finishes the removal: the
    learner surface is `LEARNER_ROUTES` below, and the old dashboard URLs
    survive ONLY as the redirect table `RETIRED_DASHBOARD_LEARNER_ROUTES`,
    which is deliberately not part of `DASHBOARD_ROUTES` because nothing
    renders there — they are forwarding addresses, not pages.

    Instructor, review, academy, tenant and platform routes are untouched:
    D2 retires the LEARNER surface inside the management dashboard, not
    the management dashboard.
  */
  instructorDashboard: '/dashboard/instructor',
  instructorCourses: '/dashboard/instructor/courses',
  instructorCourseOverview: '/dashboard/instructor/courses/:courseId',
  instructorStudents: '/dashboard/instructor/courses/:courseId/students',
  instructorStudentProgress:
    '/dashboard/instructor/courses/:courseId/students/:studentId',
  instructorAssessments: '/dashboard/instructor/courses/:courseId/assessments',
  instructorQuizResults:
    '/dashboard/instructor/courses/:courseId/quizzes/:quizId/results',
  /** P64 Phase 3 — reviewer attempt detail (answers, grading, event timeline). */
  instructorQuizAttempt:
    '/dashboard/instructor/courses/:courseId/quizzes/:quizId/attempts/:attemptId',
  instructorSubmissions:
    '/dashboard/instructor/courses/:courseId/assignments/:assignmentId/submissions',
  instructorSubmissionReview:
    '/dashboard/instructor/courses/:courseId/assignments/:assignmentId/submissions/:submissionId',
  instructorAnnouncements:
    '/dashboard/instructor/courses/:courseId/announcements',
  instructorDiscussions: '/dashboard/instructor/courses/:courseId/discussions',
  instructorThread:
    '/dashboard/instructor/courses/:courseId/discussions/:threadId',

  announcements: '/dashboard/announcements',
  announcementDetail: '/dashboard/announcements/:announcementId',

  blog: '/dashboard/blog',
  blogCreate: '/dashboard/blog/create',
  blogPost: '/dashboard/blog/:postId',
  blogEdit: '/dashboard/blog/:postId/edit',

  tenant: '/dashboard/tenant',
  /** Phase P19 — first-time plan browsing, reachable independent of an existing subscription (unlike `tenantSubscription`'s comparison dialog, which assumes one). See `Reports/DEVELOPMENT_E2E_FLOW_AUDIT.md` P2 "Plans browsing". */
  plans: '/dashboard/plans',
  tenantSubscription: '/dashboard/tenant/subscription',
  tenantUsage: '/dashboard/tenant/usage',
  tenantAddOns: '/dashboard/tenant/add-ons',
  /**
   * P64 C6 — Data & retention. The destination every hosted-video warning
   * email already linked to (`TENANT_RETENTION_PATH` in the backend's
   * communication catalog); this constant is what finally gives that link
   * somewhere to land. Changing it here without changing it there sends a
   * warned customer to a 404, so the two are deliberately identical
   * strings.
   */
  tenantRetention: '/dashboard/tenant/retention',

  /*
    Phase 12 — the Add-ons area.

    Nested on purpose: `Add-ons > Live Sessions > (Sessions | Recordings |
    Connection)` is a real hierarchy, and flattening it into unrelated
    top-level links is exactly what stops the sidebar scaling when a
    second add-on arrives.
  */
  addOns: '/dashboard/add-ons',
  liveSessions: '/dashboard/add-ons/live-sessions',
  liveSessionsList: '/dashboard/add-ons/live-sessions/sessions',
  liveSessionsRecordings: '/dashboard/add-ons/live-sessions/recordings',
  liveSessionsSettings: '/dashboard/add-ons/live-sessions/connection',

  platformTrialPolicy: '/dashboard/platform/trial',
  platformDomain: '/dashboard/platform/domain',

  tenantBilling: '/dashboard/tenant/billing',
  tenantBillingCheckout:
    '/dashboard/tenant/billing/checkout/:targetType/:targetKey',
  tenantBillingPayments: '/dashboard/tenant/billing/payments',
  tenantBillingPaymentDetail: '/dashboard/tenant/billing/payments/:paymentId',
  tenantBillingInvoices: '/dashboard/tenant/billing/invoices',

  platformPayments: '/dashboard/platform/payments',
  platformPaymentDetail: '/dashboard/platform/payments/:paymentId',
  platformAtlasPaymentProvider: '/dashboard/platform/atlas-payment-provider',

  /*
    Platform Owner commerce management — course-order payment review,
    academy payouts and the commission hierarchy. Grouped under one
    `commerce/` branch so the sidebar can nest them; deliberately separate
    from `platform/payments`, which is the SUBSCRIPTION review queue (the
    backend keeps the two route trees apart for the same reason).
  */
  platformCoursePayments: '/dashboard/platform/commerce/course-payments',
  platformCoursePaymentDetail:
    '/dashboard/platform/commerce/course-payments/:paymentId',
  platformPayouts: '/dashboard/platform/commerce/payouts',
  platformCommission: '/dashboard/platform/commerce/commission',

  provisioning: '/dashboard/provisioning',
  provisioningNew: '/dashboard/provisioning/new',
  provisioningStatus: '/dashboard/provisioning/:requestId',

  platformProvisioning: '/dashboard/platform/provisioning',
  platformProvisioningDetail: '/dashboard/platform/provisioning/:requestId',

  platformSubscriptions: '/dashboard/platform/subscriptions',
  platformOrganizations: '/dashboard/platform/organizations',
  platformOrganizationDetail:
    '/dashboard/platform/organizations/:organizationId',

  platformAcademies: '/dashboard/platform/academies',
  platformAcademyDetail: '/dashboard/platform/academies/:academyId',

  /*
    Global Courses (P60) — the Platform Owner's cross-tenant course
    console. Nested under `platform/` like every other operator area and
    deliberately distinct from `/dashboard/courses`, which is one academy's
    own course list.
  */
  platformCourses: '/dashboard/platform/courses',
  platformCourseDetail: '/dashboard/platform/courses/:courseId',

  platformUsers: '/dashboard/platform/users',
  platformUserDetail: '/dashboard/platform/users/:userId',

  platformRolesPermissions: '/dashboard/platform/roles-permissions',

  /*
    Zoom Operations Center (P50) — a Platform Owner operations surface, not
    an academy one. Nested under `platform/` like every other operator
    area, and deliberately distinct from the academy-facing
    `add-ons/live-sessions/*` routes: one is "is Zoom healthy across
    Atlas", the other is "configure my own academy's Zoom".
  */
  platformZoom: '/dashboard/platform/zoom',
  platformZoomConnections: '/dashboard/platform/zoom/connections',
  platformZoomSessions: '/dashboard/platform/zoom/live-sessions',
  platformZoomAttendance: '/dashboard/platform/zoom/attendance',
  platformZoomRecordings: '/dashboard/platform/zoom/recordings',
  platformZoomEvents: '/dashboard/platform/zoom/events',
  platformZoomHealth: '/dashboard/platform/zoom/health',
  platformZoomActivity: '/dashboard/platform/zoom/activity',
  platformZoomAcademyDetail: '/dashboard/platform/zoom/academies/:academyId',

  /*
    Observability Center — Platform Owner only. `platformObservability` is
    an index that redirects to Health. The rule-detail path is ALSO the
    target of Alertmanager's Slack "View Alert" links, so its shape
    (`/alerts/:ruleName`) is a public contract: do not rename it.
  */
  platformObservability: '/dashboard/platform/observability',
  platformObservabilityHealth: '/dashboard/platform/observability/health',
  platformObservabilityAlerts: '/dashboard/platform/observability/alerts',
  platformObservabilityAlertRule:
    '/dashboard/platform/observability/alerts/:ruleName',
  platformObservabilityMetrics: '/dashboard/platform/observability/metrics',
  platformObservabilityConfiguration:
    '/dashboard/platform/observability/configuration',

  platformAuditLog: '/dashboard/platform/audit-log',
  platformAuditLogDetail: '/dashboard/platform/audit-log/:eventId',

  /** The TENANT's own support centre — distinct from the Platform-Owner console below. */
  support: '/dashboard/support',
  supportDetail: '/dashboard/support/:caseId',

  platformSupport: '/dashboard/platform/support',
  platformSupportDetail: '/dashboard/platform/support/:caseId',

  platformPlanCatalog: '/dashboard/platform/plans',

  /** Add-ons Catalog Management (P51) — Platform Owner controls the customer-store publication state of every add-on. */
  platformAddOns: '/dashboard/platform/add-ons',

  /** The Academy's own media library. Academy-scoped by route, because the assets themselves are academy-owned. */
  academyMedia: '/dashboard/academy/:academyId/media',

  /** P64 Phase 3 (D6/D7) — issued certificates and the academy's certificate template. Academy-scoped by route like media. */
  academyCertificates: '/dashboard/academy/:academyId/certificates',
  academyCertificateTemplate:
    '/dashboard/academy/:academyId/certificates/template',

  /** Academy-wide announcement authoring — distinct from `announcements`, which is the reader's cross-scope feed. */
  academyAnnouncements: '/dashboard/academy/:academyId/announcements',

  /** P64 Phase 4 §E.5 — the owner's integrity / sharing / quota reports. Academy-scoped by route like media and certificates. */
  academyReports: '/dashboard/academy/:academyId/reports',

  /**
   * P13 — the academy's net unsettled revenue and its payout history.
   * Organization-Owner-only server-side (`assertCanViewAcademyFinance`), so
   * the route is gated on the owner-only `tenant.billing.view`.
   */
  academyRevenue: '/dashboard/academy/:academyId/revenue',

  /** The Website Management landing (Prompt 10) — `websiteSettings` moved to its own sub-path to make room for it. */
  websiteOverview: '/dashboard/academy/:academyId/website',
  websiteSettings: '/dashboard/academy/:academyId/website/settings',
  websiteContent: '/dashboard/academy/:academyId/website/content',
  websitePages: '/dashboard/academy/:academyId/website/pages',
  websitePageEditor: '/dashboard/academy/:academyId/website/pages/:pageId',
  websitePreview: '/dashboard/academy/:academyId/website/preview',
} as const;

/**
 * Paths rendered inside the learner dashboard shell (P64 Phase 2 §E.1).
 *
 * These are ACADEMY-HOST paths, not platform-host ones: the learner surface
 * is mounted by `PublicWebsiteRouter`, so `/my/courses` means
 * `https://<academy host>/my/courses` and its Arabic twin is `/ar/my/courses`.
 * The constants here are always the bare, unprefixed English form — the one
 * place the `/ar` prefix is applied is `withPublicWebsiteLocale`, and
 * pre-applying it anywhere else doubles it. That is why these live in their
 * own group rather than inside `DASHBOARD_ROUTES`: a dashboard path is
 * absolute and host-agnostic, a learner path is neither.
 *
 * The group exists at all (rather than the pages hardcoding their own
 * strings) so the redirect table below, the learner navigation and the
 * breadcrumb trails all read the same declaration — the whole point of this
 * registry.
 */
export const LEARNER_ROUTES = {
  /** Overview — the learner dashboard home. */
  root: '/my',
  courses: '/my/courses',
  /** One course's progress: outline, states and lock reasons. */
  courseProgress: '/my/courses/:courseId',
  /**
   * The unified player, showing one LESSON (P64 Phase 2 §E.2).
   *
   * A lesson keeps its own path rather than joining `playerActivity`
   * below for one concrete reason: a PREVIEW lesson must open for a
   * visitor who has no account yet (§V), and the sequence endpoint —
   * which is what tells the player what type an item id is — requires a
   * session. The type therefore has to be readable from the URL in the
   * one case where nothing else can supply it.
   */
  playerLesson: '/my/courses/:courseId/learn/:lessonId',
  /**
   * The unified player, showing a quiz, assignment or live session.
   *
   * No type segment: every one of these requires a session, so the
   * sequence is always available to say which type this id is, and a type
   * in the URL would be a second copy of that fact able to disagree with
   * it.
   */
  playerActivity: '/my/courses/:courseId/activities/:itemId',
  /** Quizzes and Assignments, as two tabs of one page. */
  assessments: '/my/assessments',
  /** Empty until Phase 3 issues the first certificate. */
  certificates: '/my/certificates',
  purchases: '/my/purchases',
  /** P64 Phase 4 — the paid-course checkout (order → payment → proof). */
  courseCheckout: '/my/courses/:courseId/checkout',
  devices: '/my/devices',
  /** The learner's own notification centre — grades, certificates, sessions, purchases. */
  notifications: '/my/notifications',
  profile: '/my/profile',
  security: '/my/security',
} as const;

/** One retired URL and the `LEARNER_ROUTES` template that replaces it. */
export interface RetiredLearnerRoute {
  readonly from: string;
  readonly to: string;
}

/**
 * The learner URLs that used to be served elsewhere, and where each one now
 * goes (D2 / AD-12).
 *
 * Two families, because they are retired for different reasons and are
 * redirected by different code:
 *
 * - `RETIRED_ACADEMY_LEARNER_ROUTES` are same-origin academy-website paths
 *   (`/my-learning`, `/my-account`) that predate the `/my/*` shell. They
 *   are redirected client-side by `PublicWebsiteRouter`, so a bookmark, an
 *   emailed link or a CMS link written before this release still lands on
 *   the right page.
 * - `RETIRED_DASHBOARD_LEARNER_ROUTES` are the `/dashboard/learning/*`
 *   paths D2 deletes outright. Their replacement lives on a DIFFERENT
 *   ORIGIN (the learner's own academy host), which no client-side
 *   `<Navigate>` can reach — so they resolve to `LearnerSurfaceRedirectPage`,
 *   which resolves the account's academy host and then leaves the origin.
 *   The `to` side is a `LEARNER_ROUTES` template; `:courseId` is carried
 *   across from the old URL by `resolveRetiredLearnerTarget`.
 *
 * Deliberately NOT part of `DASHBOARD_ROUTES`: nothing renders at these
 * paths any more, so no breadcrumb, smart-back or navigation consumer
 * should ever treat them as a destination.
 */
export const RETIRED_ACADEMY_LEARNER_ROUTES: readonly RetiredLearnerRoute[] = [
  { from: '/my-learning', to: LEARNER_ROUTES.courses },
  { from: '/my-account', to: LEARNER_ROUTES.profile },
  /*
    Pre-Phase-3 learner baseline (21 Sep 2026) — the legacy course page
    and lesson player under `/my-learning/courses/...` are retired too.
    Phase 2 §E.2 shipped the unified player at `LEARNER_ROUTES.playerLesson`
    and the course outline at `courseProgress`; leaving the old pages
    mounted meant the SAME lesson opened in two different players
    depending on which link the learner followed. P64 Phase 3 moved the
    quiz and assignment attempts into that same player, so their legacy
    URLs now land on the activity (the item id IS the quiz/assignment id).
  */
  {
    from: '/my-learning/courses/:courseId',
    to: LEARNER_ROUTES.courseProgress,
  },
  {
    from: '/my-learning/courses/:courseId/learn',
    to: LEARNER_ROUTES.courseProgress,
  },
  {
    from: '/my-learning/courses/:courseId/learn/:lessonId',
    to: LEARNER_ROUTES.playerLesson,
  },
  {
    from: '/my-learning/courses/:courseId/quizzes/:itemId',
    to: LEARNER_ROUTES.playerActivity,
  },
  {
    from: '/my-learning/courses/:courseId/assignments/:itemId',
    to: LEARNER_ROUTES.playerActivity,
  },
];

export const RETIRED_DASHBOARD_LEARNER_ROUTES: readonly RetiredLearnerRoute[] =
  [
    { from: '/dashboard/learning', to: LEARNER_ROUTES.root },
    { from: '/dashboard/learning/my-courses', to: LEARNER_ROUTES.courses },
    { from: '/dashboard/learning/my-results', to: LEARNER_ROUTES.assessments },
    { from: '/dashboard/learning/courses', to: LEARNER_ROUTES.courses },
    {
      from: '/dashboard/learning/courses/:courseId',
      to: LEARNER_ROUTES.courseProgress,
    },
    /*
      A lesson bookmark lands on that lesson in the unified player (Phase 2
      §E.2). Every OTHER in-course activity lands on the course's own
      progress page, which names the activity and shows its state: quizzes
      and assignments open in the player since P64 Phase 3, and
      live sessions and discussions have no player screen — sending a
      bookmark to an outline that names them is honest, inventing a player
      path that does not exist would not be.
    */
    {
      from: '/dashboard/learning/courses/:courseId/learn',
      to: LEARNER_ROUTES.courseProgress,
    },
    {
      from: '/dashboard/learning/courses/:courseId/learn/:lessonId',
      to: LEARNER_ROUTES.playerLesson,
    },
    {
      from: '/dashboard/learning/courses/:courseId/quizzes/:itemId',
      to: LEARNER_ROUTES.playerActivity,
    },
    {
      from: '/dashboard/learning/courses/:courseId/assignments/:itemId',
      to: LEARNER_ROUTES.playerActivity,
    },
    {
      from: '/dashboard/learning/courses/:courseId/live-sessions/:liveSessionId',
      to: LEARNER_ROUTES.courseProgress,
    },
    {
      from: '/dashboard/learning/courses/:courseId/discussions',
      to: LEARNER_ROUTES.courseProgress,
    },
    {
      from: '/dashboard/learning/courses/:courseId/discussions/:threadId',
      to: LEARNER_ROUTES.courseProgress,
    },
  ];

/**
 * New Customer Onboarding — the full-screen setup shell a new organization
 * owner is sent to from `/dashboard` while `onboardingPending` is true.
 *
 * Deliberately OUTSIDE `/dashboard`: setup is one step per screen with no
 * sidebar, and keeping it out of the dashboard subtree means no dashboard
 * route (and no deep link into one) is ever captured by it. The dashboard
 * card and the legacy `academyOnboarding` path link here.
 */
export const ONBOARDING_ROUTES = {
  root: '/onboarding',
  /** `:step` is an `OnboardingScreenKey` — a step key or `summary`. */
  step: '/onboarding/:step',
} as const;

/** System paths that exist outside the product modules. */
export const SYSTEM_ROUTES = {
  forbidden: '/403',
  notFound: '*',
} as const;

/** Every route group, exposed as one object for convenience. */
export const ROUTES = {
  public: PUBLIC_ROUTES,
  auth: AUTH_ROUTES,
  dashboard: DASHBOARD_ROUTES,
  learner: LEARNER_ROUTES,
  onboarding: ONBOARDING_ROUTES,
  system: SYSTEM_ROUTES,
} as const;

/** Where an authenticated user lands after signing in. */
export const AUTHENTICATED_ENTRY_ROUTE: string = DASHBOARD_ROUTES.root;

/** Where an unauthenticated user is sent when a guard rejects them. */
export const UNAUTHENTICATED_ENTRY_ROUTE: string = AUTH_ROUTES.signIn;

/**
 * Builds a path from a parameterised template.
 *
 * Used by future modules for detail routes such as `/courses/:courseId`.
 *
 * @example buildPath('/courses/:courseId', { courseId: 'abc' }) // '/courses/abc'
 */
export function buildPath(
  template: string,
  params: Readonly<Record<string, string>>
): string {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(value)),
    template
  );
}

/**
 * Reports whether a location belongs to a route subtree.
 *
 * Used by navigation to keep a parent entry active on nested pages.
 */
export function isPathActive(
  currentPath: string,
  targetPath: string,
  matchNestedPaths = false
): boolean {
  if (currentPath === targetPath) return true;
  if (!matchNestedPaths) return false;

  // Guard against `/dashboard` matching `/dashboard-settings`.
  const prefix = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;
  return currentPath.startsWith(prefix);
}
