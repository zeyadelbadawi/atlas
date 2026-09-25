import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { ENV } from '@config';
import { getCurrentPublicWebsiteContext } from '@features/public-website';
import { ErrorBoundary } from '@app/providers/error/ErrorBoundary';
import { PublicLayout } from '@app/layouts/public/PublicLayout';
import { AuthLayout } from '@app/layouts/auth/AuthLayout';
import { DashboardLayout } from '@app/layouts/dashboard/DashboardLayout';

import {
  AUTH_ROUTES,
  PUBLIC_ROUTES,
  SYSTEM_ROUTES,
  DASHBOARD_ROUTES,
  RETIRED_DASHBOARD_LEARNER_ROUTES,
  AUTHENTICATED_ENTRY_ROUTE,
} from './route-paths';

import { RouteGuard } from './guards';
import { RouteFallback } from './RouteFallback';

// Lazily loaded so each route ships as its own chunk.
const HomePage = lazy(() => import('@features/home/pages/HomePage'));
const FeaturesPage = lazy(() => import('@features/home/pages/FeaturesPage'));
const PricingPage = lazy(() => import('@features/home/pages/PricingPage'));

const SignInPage = lazy(() => import('@features/auth/pages/SignInPage'));
const RegistrationPage = lazy(
  () => import('@features/auth/pages/RegistrationPage')
);
const ForgotPasswordPage = lazy(
  () => import('@features/auth/pages/ForgotPasswordPage')
);
const ResetPasswordPage = lazy(
  () => import('@features/auth/pages/ResetPasswordPage')
);
const VerifyEmailPage = lazy(
  () => import('@features/auth/pages/VerifyEmailPage')
);
const AcademyChooserPage = lazy(
  () => import('@features/auth/pages/AcademyChooserPage')
);
const LearnerSurfaceRedirectPage = lazy(
  () => import('@features/auth/pages/LearnerSurfaceRedirectPage')
);

const AddOnsCatalogPage = lazy(
  () => import('@features/live-sessions/pages/AddOnsCatalogPage')
);
const LiveSessionsOverviewPage = lazy(
  () => import('@features/live-sessions/pages/LiveSessionsOverviewPage')
);
const LiveSessionsConnectionPage = lazy(
  () => import('@features/live-sessions/pages/LiveSessionsConnectionPage')
);
import { DashboardIndexRoute } from './DashboardIndexRoute';

const DashboardOverviewPage = lazy(
  () => import('@features/dashboard/pages/DashboardOverviewPage')
);

const ProfilePage = lazy(() => import('@features/profile/pages/ProfilePage'));
const OrganizationOverviewPage = lazy(
  () => import('@features/organization/pages/OrganizationOverviewPage')
);
const OrganizationCreatePage = lazy(
  () => import('@features/organization/pages/OrganizationCreatePage')
);
const PlatformDashboardPage = lazy(
  () => import('@features/platform/pages/PlatformDashboardPage')
);
const SettingsPage = lazy(
  () => import('@features/settings/pages/SettingsPage')
);
const NotificationsPage = lazy(
  () => import('@features/notifications/pages/NotificationsPage')
);
const AnalyticsLayout = lazy(
  () => import('@features/analytics/pages/AnalyticsLayout')
);
const AnalyticsOverviewPage = lazy(
  () => import('@features/analytics/pages/AnalyticsOverviewPage')
);
const AnalyticsUsersPage = lazy(
  () => import('@features/analytics/pages/AnalyticsUsersPage')
);
const AnalyticsEngagementPage = lazy(
  () => import('@features/analytics/pages/AnalyticsEngagementPage')
);
const AnalyticsRevenuePage = lazy(
  () => import('@features/analytics/pages/AnalyticsRevenuePage')
);
const AnalyticsCommercePage = lazy(
  () => import('@features/analytics/pages/AnalyticsCommercePage')
);
const AnalyticsCommunicationsPage = lazy(
  () => import('@features/analytics/pages/AnalyticsCommunicationsPage')
);
const AnalyticsDeliveryPage = lazy(
  () => import('@features/analytics/pages/AnalyticsDeliveryPage')
);
const SearchPage = lazy(() => import('@features/search/pages/SearchPage'));
const SupportCenterPage = lazy(
  () => import('@features/support/pages/SupportCenterPage')
);
const SupportCaseDetailPage = lazy(
  () => import('@features/support/pages/SupportCaseDetailPage')
);

const AcademyDashboardPage = lazy(
  () => import('@features/academy/pages/AcademyDashboardPage')
);
const AcademyProfilePage = lazy(
  () => import('@features/academy/pages/AcademyProfilePage')
);
const AcademySettingsPage = lazy(
  () => import('@features/academy/pages/AcademySettingsPage')
);
const AcademyBrandingPage = lazy(
  () => import('@features/academy/pages/AcademyBrandingPage')
);
const AcademyMembersPage = lazy(
  () => import('@features/academy/pages/AcademyMembersPage')
);
const AcademyOnboardingPage = lazy(
  () => import('@features/academy/pages/AcademyOnboardingPage')
);

