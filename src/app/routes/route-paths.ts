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
} as const;

/**
 * Paths rendered inside the authentication layout.
 */
export const AUTH_ROUTES = {
  root: '/auth',
  signIn: '/auth/sign-in',
  register: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
} as const;

/** Paths rendered inside the authenticated dashboard layout. */
export const DASHBOARD_ROUTES = {
  root: '/dashboard',
  profile: '/dashboard/profile',
  settings: '/dashboard/settings',
  notifications: '/dashboard/notifications',
  billing: '/dashboard/billing',
  analytics: '/dashboard/analytics',
  platform: '/dashboard/platform',
  search: '/dashboard/search',
  academy: '/dashboard/academy',
  academyCreate: '/dashboard/academy/create',
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
  learning: '/dashboard/learning',
  learningCourses: '/dashboard/learning/courses',
  learningCourseDetail: '/dashboard/learning/courses/:courseId',
  learningCourseLearn: '/dashboard/learning/courses/:courseId/learn',
  learningLesson: '/dashboard/learning/courses/:courseId/learn/:lessonId',
  learningQuiz: '/dashboard/learning/courses/:courseId/quizzes/:quizId',
  learningAssignment:
    '/dashboard/learning/courses/:courseId/assignments/:assignmentId',
  learningDiscussions: '/dashboard/learning/courses/:courseId/discussions',
  learningThread:
    '/dashboard/learning/courses/:courseId/discussions/:threadId',

  instructorDashboard: '/dashboard/instructor',
  instructorCourses: '/dashboard/instructor/courses',
  instructorCourseOverview: '/dashboard/instructor/courses/:courseId',
  instructorStudents: '/dashboard/instructor/courses/:courseId/students',
  instructorStudentProgress:
    '/dashboard/instructor/courses/:courseId/students/:studentId',
  instructorAssessments:
    '/dashboard/instructor/courses/:courseId/assessments',
  instructorQuizResults:
    '/dashboard/instructor/courses/:courseId/quizzes/:quizId/results',
  instructorSubmissions:
    '/dashboard/instructor/courses/:courseId/assignments/:assignmentId/submissions',
  instructorSubmissionReview:
    '/dashboard/instructor/courses/:courseId/assignments/:assignmentId/submissions/:submissionId',
  instructorAnnouncements:
    '/dashboard/instructor/courses/:courseId/announcements',
  instructorDiscussions:
    '/dashboard/instructor/courses/:courseId/discussions',
  instructorThread:
    '/dashboard/instructor/courses/:courseId/discussions/:threadId',

  announcements: '/dashboard/announcements',
  announcementDetail: '/dashboard/announcements/:announcementId',

  blog: '/dashboard/blog',
  blogCreate: '/dashboard/blog/create',
  blogPost: '/dashboard/blog/:postId',
  blogEdit: '/dashboard/blog/:postId/edit',

  tenant: '/dashboard/tenant',
  tenantSubscription: '/dashboard/tenant/subscription',
  tenantUsage: '/dashboard/tenant/usage',
  tenantAddOns: '/dashboard/tenant/add-ons',

  platformTrialPolicy: '/dashboard/platform/trial',

  tenantBilling: '/dashboard/tenant/billing',
  tenantBillingCheckout:
    '/dashboard/tenant/billing/checkout/:targetType/:targetKey',
  tenantBillingPayments: '/dashboard/tenant/billing/payments',
  tenantBillingPaymentDetail: '/dashboard/tenant/billing/payments/:paymentId',
  tenantBillingInvoices: '/dashboard/tenant/billing/invoices',

  platformPayments: '/dashboard/platform/payments',
  platformPaymentDetail: '/dashboard/platform/payments/:paymentId',

  provisioning: '/dashboard/provisioning',
  provisioningNew: '/dashboard/provisioning/new',
  provisioningStatus: '/dashboard/provisioning/:requestId',

  platformProvisioning: '/dashboard/platform/provisioning',
  platformProvisioningDetail: '/dashboard/platform/provisioning/:requestId',

  /** The Website Management landing (Prompt 10) — `websiteSettings` moved to its own sub-path to make room for it. */
  websiteOverview: '/dashboard/academy/:academyId/website',
  websiteSettings: '/dashboard/academy/:academyId/website/settings',
  websiteContent: '/dashboard/academy/:academyId/website/content',
  websitePages: '/dashboard/academy/:academyId/website/pages',
  websitePageEditor: '/dashboard/academy/:academyId/website/pages/:pageId',
  websitePreview: '/dashboard/academy/:academyId/website/preview',
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