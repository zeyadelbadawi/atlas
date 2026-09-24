/**
 * Learner dashboard pages — public entry point.
 *
 * Every page is a default export as well, so `LearnerRouter` can `lazy()`
 * each one into its own chunk exactly as the rest of Atlas routes do.
 */
export { default as LearnerOverviewPage } from './LearnerOverviewPage';
export { default as LearnerCoursesPage } from './LearnerCoursesPage';
export { default as LearnerCourseProgressPage } from './LearnerCourseProgressPage';
export { default as LearnerAssessmentsPage } from './LearnerAssessmentsPage';
export { default as LearnerCertificatesPage } from './LearnerCertificatesPage';
export { default as LearnerPurchasesPage } from './LearnerPurchasesPage';
export { default as LearnerDevicesPage } from './LearnerDevicesPage';
export { default as LearnerNotificationsPage } from './LearnerNotificationsPage';
export { default as LearnerProfilePage } from './LearnerProfilePage';
export { default as LearnerSecurityPage } from './LearnerSecurityPage';
/*
 * The unified player (§E.2). A page like the others, and lazy like the
 * others, but NOT a dashboard section: it is mounted outside
 * `LearnerShell` because it brings its own curriculum rail and action
 * bar — see `LearnerRouter` for why stacking the dashboard's furniture
 * around it would put two rails on one screen.
 */
export { default as LearnerPlayerPage } from './LearnerPlayerPage';
