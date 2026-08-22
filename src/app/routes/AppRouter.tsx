import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { ErrorBoundary } from '@app/providers/error/ErrorBoundary';
import { PublicLayout } from '@app/layouts/public/PublicLayout';
import { AuthLayout } from '@app/layouts/auth/AuthLayout';
import { DashboardLayout } from '@app/layouts/dashboard/DashboardLayout';

import {
  AUTH_ROUTES,
  PUBLIC_ROUTES,
  SYSTEM_ROUTES,
  DASHBOARD_ROUTES,
  AUTHENTICATED_ENTRY_ROUTE,
} from './route-paths';

import { RouteGuard } from './guards';
import { RouteFallback } from './RouteFallback';

// Lazily loaded so each route ships as its own chunk.
const HomePage = lazy(() => import('@features/home/pages/HomePage'));

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

const DashboardOverviewPage = lazy(
  () => import('@features/dashboard/pages/DashboardOverviewPage')
);

const ProfilePage = lazy(() => import('@features/profile/pages/ProfilePage'));
const PlatformDashboardPage = lazy(
  () => import('@features/platform/pages/PlatformDashboardPage')
);
const SettingsPage = lazy(
  () => import('@features/settings/pages/SettingsPage')
);
const NotificationsPage = lazy(
  () => import('@features/notifications/pages/NotificationsPage')
);
const BillingPage = lazy(() => import('@features/billing/pages/BillingPage'));
const AnalyticsPage = lazy(
  () => import('@features/analytics/pages/AnalyticsPage')
);
const SearchPage = lazy(() => import('@features/search/pages/SearchPage'));

