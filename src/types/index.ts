/**
 * Atlas shared types — public entry point.
 *
 * Feature-specific domain types live inside the feature that owns them.
 */
export * from './common.types';
export * from './api.types';
export * from './localization.types';
export * from './theme.types';
export * from './navigation.types';
export * from './identity.types';
export * from './platform.types';
export * from './profile.types';
export * from './notifications.types';
export * from './analytics.types';
export * from './search.types';
export * from './academy.types';
export * from './academy-roster.types';
export * from './course.types';
export * from './enrollment.types';
export * from './progress.types';
export * from './quiz.types';
export * from './assignment.types';
export * from './completion.types';
export * from './certificate.types';
export * from './instructor.types';
export * from './announcement.types';
export * from './blog.types';
export * from './forum.types';
export * from './plan.types';
// Phase 12 — Live Sessions add-on.
export * from './liveSession.types';
export * from './tenant.types';
export * from './money.types';
export * from './checkout.types';
export * from './payment.types';
export * from './atlas-subscription-payment-provider.types';
export * from './provisioning.types';
// New Customer Onboarding — sign-up options and the setup status.
export * from './onboarding.types';
export * from './website-theme.types';
export * from './website-section.types';
export * from './website.types';
export * from './website-content.types';
export * from './website-seo.types';
// Website Contact form submissions — the dashboard's website "Messages".
export * from './contact-submission.types';
export * from './public-website-locale.types';
export * from './domain.types';
export * from './public-website.types';
export * from './platform-organization.types';
export * from './platform-academy.types';
export * from './platform-course.types';
export * from './platform-user.types';
export * from './deletion.types';
export * from './rbac.types';
export * from './platform-metrics.types';
// P64 Phase 4 §E.5 — platform video minutes / provider health.
export * from './platform-video-metrics.types';
export * from './platform-commerce-metrics.types';
export * from './platform-delivery-metrics.types';
export * from './audit-log.types';
export * from './support.types';
export * from './platform-settings.types';
export * from './communication-settings.types';
export * from './academy-protection.types';
export * from './media.types';
export * from './dashboard.types';
export * from './student-results.types';
export * from './student-analytics.types';
// P64 Phase 4 §E.5 — the owner's integrity and sharing reports.
export * from './academy-reports.types';
// P64 Phase 2 — the learner dashboard and unified player wire contracts.
// Each file mirrors one backend contract file 1:1; see their own doc
// comments for why they are transcribed rather than widened.
export * from './learner-overview.types';
export * from './course-sequence.types';
export * from './lesson-content.types';
export * from './course-order.types';
export * from './academy-payment.types';
// P13 — learner self-service refunds and the owner's academy payouts.
export * from './course-order-refund.types';
export * from './academy-payout.types';
export * from './academy-course-order.types';
// Platform Owner commerce management — payouts and the commission hierarchy.
export * from './platform-commerce.types';
// P64 Phase 4 — course reviews and rating aggregate.
export * from './review.types';
// P64 Communications C7 — the platform email pipeline console.
export * from './platform-communications.types';
// Platform Owner Observability Center — transcribed verbatim from the backend contract.
export * from './observability.types';
