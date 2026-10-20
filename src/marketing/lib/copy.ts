/**
 * Turns the copy tree (`content/*.ts`) into page text: plural phrases,
 * catalog tokens ({trialDuration}, {price}, {students}…) and links. Pure, so
 * the same functions run at build time and in tests.
 */
import type { Plan } from '@/types/plan.types';
import type { MarketingContent, MkLink, MkPlural } from '../content/content.types';
import type { MarketingLang } from '../types';
import {
  catalogTrialDays,
  docsHref,
  fill,
  formatNumber,
  formatPrice,
  localePath,
  planName,
  registerHref,
  selfServePlans,
} from './site';

export type Tokens = Record<string, string | number>;

/** Copy hrefs that point at the help center: `help:/selling/payment-methods`. */
export const HELP_SCHEME = 'help:';

/** `{count}` phrase in the page language, using CLDR plural categories. */
export function plural(content: MarketingContent, forms: MkPlural, n: number): string {
  const category = new Intl.PluralRules(content.numberLocale).select(n) as keyof MkPlural;
  const template = forms[category] ?? forms.other;
  return fill(template, { count: formatNumber(content.lang, n) });
}

type CountedLimit = 'students' | 'academies' | 'instructors' | 'courses';

function limitPhrase(content: MarketingContent, plan: Plan, key: CountedLimit): string | undefined {
  const value = plan.limits[key];
  if (value === undefined) return undefined;
  return value === 'unlimited' ? content.unlimited[key] : plural(content, content.plurals[key], value);
}

function highest(plans: readonly Plan[], key: CountedLimit): number | 'unlimited' | undefined {
  let best: number | 'unlimited' | undefined;
  for (const plan of plans) {
    const value = plan.limits[key];
    if (value === 'unlimited') return 'unlimited';
    if (typeof value === 'number' && (best === undefined || value > (best as number))) best = value;
  }
  return best;
}

/** Tokens that depend on the whole catalog (page-level copy). */
export function catalogTokens(content: MarketingContent, plans: readonly Plan[]): Tokens {
  const list = selfServePlans(plans);
  const tokens: Tokens = { brand: content.brand.name };
  const days = catalogTrialDays(list);
  if (days !== undefined) {
    tokens.trialDays = formatNumber(content.lang, days);
    tokens.trialDuration = plural(content, content.plurals.days, days);
  }
  const maxStudents = highest(list, 'students');
  if (maxStudents !== undefined) {
    tokens.maxStudents =
      maxStudents === 'unlimited'
        ? content.unlimited.students
        : plural(content, content.plurals.students, maxStudents);
  }
  const maxAcademies = highest(list, 'academies');
  if (maxAcademies !== undefined) {
    tokens.maxAcademies =
      maxAcademies === 'unlimited'
        ? content.unlimited.academies
        : plural(content, content.plurals.academies, maxAcademies);
  }
  const top = list[list.length - 1];
  if (top) tokens.topPlanName = planName(top, content.lang);
  return tokens;
}

/** Tokens for copy about one plan (cards, CTAs). */
export function planTokens(content: MarketingContent, plan: Plan): Tokens {
  const lang = content.lang;
  const tokens: Tokens = { brand: content.brand.name, planName: planName(plan, lang) };
  const monthly = plan.pricing?.amount;
  const yearly = plan.pricing?.yearlyAmount;
  const currency = plan.pricing?.currency;
  if (currency && monthly !== undefined) tokens.price = formatPrice(lang, monthly, currency);
  if (currency && yearly !== undefined) {
    tokens.yearlyPrice = formatPrice(lang, yearly, currency);
    tokens.monthlyEquivalent = formatPrice(lang, Math.round(yearly / 12), currency);
    if (monthly !== undefined && monthly * 12 > yearly) {
      tokens.saving = formatPrice(lang, monthly * 12 - yearly, currency);
      const months = yearly / monthly;
      if (Number.isInteger(months)) tokens.paidMonthsCount = plural(content, content.plurals.months, months);
    }
  }
  for (const key of ['students', 'academies', 'instructors', 'courses'] as const) {
    const phrase = limitPhrase(content, plan, key);
    if (phrase) tokens[key] = phrase;
  }
  if (plan.trialEligible && plan.trialDurationDays) {
    tokens.trialDays = formatNumber(lang, plan.trialDurationDays);
    tokens.trialDuration = plural(content, content.plurals.days, plan.trialDurationDays);
  }
  if (plan.giftedDaysYearly) tokens.giftedDuration = plural(content, content.plurals.days, plan.giftedDaysYearly);
  return tokens;
}

/** True when every `{token}` in the text has a value (so the line can render). */
export function canFill(text: string, tokens: Tokens): boolean {
  return [...text.matchAll(/\{(\w+)\}/g)].every((match) => match[1] in tokens);
}

/**
 * A copy href made concrete for this page: `/ar` prefix on site pages,
 * `?plan=&lang=ar` on registration, app paths untouched, anchors kept;
 * `help:/path` is a help-center page in the same language.
 */
export function resolveHref(lang: MarketingLang, href: string, planKey?: string): string {
  if (href.startsWith(HELP_SCHEME)) return docsHref(lang, href.slice(HELP_SCHEME.length) || '/');
  if (href.startsWith('#') || /^[a-z]+:/i.test(href)) return href;
  const [pathAndQuery, hash] = href.split('#') as [string, string | undefined];
  const [path, query] = pathAndQuery.split('?') as [string, string | undefined];
  const suffix = hash ? `#${hash}` : '';
  if (path === '/auth/register' || path === '/auth/sign-up') {
    const params = new URLSearchParams(query);
    return `${registerHref(lang, params.get('plan') ?? planKey)}${suffix}`;
  }
  if (path.startsWith('/auth/') || path.startsWith('/dashboard')) {
    const params = new URLSearchParams(query);
    if (lang === 'ar' && path.startsWith('/auth/')) params.set('lang', 'ar');
    const qs = params.toString();
    return `${path}${qs ? `?${qs}` : ''}${suffix}`;
  }
  const params = new URLSearchParams(query);
  if (planKey && path === '/contact') params.set('plan', planKey);
  const qs = params.toString();
  return `${localePath(lang, path || '/')}${qs ? `?${qs}` : ''}${suffix}`;
}

/** Link with text tokens filled and href resolved. */
export function link(
  lang: MarketingLang,
  value: MkLink,
  tokens: Tokens = {},
  planKey?: string,
): { label: string; href: string; ariaLabel?: string } {
  return {
    label: fill(value.label, tokens),
    href: resolveHref(lang, value.href, planKey),
    ariaLabel: value.ariaLabel ? fill(value.ariaLabel, tokens) : undefined,
  };
}

/**
 * The copy tree with page-level tokens filled everywhere. Tokens it does not
 * know (plan-specific ones such as {price}) are left for later filling.
 */
export function fillTree<T>(value: T, tokens: Tokens): T {
  if (typeof value === 'string') return fill(value, tokens) as T;
  if (Array.isArray(value)) return value.map((item) => fillTree(item, tokens)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        // hrefs are paths, never copy.
        key === 'href' ? item : fillTree(item, tokens),
      ]),
    ) as T;
  }
  return value;
}

/** Splits a template around one token: '{price} / month' → ['', ' / month']. */
export function splitAt(template: string, token: string): [string, string] | undefined {
  const marker = `{${token}}`;
  const index = template.indexOf(marker);
  if (index < 0) return undefined;
  return [template.slice(0, index), template.slice(index + marker.length)];
}

/** `fill` re-exported so pages import text helpers from one place. */
export { fill };
