/**
 * Arabic translations for everything else (dashboard, auth, learner, …).

Loaded right after an Academy website's first paint, and before any of its
lazily loaded routes renders (see `language-resources.ts`).
 */
import arLiveSessions from './ar/liveSessions.json';
import arPlatformZoom from './ar/platformZoom.json';
import arPlatformAddOns from './ar/platformAddOns.json';
import arPlatformCommerce from './ar/platformCommerce.json';
import arPlatformObservability from './ar/platformObservability.json';
import arPlatformEmail from './ar/platformEmail.json';
import arMessaging from './ar/messaging.json';
import arLayout from './ar/layout.json';
import arHome from './ar/home.json';
import arDashboard from './ar/dashboard.json';
import arAuth from './ar/auth.json';
import arProfile from './ar/profile.json';
import arSettings from './ar/settings.json';
import arNotifications from './ar/notifications.json';
import arBilling from './ar/billing.json';
import arAnalytics from './ar/analytics.json';
import arPlatform from './ar/platform.json';
import arSearch from './ar/search.json';
import arAcademy from './ar/academy.json';
import arInstructor from './ar/instructor.json';
import arAnnouncements from './ar/announcements.json';
import arBlog from './ar/blog.json';
import arForum from './ar/forum.json';
import arOrganization from './ar/organization.json';
import arTenant from './ar/tenant.json';
import arPayments from './ar/payments.json';
import arProvisioning from './ar/provisioning.json';
import arAuditLog from './ar/auditLog.json';
import arSupport from './ar/support.json';
import arMedia from './ar/media.json';
import arFeatures from './ar/features.json';
import arPricing from './ar/pricing.json';
import arCertificates from './ar/certificates.json';
import arOnboarding from './ar/onboarding.json';

const bundle: Record<string, Record<string, unknown>> = {
  liveSessions: arLiveSessions,
  platformZoom: arPlatformZoom,
  platformAddOns: arPlatformAddOns,
  platformCommerce: arPlatformCommerce,
  platformObservability: arPlatformObservability,
  platformEmail: arPlatformEmail,
  messaging: arMessaging,
  layout: arLayout,
  home: arHome,
  dashboard: arDashboard,
  auth: arAuth,
  profile: arProfile,
  settings: arSettings,
  notifications: arNotifications,
  billing: arBilling,
  analytics: arAnalytics,
  platform: arPlatform,
  search: arSearch,
  academy: arAcademy,
  instructor: arInstructor,
  announcements: arAnnouncements,
  blog: arBlog,
  forum: arForum,
  organization: arOrganization,
  tenant: arTenant,
  payments: arPayments,
  provisioning: arProvisioning,
  auditLog: arAuditLog,
  support: arSupport,
  media: arMedia,
  features: arFeatures,
  pricing: arPricing,
  certificates: arCertificates,
  onboarding: arOnboarding,
};

export default bundle;