const AcademyDashboardPage = lazy(
  () => import('@features/academy/pages/AcademyDashboardPage')
);
const AcademyCreatePage = lazy(
  () => import('@features/academy/pages/AcademyCreatePage')
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

const StudentCourseDiscoveryPage = lazy(
  () => import('@features/learning/pages/StudentCourseDiscoveryPage')
);
const StudentCourseDetailsPage = lazy(
  () => import('@features/learning/pages/StudentCourseDetailsPage')
);
const CourseLearnRedirectPage = lazy(
  () => import('@features/learning/pages/CourseLearnRedirectPage')
);
const LessonPage = lazy(() => import('@features/learning/pages/LessonPage'));
const QuizPage = lazy(() => import('@features/learning/pages/QuizPage'));
const AssignmentPage = lazy(
  () => import('@features/learning/pages/AssignmentPage')
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
const TenantUsagePage = lazy(
  () => import('@features/tenant/pages/TenantUsagePage')
);
const TenantAddOnsPage = lazy(
  () => import('@features/tenant/pages/TenantAddOnsPage')
);
const PlatformTrialPolicyPage = lazy(
  () => import('@features/tenant/pages/PlatformTrialPolicyPage')
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

const ForbiddenPage = lazy(
  () => import('@features/system/pages/ForbiddenPage')
);
const NotFoundPage = lazy(() => import('@features/system/pages/NotFoundPage'));

export function AppRouter(): JSX.Element {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path={PUBLIC_ROUTES.home} element={<HomePage />} />
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
          </Route>

          {/* Authenticated product surface */}
          <Route
            path={DASHBOARD_ROUTES.root}
            element={
              <RouteGuard
                requireAuthentication
                pendingFallback={<RouteFallback />}
              >
                <DashboardLayout />
              </RouteGuard>
            }
          >
            <Route index element={<DashboardOverviewPage />} />

            <Route path={DASHBOARD_ROUTES.profile} element={<ProfilePage />} />

            <Route
              path={DASHBOARD_ROUTES.platform}
              element={<PlatformDashboardPage />}
            />

            <Route
              path={DASHBOARD_ROUTES.settings}
              element={<SettingsPage />}
            />

            <Route
              path={DASHBOARD_ROUTES.notifications}
              element={<NotificationsPage />}
            />

            <Route path={DASHBOARD_ROUTES.billing} element={<BillingPage />} />

            <Route
              path={DASHBOARD_ROUTES.analytics}
              element={<AnalyticsPage />}
            />

            <Route path={DASHBOARD_ROUTES.search} element={<SearchPage />} />

            <Route
              path={DASHBOARD_ROUTES.academy}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['academy.view']}>
                  <AcademyDashboardPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCreate}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['academy.view']}>
                  <AcademyCreatePage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyOnboarding}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['academy.view']}>
                  <AcademyOnboardingPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyProfile}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['academy.view']}>
                  <AcademyProfilePage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academySettings}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['academy.configure']}>
                  <AcademySettingsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyBranding}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['academy.branding.update']}>
                  <AcademyBrandingPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyMembers}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['academy.members.view']}>
                  <AcademyMembersPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourses}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['course.view']}>
                  <CourseListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseCreate}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['course.create']}>
                  <CourseCreatePage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseDetail}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['course.update']}>
                  <CourseEditPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseBuilder}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['course.manage']}>
                  <CourseBuilderPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.academyCourseSettings}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['course.configure']}>
                  <CourseSettingsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.learning}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['student.learning.view']}>
                  <Navigate to={DASHBOARD_ROUTES.learningCourses} replace />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.learningCourses}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['student.course.view']}>
                  <StudentCourseDiscoveryPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.learningCourseDetail}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['student.course.view']}>
                  <StudentCourseDetailsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.learningCourseLearn}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['student.learning.view']}>
                  <CourseLearnRedirectPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.learningLesson}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['student.learning.view']}>
                  <LessonPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.learningQuiz}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['student.quiz.view']}>
                  <QuizPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.learningAssignment}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['student.assignment.view']}>
                  <AssignmentPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.learningDiscussions}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['forum.view']}>
                  <CourseForumPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.learningThread}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['forum.view']}>
                  <ForumThreadPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorDashboard}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['instructor.dashboard.view']}>
                  <InstructorDashboardPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorCourses}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['instructor.course.view']}>
                  <InstructorCoursesPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorCourseOverview}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['instructor.course.view']}>
                  <InstructorCourseOverviewPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorStudents}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['instructor.student.view']}>
                  <InstructorStudentsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorStudentProgress}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['instructor.student.view']}>
                  <InstructorStudentProgressPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorAssessments}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['instructor.assessment.view']}>
                  <InstructorAssessmentsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorQuizResults}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['instructor.assessment.view']}>
                  <InstructorQuizResultsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorSubmissions}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['instructor.submission.view']}>
                  <InstructorSubmissionsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorSubmissionReview}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['instructor.submission.view']}>
                  <InstructorSubmissionReviewPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorAnnouncements}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['announcement.manage']}>
                  <InstructorAnnouncementsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorDiscussions}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['forum.view']}>
                  <CourseForumPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.instructorThread}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['forum.view']}>
                  <ForumThreadPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.announcements}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['announcement.view']}>
                  <AnnouncementFeedPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.announcementDetail}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['announcement.view']}>
                  <AnnouncementDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.blog}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['blog.view']}>
                  <BlogListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.blogCreate}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['blog.create']}>
                  <BlogEditorPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.blogPost}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['blog.view']}>
                  <BlogPostDetailPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.blogEdit}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['blog.create']}>
                  <BlogEditorPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenant}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['tenant.dashboard.view']}>
                  <TenantDashboardPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantSubscription}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['tenant.subscription.view']}>
                  <TenantSubscriptionPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantUsage}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['tenant.usage.view']}>
                  <TenantUsagePage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantAddOns}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['tenant.addon.view']}>
                  <TenantAddOnsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformTrialPolicy}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <PlatformTrialPolicyPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBilling}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['tenant.billing.view']}>
                  <BillingOverviewPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBillingCheckout}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['tenant.payment.create']}>
                  <CheckoutPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBillingPayments}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['tenant.payment.view']}>
                  <PaymentHistoryPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBillingPaymentDetail}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['tenant.payment.view']}>
                  <PaymentDetailsPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.tenantBillingInvoices}
              element={
                <RouteGuard requireAuthentication requiredPermissions={['tenant.billing.view']}>
                  <InvoicesPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformPayments}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <PlatformPaymentReviewListPage />
                </RouteGuard>
              }
            />

            <Route
              path={DASHBOARD_ROUTES.platformPaymentDetail}
              element={
                <RouteGuard requireAuthentication requiredRoles={['platform_owner']}>
                  <PlatformPaymentReviewDetailPage />
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
