/**
 * English translation bundle — every namespace for one language.
 *
 * Its own module so the build emits it as its own chunk: a visitor
 * downloads only the language they read (see `language-resources.ts`).
 */

import enCommon from './en/common.json';
import enNavigation from './en/navigation.json';
import enLiveSessions from './en/liveSessions.json';
import enPlatformZoom from './en/platformZoom.json';
import enPlatformAddOns from './en/platformAddOns.json';
import enPlatformCommerce from './en/platformCommerce.json';
import enPlatformObservability from './en/platformObservability.json';
import enValidation from './en/validation.json';
import enErrors from './en/errors.json';
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
import enCourse from './en/course.json';
import enLearning from './en/learning.json';
import enInstructor from './en/instructor.json';
import enAnnouncements from './en/announcements.json';
import enBlog from './en/blog.json';
import enForum from './en/forum.json';
import enOrganization from './en/organization.json';
import enTenant from './en/tenant.json';
import enLegal from './en/legal.json';
import enPayments from './en/payments.json';
import enProvisioning from './en/provisioning.json';
import enWebsite from './en/website.json';
import enAuditLog from './en/auditLog.json';
import enSupport from './en/support.json';
import enMedia from './en/media.json';
import enPublicWebsite from './en/publicWebsite.json';
import enFeatures from './en/features.json';
import enPricing from './en/pricing.json';
import enCertificates from './en/certificates.json';
import enOnboarding from './en/onboarding.json';

const bundle: Record<string, Record<string, unknown>> = {
  common: enCommon,
  navigation: enNavigation,
  liveSessions: enLiveSessions,
  platformZoom: enPlatformZoom,
  platformAddOns: enPlatformAddOns,
  platformCommerce: enPlatformCommerce,
  platformObservability: enPlatformObservability,
  validation: enValidation,
  errors: enErrors,
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
  course: enCourse,
  learning: enLearning,
  instructor: enInstructor,
  announcements: enAnnouncements,
  blog: enBlog,
  forum: enForum,
  organization: enOrganization,
  tenant: enTenant,
  legal: enLegal,
  payments: enPayments,
  provisioning: enProvisioning,
  website: enWebsite,
  auditLog: enAuditLog,
  support: enSupport,
  media: enMedia,
  publicWebsite: enPublicWebsite,
  features: enFeatures,
  pricing: enPricing,
  certificates: enCertificates,
  onboarding: enOnboarding,
};

export default bundle;