const CourseListPage = lazy(
  () => import('@features/course/pages/CourseListPage')
);
const CourseCreatePage = lazy(
  () => import('@features/course/pages/CourseCreatePage')
);
const CourseEditPage = lazy(
  () => import('@features/course/pages/CourseEditPage')
);
const CourseBuilderPage = lazy(
  () => import('@features/course/pages/CourseBuilderPage')
);
const CourseSettingsPage = lazy(
  () => import('@features/course/pages/CourseSettingsPage')
);
const CourseReviewsModerationPage = lazy(
  () => import('@features/course/pages/CourseReviewsModerationPage')
);
const CourseQuizzesPage = lazy(
  () => import('@features/course/pages/CourseQuizzesPage')
);
const CourseQuizEditorPage = lazy(
  () => import('@features/course/pages/CourseQuizEditorPage')
);
const CourseAssignmentsPage = lazy(
  () => import('@features/course/pages/CourseAssignmentsPage')
);

// P64 Phase 2 (D2 / AD-12) — the learner pages are no longer mounted under
// `/dashboard/learning/*`, and since this phase their route constants are
// gone from `DASHBOARD_ROUTES` too: the learner surface is `/my/*` on the
// academy website (`PublicWebsiteRouter`). What is left of the old paths is
// `RETIRED_DASHBOARD_LEARNER_ROUTES`, a forwarding table, mounted below.
//
// `StudentAnalyticsPage` is NOT one of them despite the name — it is the
// Client Owner's cross-student progress rollup at `/dashboard/student-
// analytics`, a management page about learners rather than a learner's own.
const StudentAnalyticsPage = lazy(
  () => import('@features/dashboard/pages/StudentAnalyticsPage')
);
// P64 Phase 4 §E.5 — the owner's per-academy integrity / sharing / quota
// reports. Same management-analytics family as `StudentAnalyticsPage`.
const AcademyReportsPage = lazy(
  () => import('@features/dashboard/pages/AcademyReportsPage')
);

const InstructorDashboardPage = lazy(
  () => import('@features/instructor/pages/InstructorDashboardPage')
);
const InstructorCoursesPage = lazy(
  () => import('@features/instructor/pages/InstructorCoursesPage')
);
const InstructorCourseOverviewPage = lazy(
  () => import('@features/instructor/pages/InstructorCourseOverviewPage')
);
const InstructorStudentsPage = lazy(
  () => import('@features/instructor/pages/InstructorStudentsPage')
);
const InstructorStudentProgressPage = lazy(
  () => import('@features/instructor/pages/InstructorStudentProgressPage')
);
const InstructorAssessmentsPage = lazy(
  () => import('@features/instructor/pages/InstructorAssessmentsPage')
);
const InstructorQuizResultsPage = lazy(
  () => import('@features/instructor/pages/InstructorQuizResultsPage')
);
const InstructorQuizAttemptPage = lazy(
  () => import('@features/instructor/pages/InstructorQuizAttemptPage')
);
const InstructorSubmissionsPage = lazy(
  () => import('@features/instructor/pages/InstructorSubmissionsPage')
);
const InstructorSubmissionReviewPage = lazy(
  () => import('@features/instructor/pages/InstructorSubmissionReviewPage')
);

const AnnouncementFeedPage = lazy(
  () => import('@features/announcements/pages/AnnouncementFeedPage')
);
const AnnouncementDetailPage = lazy(
  () => import('@features/announcements/pages/AnnouncementDetailPage')
);
const InstructorAnnouncementsPage = lazy(
  () => import('@features/announcements/pages/InstructorAnnouncementsPage')
);
const AcademyAnnouncementsPage = lazy(
  () => import('@features/announcements/pages/AcademyAnnouncementsPage')
);
const AcademyMediaPage = lazy(
  () => import('@features/media/pages/AcademyMediaPage')
);
// P64 Phase 3 §E.6 (D6/D7) — certificates: the academy's issued list and
// template, plus the public verify sheet on the platform host.
const AcademyCertificatesPage = lazy(
  () => import('@features/certificates/pages/AcademyCertificatesPage')
);
const AcademyCertificateTemplatePage = lazy(
  () => import('@features/certificates/pages/AcademyCertificateTemplatePage')
);
const CertificateVerifyPage = lazy(
  () => import('@features/certificates/pages/CertificateVerifyPage')
);

const BlogListPage = lazy(() => import('@features/blog/pages/BlogListPage'));
const BlogPostDetailPage = lazy(
  () => import('@features/blog/pages/BlogPostDetailPage')
);
const BlogEditorPage = lazy(
  () => import('@features/blog/pages/BlogEditorPage')
);

const CourseForumPage = lazy(
  () => import('@features/forum/pages/CourseForumPage')
);
const ForumThreadPage = lazy(
  () => import('@features/forum/pages/ForumThreadPage')
);

const TenantDashboardPage = lazy(
  () => import('@features/tenant/pages/TenantDashboardPage')
);
const TenantSubscriptionPage = lazy(
  () => import('@features/tenant/pages/TenantSubscriptionPage')
);
const PlansPage = lazy(() => import('@features/tenant/pages/PlansPage'));
const TenantUsagePage = lazy(
  () => import('@features/tenant/pages/TenantUsagePage')
);
const TenantAddOnsPage = lazy(
  () => import('@features/tenant/pages/TenantAddOnsPage')
);
/*
  P64 C6 — Data & retention. Lazy like its siblings: it is a page most
  owners never open, reached from the lifecycle panel and from the link
  inside a hosted-video warning email.
*/
const TenantRetentionPage = lazy(
  () => import('@features/tenant/pages/TenantRetentionPage')
);
const PlatformTrialPolicyPage = lazy(
  () => import('@features/tenant/pages/PlatformTrialPolicyPage')
);
const PlatformDomainSettingsPage = lazy(
  () => import('@features/domain/pages/PlatformDomainSettingsPage')
);

