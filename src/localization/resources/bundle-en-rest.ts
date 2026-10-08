/**
 * English translations for everything else (dashboard, auth, learner, …).

Loaded right after an Academy website's first paint, and before any of its
lazily loaded routes renders (see `language-resources.ts`).
 */
import enLiveSessions from './en/liveSessions.json';
import enPlatformZoom from './en/platformZoom.json';
import enPlatformAddOns from './en/platformAddOns.json';
import enPlatformCommerce from './en/platformCommerce.json';
import enPlatformObservability from './en/platformObservability.json';
import enPlatformEmail from './en/platformEmail.json';
import enMessaging from './en/messaging.json';
import enLayout from './en/layout.json';
import enHome from './en/home.json';
import enDashboard from './en/dashboard.json';
import enAuth from './en/auth.json';
import enProfile from './en/profile.json';
import enSettings from './en/settings.json';
import enNotifications from './en/notifications.json';
import enBilling from './en/billing.json';
import enAnalytics from './en/analytics.json';
import enPlatform from './en/platform.json';
import enSearch from './en/search.json';
import enAcademy from './en/academy.json';
import enInstructor from './en/instructor.json';
import enAnnouncements from './en/announcements.json';
import enBlog from './en/blog.json';
import enForum from './en/forum.json';
import enOrganization from './en/organization.json';
import enTenant from './en/tenant.json';
import enPayments from './en/payments.json';
import enProvisioning from './en/provisioning.json';
import enAuditLog from './en/auditLog.json';
import enSupport from './en/support.json';
import enMedia from './en/media.json';
import enFeatures from './en/features.json';
import enPricing from './en/pricing.json';
import enCertificates from './en/certificates.json';
import enOnboarding from './en/onboarding.json';
import enCustomerRequests from './en/customerRequests.json';

const bundle: Record<string, Record<string, unknown>> = {
  liveSessions: enLiveSessions,
  platformZoom: enPlatformZoom,
  platformAddOns: enPlatformAddOns,
  platformCommerce: enPlatformCommerce,
  platformObservability: enPlatformObservability,
  platformEmail: enPlatformEmail,
  messaging: enMessaging,
  layout: enLayout,
  home: enHome,
  dashboard: enDashboard,
  auth: enAuth,
  profile: enProfile,
  settings: enSettings,
  notifications: enNotifications,
  billing: enBilling,
  analytics: enAnalytics,
  platform: enPlatform,
  search: enSearch,
  academy: enAcademy,
  instructor: enInstructor,
  announcements: enAnnouncements,
  blog: enBlog,
  forum: enForum,
  organization: enOrganization,
  tenant: enTenant,
  payments: enPayments,
  provisioning: enProvisioning,
  auditLog: enAuditLog,
  support: enSupport,
  media: enMedia,
  features: enFeatures,
  pricing: enPricing,
  certificates: enCertificates,
  onboarding: enOnboarding,
  customerRequests: enCustomerRequests,
};

export default bundle;
