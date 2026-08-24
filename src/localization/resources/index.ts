/**
 * Translation resource bundles.
 *
 * Bundles are imported statically so the active language is available on the
 * first paint, avoiding a flash of untranslated keys. Namespaces keep bundles
 * small and let future modules register their own files without touching this
 * registry's structure.
 */
import type { LanguageCode, TranslationNamespace } from '@types';

import enCommon from './en/common.json';
import enNavigation from './en/navigation.json';
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
import enPayments from './en/payments.json';
import enProvisioning from './en/provisioning.json';
import enWebsite from './en/website.json';
import enAuditLog from './en/auditLog.json';
import enSupport from './en/support.json';
import enMedia from './en/media.json';

import arCommon from './ar/common.json';
import arNavigation from './ar/navigation.json';
import arValidation from './ar/validation.json';
import arErrors from './ar/errors.json';
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
import arCourse from './ar/course.json';
import arLearning from './ar/learning.json';
import arInstructor from './ar/instructor.json';
import arAnnouncements from './ar/announcements.json';
import arBlog from './ar/blog.json';
import arForum from './ar/forum.json';
import arOrganization from './ar/organization.json';
import arTenant from './ar/tenant.json';
import arPayments from './ar/payments.json';
import arProvisioning from './ar/provisioning.json';
import arWebsite from './ar/website.json';
import arAuditLog from './ar/auditLog.json';
import arSupport from './ar/support.json';
import arMedia from './ar/media.json';

/** One language's resources, keyed by namespace. */
type NamespaceBundle = Record<TranslationNamespace, Record<string, unknown>>;

export const TRANSLATION_RESOURCES: Readonly<
  Record<LanguageCode, NamespaceBundle>
> = Object.freeze({
  en: {
    common: enCommon,
    navigation: enNavigation,
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
    payments: enPayments,
    provisioning: enProvisioning,
    website: enWebsite,
    auditLog: enAuditLog,
    support: enSupport,
    media: enMedia,
  },
  ar: {
    common: arCommon,
    navigation: arNavigation,
    validation: arValidation,
    errors: arErrors,
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
    course: arCourse,
    learning: arLearning,
    instructor: arInstructor,
    announcements: arAnnouncements,
    blog: arBlog,
    forum: arForum,
    organization: arOrganization,
    tenant: arTenant,
    payments: arPayments,
    provisioning: arProvisioning,
    website: arWebsite,
    auditLog: arAuditLog,
    support: arSupport,
    media: arMedia,
  },
});