const BillingOverviewPage = lazy(
  () => import('@features/billing/pages/BillingOverviewPage')
);
const CheckoutPage = lazy(() => import('@features/billing/pages/CheckoutPage'));
const PaymentHistoryPage = lazy(
  () => import('@features/billing/pages/PaymentHistoryPage')
);
const PaymentDetailsPage = lazy(
  () => import('@features/billing/pages/PaymentDetailsPage')
);
const InvoicesPage = lazy(() => import('@features/billing/pages/InvoicesPage'));
const PlatformPaymentReviewListPage = lazy(
  () => import('@features/billing/pages/PlatformPaymentReviewListPage')
);
const PlatformPaymentReviewDetailPage = lazy(
  () => import('@features/billing/pages/PlatformPaymentReviewDetailPage')
);
const AtlasSubscriptionPaymentProviderPage = lazy(
  () => import('@features/billing/pages/AtlasSubscriptionPaymentProviderPage')
);
const PlatformCoursePaymentListPage = lazy(
  () => import('@features/platform-commerce/pages/PlatformCoursePaymentListPage')
);
const PlatformCoursePaymentDetailPage = lazy(
  () =>
    import('@features/platform-commerce/pages/PlatformCoursePaymentDetailPage')
);
const PlatformPayoutsPage = lazy(
  () => import('@features/platform-commerce/pages/PlatformPayoutsPage')
);
const PlatformCommissionPage = lazy(
  () => import('@features/platform-commerce/pages/PlatformCommissionPage')
);

const ProvisioningStartPage = lazy(
  () => import('@features/provisioning/pages/ProvisioningStartPage')
);
const ProvisioningStatusPage = lazy(
  () => import('@features/provisioning/pages/ProvisioningStatusPage')
);
const ProvisioningHistoryPage = lazy(
  () => import('@features/provisioning/pages/ProvisioningHistoryPage')
);
const PlatformProvisioningListPage = lazy(
  () => import('@features/provisioning/pages/PlatformProvisioningListPage')
);
const PlatformProvisioningDetailPage = lazy(
  () => import('@features/provisioning/pages/PlatformProvisioningDetailPage')
);
const AdminSubscriptionsPage = lazy(() =>
  import('@features/platform/pages/AdminSubscriptionsPage').then((m) => ({
    default: m.AdminSubscriptionsPage,
  }))
);
const PrivacyPolicyPage = lazy(
  () => import('@features/legal/pages/PrivacyPolicyPage')
);
const TermsPage = lazy(() => import('@features/legal/pages/TermsPage'));
const PlatformOrganizationListPage = lazy(
  () => import('@features/platform/pages/PlatformOrganizationListPage')
);
const PlatformOrganizationDetailPage = lazy(
  () => import('@features/platform/pages/PlatformOrganizationDetailPage')
);
const PlatformAcademyListPage = lazy(
  () => import('@features/platform/pages/PlatformAcademyListPage')
);
const PlatformAcademyDetailPage = lazy(
  () => import('@features/platform/pages/PlatformAcademyDetailPage')
);
const PlatformCourseListPage = lazy(
  () => import('@features/platform/pages/PlatformCourseListPage')
);
const PlatformCourseDetailPage = lazy(
  () => import('@features/platform/pages/PlatformCourseDetailPage')
);
const PlatformUserListPage = lazy(
  () => import('@features/platform/pages/PlatformUserListPage')
);
const PlatformUserDetailPage = lazy(
  () => import('@features/platform/pages/PlatformUserDetailPage')
);
const PlatformRolesPermissionsPage = lazy(
  () => import('@features/platform/pages/PlatformRolesPermissionsPage')
);
/* Zoom Operations Center (P50) — Platform Owner only. */
const ZoomOverviewPage = lazy(
  () => import('@features/platform-zoom/pages/ZoomOverviewPage')
);
const ZoomConnectionsPage = lazy(
  () => import('@features/platform-zoom/pages/ZoomConnectionsPage')
);
const ZoomSessionsPage = lazy(
  () => import('@features/platform-zoom/pages/ZoomSessionsPage')
);
const ZoomAttendancePage = lazy(
  () => import('@features/platform-zoom/pages/ZoomAttendancePage')
);
const ZoomRecordingsPage = lazy(
  () => import('@features/platform-zoom/pages/ZoomRecordingsPage')
);
const ZoomEventsPage = lazy(
  () => import('@features/platform-zoom/pages/ZoomEventsPage')
);
const ZoomHealthPage = lazy(
  () => import('@features/platform-zoom/pages/ZoomHealthPage')
);
const ZoomActivityPage = lazy(
  () => import('@features/platform-zoom/pages/ZoomActivityPage')
);
const ZoomAcademyDetailPage = lazy(
  () => import('@features/platform-zoom/pages/ZoomAcademyDetailPage')
);

