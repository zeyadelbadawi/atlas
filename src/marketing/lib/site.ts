/**
 * Links, locale formatting and catalog helpers for the marketing site.
 * Everything here is pure, so pages render the same at build time and in tests.
 */
import type { LimitValue, Plan } from '@/types/plan.types';
import type { MarketingLang } from '../types';

/**
 * Where the app lives (DL-63): its own host, `dashboard.<site host>`, so
 * links into it (sign in, start a trial, the dashboard) are absolute.
 * VITE_APP_URL overrides it; a build with no VITE_SITE_URL (local
 * development, tests without one) keeps them relative, on the same origin.
 */
export const APP_ORIGIN = appOrigin(import.meta.env.VITE_APP_URL, import.meta.env.VITE_SITE_URL);

export function appOrigin(appUrl?: string, siteUrl?: string): string {
  if (appUrl) return appUrl.replace(/\/+$/, '');
  if (!siteUrl) return '';
  return `https://dashboard.${new URL(siteUrl).host}`;
}

/** An app path (`/auth/...`, `/dashboard...`) as a link from the marketing site. */
export function appHref(pathWithQuery: string): string {
  return `${APP_ORIGIN}${pathWithQuery}`;
}

/**
 * The help center (DL-57) lives on its own host, `docs.<site host>`; links to
 * it are absolute. VITE_DOCS_URL overrides it, like in scripts/docs/prerender.mjs.
 */
export const DOCS_ORIGIN = docsOrigin(import.meta.env.VITE_DOCS_URL, import.meta.env.VITE_SITE_URL);

export function docsOrigin(docsUrl?: string, siteUrl?: string): string {
  if (docsUrl) return docsUrl.replace(/\/+$/, '');
  return `https://docs.${new URL(siteUrl || 'https://atlass.dpdns.org').host}`;
}

/** A help-center page in a language: `/selling/payment-methods` ↔ `/ar/selling/payment-methods`. */
export function docsHref(lang: MarketingLang, path: string): string {
  return `${DOCS_ORIGIN}${localePath(lang, path)}`;
}

export const LOCALE: Record<MarketingLang, string> = { en: 'en-US', ar: 'ar-EG' };

/** Path of a page in a language: `/pricing` ↔ `/ar/pricing`, `/` ↔ `/ar`. */
export function localePath(lang: MarketingLang, path: string): string {
  const clean = path === '/' ? '' : path;
  return lang === 'ar' ? `/ar${clean}` : clean || '/';
}

/** Registration link carrying the plan in context and the page language. */
export function registerHref(lang: MarketingLang, planKey?: string): string {
  const query = new URLSearchParams();
  if (planKey) query.set('plan', planKey);
  if (lang === 'ar') query.set('lang', 'ar');
  const qs = query.toString();
  return `${APP_ORIGIN}/auth/register${qs ? `?${qs}` : ''}`;
}

export function signInHref(lang: MarketingLang): string {
  return `${APP_ORIGIN}/auth/sign-in${lang === 'ar' ? '?lang=ar' : ''}`;
}

export function contactHref(lang: MarketingLang, topic = 'sales', planKey?: string): string {
  const query = new URLSearchParams({ topic });
  if (planKey) query.set('plan', planKey);
  return `${localePath(lang, '/contact')}?${query.toString()}`;
}

export function formatNumber(lang: MarketingLang, value: number): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(value);
}

/** "EGP 1,190" / "١٬١٩٠ ج.م." — currency from the catalog, never assumed. */
export function formatPrice(lang: MarketingLang, amount: number, currency: string): string {
  return new Intl.NumberFormat(LOCALE[lang], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatLimit(
  lang: MarketingLang,
  value: LimitValue | undefined,
  unlimited: string,
): string | undefined {
  if (value === undefined) return undefined;
  return value === 'unlimited' ? unlimited : formatNumber(lang, value);
}

export function formatDate(lang: MarketingLang, isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(isoDate),
  );
}

/** Replaces `{token}` placeholders in a copy string. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Self-serve plans in catalog order (the API already filters and sorts). */
export function selfServePlans(plans: readonly Plan[]): readonly Plan[] {
  return [...plans].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function planName(plan: Plan, lang: MarketingLang): string {
  return plan.nameLocalized?.[lang] || plan.name;
}

export function planDescription(plan: Plan, lang: MarketingLang): string | undefined {
  return plan.descriptionLocalized?.[lang] || plan.description;
}

/** Trial length shared by the catalog, or undefined when plans disagree or none has one. */
export function catalogTrialDays(plans: readonly Plan[]): number | undefined {
  const days = new Set(
    plans.filter((p) => p.trialEligible && p.trialDurationDays).map((p) => p.trialDurationDays),
  );
  return days.size === 1 ? [...days][0] : undefined;
}

/** "14 يومًا" with correct Arabic number agreement; "14 days" in English. */
export function trialDaysPhrase(lang: MarketingLang, days: number): string {
  if (lang === 'en') return `${days}-day`;
  const n = formatNumber('ar', days);
  if (days === 1) return 'يوم واحد';
  if (days === 2) return 'يومين';
  if (days >= 3 && days <= 10) return `${n} أيام`;
  return `${n} يومًا`;
}