const PlatformAuditLogListPage = lazy(
  () => import('@features/audit-log/pages/PlatformAuditLogListPage')
);
const PlatformAuditLogDetailPage = lazy(
  () => import('@features/audit-log/pages/PlatformAuditLogDetailPage')
);
const PlatformSupportListPage = lazy(
  () => import('@features/support/pages/PlatformSupportListPage')
);
const PlatformSupportDetailPage = lazy(
  () => import('@features/support/pages/PlatformSupportDetailPage')
);
const PlatformPlanCatalogPage = lazy(
  () => import('@features/platform/pages/PlatformPlanCatalogPage')
);
const PlatformAddOnsPage = lazy(
  () => import('@features/platform-add-ons/pages/PlatformAddOnsPage')
);

const WebsiteOverviewPage = lazy(
  () => import('@features/website/pages/WebsiteOverviewPage')
);
const WebsiteSettingsPage = lazy(
  () => import('@features/website/pages/WebsiteSettingsPage')
);
const WebsiteContentPage = lazy(
  () => import('@features/website/pages/WebsiteContentPage')
);
const WebsitePagesPage = lazy(
  () => import('@features/website/pages/WebsitePagesPage')
);
const WebsitePageEditorPage = lazy(
  () => import('@features/website/pages/WebsitePageEditorPage')
);
const WebsitePreviewPage = lazy(
  () => import('@features/website/pages/WebsitePreviewPage')
);

const ForbiddenPage = lazy(
  () => import('@features/system/pages/ForbiddenPage')
);
const NotFoundPage = lazy(() => import('@features/system/pages/NotFoundPage'));

const PublicWebsiteRouter = lazy(
  () => import('@features/public-website/PublicWebsiteRouter')
);

export function AppRouter(): JSX.Element {
  const location = useLocation();

  // Resolved ONCE per page load — the hostname a visitor is on cannot
  // change while this SPA instance is running. When no Platform base
  // domain is configured (true in every environment today), this always
  // resolves to `{ mode: 'atlas-app' }` and the branch below is a no-op
  // — see `Reports/ARCHITECTURE.md`, Prompt 11, "No Real Atlas Domain
  // Yet".
  const publicWebsiteContext = getCurrentPublicWebsiteContext(
    ENV.platformBaseDomain,
    ENV.isDevelopment
  );

  if (publicWebsiteContext.mode === 'academy-website') {
    return (
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<RouteFallback />}>
          <PublicWebsiteRouter context={publicWebsiteContext} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path={PUBLIC_ROUTES.home} element={<HomePage />} />
            <Route path={PUBLIC_ROUTES.features} element={<FeaturesPage />} />
            <Route path={PUBLIC_ROUTES.pricing} element={<PricingPage />} />
            {/* Atlas's own legal documents. Public and unauthenticated by
                design — someone must be able to read the privacy policy
                and terms BEFORE deciding to create an account. */}
            <Route
              path={PUBLIC_ROUTES.privacyPolicy}
              element={<PrivacyPolicyPage />}
            />
            <Route path={PUBLIC_ROUTES.terms} element={<TermsPage />} />
            {/* P64 Phase 3 (D6) — public certificate verification. No
                session: the code is the credential. The same sheet is
                mounted on every academy host by `PublicWebsiteRouter`. */}
            <Route
              path={PUBLIC_ROUTES.verify}
              element={<CertificateVerifyPage />}
            />
          </Route>

          {/* Authentication surface */}
          <Route path={AUTH_ROUTES.root} element={<AuthLayout />}>
            <Route
              index
              element={<Navigate to={AUTH_ROUTES.signIn} replace />}
            />

            <Route path={AUTH_ROUTES.signIn} element={<SignInPage />} />

            <Route path={AUTH_ROUTES.register} element={<RegistrationPage />} />

            <Route
              path={AUTH_ROUTES.forgotPassword}
              element={<ForgotPasswordPage />}
            />

            <Route
              path={AUTH_ROUTES.resetPassword}
              element={<ResetPasswordPage />}
            />
            <Route
              path={AUTH_ROUTES.verifyEmail}
              element={<VerifyEmailPage />}
            />
          </Route>

          {/* Authenticated product surface */}
          {/* P64 Phase 1 — the academy chooser a learner with a platform-host
              session is sent to. In the auth layout, outside the dashboard
              chrome, but requiring a session (it lists THAT account's
              academies). */}
          <Route element={<AuthLayout />}>
            <Route
              path={AUTH_ROUTES.academyChooser}
              element={
                <RouteGuard
                  requireAuthentication
                  pendingFallback={<RouteFallback />}
                >
                  <AcademyChooserPage />
                </RouteGuard>
              }
            />
          </Route>

          {/* Authenticated product surface — the MANAGEMENT surface. The
              principal check sits here, at the subtree root, so every
              nested route is covered (P64 Phase 1, AD-5). */}
          <Route
            path={DASHBOARD_ROUTES.root}
            element={
              <RouteGuard
                requireAuthentication
                requireManagementPrincipal
                pendingFallback={<RouteFallback />}
              >
                <DashboardLayout />
              </RouteGuard>
            }
          >
            <Route
              index
              element={
                <DashboardIndexRoute>
                  <DashboardOverviewPage />
                </DashboardIndexRoute>
              }
            />

            <Route path={DASHBOARD_ROUTES.profile} element={<ProfilePage />} />

            <Route
              path={DASHBOARD_ROUTES.organization}
              element={<OrganizationOverviewPage />}
            />

            {/* Phase P19 — no `requiredPermissions`, deliberately: this is
                the org-creation entry point itself, reachable by any
                authenticated user regardless of org membership, matching
                `OrganizationOverviewPage`'s own guard-free pattern above. */}
            <Route
              path={DASHBOARD_ROUTES.organizationCreate}
              element={<OrganizationCreatePage />}
            />

            {/* Phase P19 — first-time plan browsing; no `requiredPermissions`
                so it is reachable before a subscription (and therefore
                `tenant.subscription.view`-gated pages) exist. */}
            <Route path={DASHBOARD_ROUTES.plans} element={<PlansPage />} />

            {/* P64 Phase 1 (F1) — operator-only at the ROUTE, not just in
                the sidebar: these rendered for any signed-in account before,
                empty but present. The API's `PlatformOwnerGuard` is the
                real boundary; this stops the page from pretending. */}
            <Route
              path={DASHBOARD_ROUTES.platform}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <PlatformDashboardPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.settings}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <SettingsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.notifications}
              element={<NotificationsPage />}
            />

            {/* P59 — Analysis is a layout with four child routes, replacing
                four tabs inside one page. Each child loads only its own
                data (the analytics API already exposes them separately), and
                every area is deep-linkable. The role gate stays exactly
                where it was; `PlatformOwnerGuard` on the API is the real
                control. */}
            <Route
              path={DASHBOARD_ROUTES.analytics}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <AnalyticsLayout />
                </RouteGuard>
              }
            >
              <Route index element={<AnalyticsOverviewPage />} />
              <Route path="users" element={<AnalyticsUsersPage />} />
              <Route path="engagement" element={<AnalyticsEngagementPage />} />
              <Route path="revenue" element={<AnalyticsRevenuePage />} />
              {/* P64 Phase 4 — operational reporting. Same guard as the
                  siblings; `PlatformOwnerGuard` on `/platform-metrics/*`
                  is the real control. */}
              <Route path="commerce" element={<AnalyticsCommercePage />} />
              <Route path="delivery" element={<AnalyticsDeliveryPage />} />
              {/* P64 Communications C7 — email pipeline health. Same guard
                  as the siblings; `PlatformOwnerGuard` on
                  `/platform-communications/*` is the real control. */}
              <Route
                path="communications"
                element={<AnalyticsCommunicationsPage />}
              />
            </Route>

            {/* Phase 9 (roadmap CO11) — the Client Owner's student progress
                rollup. `tenant.dashboard.view` is the real owner-exclusive
                permission the backend endpoint itself requires, so the
                route guard and the server agree rather than the guard
                being the only gate. */}
            <Route
              path={DASHBOARD_ROUTES.studentAnalytics}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.dashboard.view']}
                  requiresEntitlement
                >
                  <StudentAnalyticsPage />
                </RouteGuard>
              }
            />

            {/* P64 Phase 4 §E.5 — the owner's per-academy reports. Gated on
                `academy.view` (held by owner AND manager) rather than the
                owner-only `tenant.dashboard.view`, because the backend
                deliberately admits owner/administrator/manager; the server
                enforces that role rule on both endpoints and the page renders
                its 403 as a permission state. */}
            <Route
              path={DASHBOARD_ROUTES.academyReports}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                  requiresEntitlement
                >
                  <AcademyReportsPage />
                </RouteGuard>
              }
            />

            {/*
              Phase 12 — the Add-ons area.

              NOT marked `requiresEntitlement`: this is where a customer
              goes to obtain an add-on, so gating it on already having one
              would be a closed loop. Each page reports its own
              dependencies, and every API call behind them is
              independently authorized.
            */}
            <Route
              path={DASHBOARD_ROUTES.addOns}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.subscription.view']}
                >
                  <AddOnsCatalogPage />
                </RouteGuard>
              }
            />
            <Route
              path={DASHBOARD_ROUTES.liveSessions}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                >
                  <LiveSessionsOverviewPage />
                </RouteGuard>
              }
            />
            <Route
              path={DASHBOARD_ROUTES.liveSessionsList}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                >
                  <LiveSessionsOverviewPage />
                </RouteGuard>
              }
            />
            <Route
              path={DASHBOARD_ROUTES.liveSessionsRecordings}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                >
                  <LiveSessionsOverviewPage />
                </RouteGuard>
              }
            />
            <Route
              path={DASHBOARD_ROUTES.liveSessionsSettings}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.configure']}
                >
                  <LiveSessionsConnectionPage />
                </RouteGuard>
              }
            />

            <Route path={DASHBOARD_ROUTES.search} element={<SearchPage />} />

            {/*
              Support is available to EVERY signed-in role — a student
              who cannot submit a ticket has no way to report a problem.
              Authorization is per-ticket and enforced by RLS, not by a
              route permission, so no `requiredPermissions` here.
            */}
            <Route
              path={DASHBOARD_ROUTES.support}
              element={
                <RouteGuard requireAuthentication>
                  <SupportCenterPage />
                </RouteGuard>
              }
            />
            <Route
              path={DASHBOARD_ROUTES.supportDetail}
              element={
                <RouteGuard requireAuthentication>
                  <SupportCaseDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academy}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                  requiresEntitlement
                >
                  <AcademyDashboardPage />
                </RouteGuard>
              }
            />

            {/*
              Phase 10.6 — the direct academy-create form is GONE, and this
              path now redirects to Academy Provisioning.

              It was the second of two creation paths, and the one that did
              not allocate a subdomain: every academy created through it
              had no `subdomain_allocations` row, so its public website
              answered "not found". Production had five academies and two
              allocations.

              The path is kept as a redirect rather than deleted so an
              existing bookmark or a stale link lands on the wizard that
              replaced it instead of a 404. The backend no longer serves
              `POST /academies` at all, so this is a usability measure, not
              the enforcement — the enforcement is server-side.
            */}
            <Route
              path={DASHBOARD_ROUTES.academyCreate}
              element={
                <Navigate to={DASHBOARD_ROUTES.provisioningNew} replace />
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyOnboarding}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                  requiresEntitlement
                >
                  <AcademyOnboardingPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyProfile}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                  requiresEntitlement
                >
                  <AcademyProfilePage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academySettings}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.configure']}
                  requiresEntitlement
                >
                  <AcademySettingsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyBranding}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.branding.update']}
                  requiresEntitlement
                >
                  <AcademyBrandingPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyMembers}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.members.view']}
                  requiresEntitlement
                >
                  <AcademyMembersPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourses}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['course.view']}
                  requiresEntitlement
                >
                  <CourseListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseCreate}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['course.create']}
                  requiresEntitlement
                >
                  <CourseCreatePage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['course.update']}
                  requiresEntitlement
                >
                  <CourseEditPage />
                </RouteGuard>
              }
            />

            {/*
              P64 Phase 1 — the curriculum builder is reachable by an
              assigned COURSE INSTRUCTOR, not only by the academy's
              owner/manager.

              The backend moved first: the curriculum services now accept
              a course's instructors for the courses they are assigned to
              (`assertCanAuthorCourseContent` / `can_author_course_content()`
              in RLS), so an instructor editing their own course's
              sections is an authorized request. The frontend was the only
              thing still refusing it — this guard required
              `course.manage`, an organization-level string
              `ORGANIZATION_INSTRUCTOR_PERMISSIONS` deliberately does not
              carry (an instructor must never gain academy-wide course
              authoring), so the builder 403'd before a request was ever
              made.

              `requiredPermissions` is ALL-of and the guard takes no
              "any of these" form, so the minimal correct change is the
              one string all three authorized roles genuinely hold:
              `instructor.course.view` appears in
              `ORGANIZATION_OWNER_PERMISSIONS`,
              `ORGANIZATION_MANAGER_PERMISSIONS` and
              `ORGANIZATION_INSTRUCTOR_PERMISSIONS`
              (`atlas-backend/src/tenancy/constants/
              organization-permissions.constants.ts`) and in no other set —
              a plain organization member holds only `academy.view` and
              `academy.website.view` and still cannot reach this route.
              So the audience is unchanged for everyone who could already
              get here, and widened by exactly the role the backend just
              authorized.

              This is a DOOR, not the lock. Which courses an instructor may
              actually edit stays a per-course, server-side decision (this
              route is academy-scoped; the instructor of course A opening
              course B's builder is refused by the API and by RLS). Same
              precedent as `quiz.manage`/`assignment.manage`, which
              instructors hold for route visibility only.
            */}
            <Route
              path={DASHBOARD_ROUTES.academyCourseBuilder}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.course.view']}
                  requiresEntitlement
                >
                  <CourseBuilderPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseSettings}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['course.configure']}
                  requiresEntitlement
                >
                  <CourseSettingsPage />
                </RouteGuard>
              }
            />

            {/*
              P64 Phase 4 — course review moderation. Audience mirrors the
              builder: the course's assigned instructor plus the academy's
              owner/manager (`instructor.course.view` is the one permission
              all three hold and no plain member does — see the builder
              route's own note). Which course's reviews a caller may
              actually act on stays a per-course server decision
              (`assertCanReviewCourse` + `course_reviews_*` RLS).
            */}
            <Route
              path={DASHBOARD_ROUTES.academyCourseReviews}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.course.view']}
                  requiresEntitlement
                >
                  <CourseReviewsModerationPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseQuizzes}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['quiz.manage']}
                  requiresEntitlement
                >
                  <CourseQuizzesPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseQuizCreate}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['quiz.manage']}
                  requiresEntitlement
                >
                  <CourseQuizEditorPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseQuizEdit}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['quiz.manage']}
                  requiresEntitlement
                >
                  <CourseQuizEditorPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseAssignments}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['assignment.manage']}
                  requiresEntitlement
                >
                  <CourseAssignmentsPage />
                </RouteGuard>
              }
            />

            {/*
              P64 Phase 2 (D2 / AD-12) — the dashboard learner routes are
              GONE, not merely unmounted. `RETIRED_DASHBOARD_LEARNER_ROUTES`
              is a forwarding table, not a route group: each entry answers
              its old URL with the redirect page, which resolves the
              account's academy host and then sends the visitor to the
              matching `/my/*` page there (`resolveRetiredLearnerTarget`
              carries `:courseId` across). Cross-origin by nature, which is
              why this is a page and not a `<Navigate>`.

              They stay INSIDE the guarded dashboard subtree deliberately.
              The redirect page reads the account's own academy memberships,
              so it needs the authenticated session the subtree root already
              requires; and a pure `learner` principal never gets this far —
              that root sends them to `/academy-chooser`. What lands here is
              a staff member who is also enrolled somewhere, exactly the
              case D2 is about.
            */}
            {RETIRED_DASHBOARD_LEARNER_ROUTES.map(({ from }) => (
              <Route
                key={from}
                path={from}
                element={<LearnerSurfaceRedirectPage />}
              />
            ))}

            {/*
              P64 Phase 1 — REVIEW routes, not instructor-only routes.

              Everything from here to `instructorSubmissionReview` renders
              the per-course review surface: rosters, progress, quiz
              attempts, submissions and grading. The backend widened who
              may use it — `assertCanReviewCourse` admits the course's
              instructors AND the owning academy's Client Owner / Manager,
              and the endpoints were renamed `review/*` to say so (see
              `InstructorService`). The `/dashboard/instructor/...` paths
              are kept as they are: they are bookmarked, and a URL rename
              buys nothing the prefix rename did not.

              These guards need NO widening, which was checked rather than
              assumed: `instructor.dashboard.view`,
              `instructor.course.view`, `instructor.student.view`,
              `instructor.assessment.view`, `instructor.submission.view`
              and `instructor.assignment.grade` all appear in
              `ORGANIZATION_MANAGER_PERMISSIONS` — and therefore in
              `ORGANIZATION_OWNER_PERMISSIONS`, which is defined as a
              superset of it — as well as in
              `ORGANIZATION_INSTRUCTOR_PERMISSIONS`
              (`atlas-backend/src/tenancy/constants/
              organization-permissions.constants.ts`). An owner or manager
              has held them all along; what they lacked was any link into
              these pages, which the academy course screens now provide.
            */}
            <Route
              path={DASHBOARD_ROUTES.instructorDashboard}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.dashboard.view']}
                  requiresEntitlement
                >
                  <InstructorDashboardPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorCourses}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.course.view']}
                  requiresEntitlement
                >
                  <InstructorCoursesPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorCourseOverview}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.course.view']}
                  requiresEntitlement
                >
                  <InstructorCourseOverviewPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorStudents}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.student.view']}
                  requiresEntitlement
                >
                  <InstructorStudentsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorStudentProgress}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.student.view']}
                  requiresEntitlement
                >
                  <InstructorStudentProgressPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorAssessments}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.assessment.view']}
                  requiresEntitlement
                >
                  <InstructorAssessmentsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorQuizResults}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.assessment.view']}
                  requiresEntitlement
                >
                  <InstructorQuizResultsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorQuizAttempt}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.assessment.view']}
                  requiresEntitlement
                >
                  <InstructorQuizAttemptPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorSubmissions}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.submission.view']}
                  requiresEntitlement
                >
                  <InstructorSubmissionsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorSubmissionReview}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['instructor.submission.view']}
                  requiresEntitlement
                >
                  <InstructorSubmissionReviewPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorAnnouncements}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['announcement.manage']}
                  requiresEntitlement
                >
                  <InstructorAnnouncementsPage />
                </RouteGuard>
              }
            />

            {/*
              `announcement.view`, not `announcement.manage` — an
              instructor or member may legitimately READ their academy's
              announcements on this page. The page renders no authoring
              controls without `announcement.manage`, and the backend
              rejects the write regardless of what the UI showed, so
              guarding the whole route on `manage` would lock readers out
              of a page they are entitled to see.
            */}
            {/*
              `academy.view`, not a manage permission: a member may browse
              their academy's library. Upload/edit/archive controls are
              gated inside the page, and the backend refuses the writes
              regardless of what was rendered.
            */}
            <Route
              path={DASHBOARD_ROUTES.academyMedia}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                  requiresEntitlement
                >
                  <AcademyMediaPage />
                </RouteGuard>
              }
            />

            {/*
              P64 Phase 3 §E.6 — certificates, guarded like media: viewing
              needs academy access (an instructor reads the list for their
              courses); issue/revoke/regenerate and the template save are
              gated inside the pages on the manage permission, and the
              backend refuses them for anyone else regardless.
            */}
            <Route
              path={DASHBOARD_ROUTES.academyCertificates}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                  requiresEntitlement
                >
                  <AcademyCertificatesPage />
                </RouteGuard>
              }
            />
            <Route
              path={DASHBOARD_ROUTES.academyCertificateTemplate}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.view']}
                  requiresEntitlement
                >
                  <AcademyCertificateTemplatePage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyAnnouncements}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['announcement.view']}
                  requiresEntitlement
                >
                  <AcademyAnnouncementsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorDiscussions}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['forum.view']}
                  requiresEntitlement
                >
                  <CourseForumPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorThread}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['forum.view']}
                  requiresEntitlement
                >
                  <ForumThreadPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.announcements}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['announcement.view']}
                  requiresEntitlement
                >
                  <AnnouncementFeedPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.announcementDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['announcement.view']}
                  requiresEntitlement
                >
                  <AnnouncementDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.blog}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['blog.view']}
                  requiresEntitlement
                >
                  <BlogListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.blogCreate}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['blog.create']}
                  requiresEntitlement
                >
                  <BlogEditorPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.blogPost}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['blog.view']}
                  requiresEntitlement
                >
                  <BlogPostDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.blogEdit}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['blog.create']}
                  requiresEntitlement
                >
                  <BlogEditorPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenant}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.dashboard.view']}
                >
                  <TenantDashboardPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantSubscription}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.subscription.view']}
                >
                  <TenantSubscriptionPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantUsage}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.usage.view']}
                >
                  <TenantUsagePage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantAddOns}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.addon.view']}
                >
                  <TenantAddOnsPage />
                </RouteGuard>
              }
            />

            {/*
              P64 C6 — the destination of every hosted-video warning email.
              Guarded by `tenant.subscription.view`, the owner-exclusive
              marker the backend endpoint itself requires, so the route and
              the API agree about who may see it. The guard is UX only; the
              endpoint refuses a non-owner independently, with RLS beneath.
            */}
            <Route
              path={DASHBOARD_ROUTES.tenantRetention}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.subscription.view']}
                >
                  <TenantRetentionPage />
                </RouteGuard>
              }
            />

            <Route
              /*
                No sidebar entry (removed deliberately — per-plan trial
                settings live in the plan editor on Plans & Add-ons). The
                ROUTE stays because this page is still the only place that
                edits the two PLATFORM-WIDE trial settings a plan cannot
                express: the global on/off switch (`trial_policy.enabled`,
                read by `TrialRedemptionService.startTrial`) and the default
                duration a plan with no `trialDurationDays` of its own falls
                back to. Deleting the route would make both uneditable.
              */
              path={DASHBOARD_ROUTES.platformTrialPolicy}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformTrialPolicyPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformDomain}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformDomainSettingsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBilling}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.billing.view']}
                >
                  <BillingOverviewPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBillingCheckout}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.payment.create']}
                >
                  <CheckoutPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBillingPayments}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.payment.view']}
                >
                  <PaymentHistoryPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBillingPaymentDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.payment.view']}
                >
                  <PaymentDetailsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBillingInvoices}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['tenant.billing.view']}
                >
                  <InvoicesPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformPayments}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformPaymentReviewListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformPaymentDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformPaymentReviewDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformAtlasPaymentProvider}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <AtlasSubscriptionPaymentProviderPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformCoursePayments}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformCoursePaymentListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformCoursePaymentDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformCoursePaymentDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformPayouts}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformPayoutsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformCommission}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformCommissionPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.provisioning}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.provisioning.view']}
                  requiresEntitlement
                >
                  <ProvisioningHistoryPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.provisioningNew}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.provisioning.create']}
                  requiresEntitlement
                >
                  <ProvisioningStartPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.provisioningStatus}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.provisioning.view']}
                  requiresEntitlement
                >
                  <ProvisioningStatusPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformProvisioning}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformProvisioningListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformProvisioningDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformProvisioningDetailPage />
                </RouteGuard>
              }
            />

            {/* Phase 10.2 — platform-admin subscription/trial operations.
                The role gate here is a usability affordance; the real
                control is `PlatformOwnerGuard` on the API. */}
            <Route
              path={DASHBOARD_ROUTES.platformSubscriptions}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <AdminSubscriptionsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformOrganizations}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformOrganizationListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformOrganizationDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformOrganizationDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformAcademies}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformAcademyListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformAcademyDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformAcademyDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformCourses}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformCourseListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformCourseDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformCourseDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformUsers}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformUserListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformUserDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformUserDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformRolesPermissions}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformRolesPermissionsPage />
                </RouteGuard>
              }
            />

            {/*
              Zoom Operations Center. Each child is registered
              independently so a deep link and a refresh both resolve
              without passing through the overview first.
            */}
            <Route
              path={DASHBOARD_ROUTES.platformZoom}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <ZoomOverviewPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformZoomConnections}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <ZoomConnectionsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformZoomSessions}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <ZoomSessionsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformZoomAttendance}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <ZoomAttendancePage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformZoomRecordings}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <ZoomRecordingsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformZoomEvents}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <ZoomEventsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformZoomHealth}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <ZoomHealthPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformZoomActivity}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <ZoomActivityPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformZoomAcademyDetail}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <ZoomAcademyDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformAuditLog}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformAuditLogListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformAuditLogDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformAuditLogDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformSupport}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformSupportListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformSupportDetail}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformSupportDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformPlanCatalog}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformPlanCatalogPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformAddOns}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredRoles={['platform_owner']}
                >
                  <PlatformAddOnsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.websiteOverview}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.website.view']}
                  requiresEntitlement
                >
                  <WebsiteOverviewPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.websiteSettings}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.website.view']}
                  requiresEntitlement
                >
                  <WebsiteSettingsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.websiteContent}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.website.view']}
                  requiresEntitlement
                >
                  <WebsiteContentPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.websitePages}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.website.view']}
                  requiresEntitlement
                >
                  <WebsitePagesPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.websitePageEditor}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.website.view']}
                  requiresEntitlement
                >
                  <WebsitePageEditorPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.websitePreview}
              element={
                <RouteGuard
                  requireAuthentication
                  requiredPermissions={['academy.website.view']}
                  requiresEntitlement
                >
                  <WebsitePreviewPage />
                </RouteGuard>
              }
            />
          </Route>

          {/* System routes */}
          <Route element={<PublicLayout />}>
            <Route path={SYSTEM_ROUTES.forbidden} element={<ForbiddenPage />} />

            <Route path={SYSTEM_ROUTES.notFound} element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export { AUTHENTICATED_ENTRY_ROUTE };
