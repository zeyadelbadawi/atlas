/**
 * Rules that span the whole help center (content/docs/README.md). The build
 * runs `validateDocs` and fails on any error; `docs.test.ts` runs it too.
 *
 *   - ids, slugs and categories are known (src/docs/inventory.json, categories.ts)
 *   - every article exists in English and Arabic, at the same path
 *   - related ids exist; links, tokens and screenshots resolve (render problems)
 *   - every numbered step of a how-to has a screenshot
 *   - every screenshot key is specified in content/docs/shots/<category>.yaml
 *   - claims rules: banned wording (SPEC §A.10 as it applies to help text)
 *   - Arabic articles are written in Arabic
 */
import { parse as parseYaml } from 'yaml';
import { categoryById } from '../categories';
import INVENTORY from '../inventory.json';
import { DOC_LANGS, type DocArticle, type DocLang } from '../types';
import { HOME_CATEGORY, INDEX_SLUG } from './parse';

export interface InventoryEntry {
  readonly id: string;
  readonly category: string;
  readonly slug: string;
  readonly type: string;
  readonly priority: string;
  readonly titleEn: string;
}

export const DOC_INVENTORY = INVENTORY as readonly InventoryEntry[];

/**
 * Help-text version of SPEC §A.10. "Free" is allowed for what the app itself
 * labels free (a course with no price, a free preview); claims about Atlas's
 * own offer are not.
 */
export const DOC_BANNED: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /\bfree (trial|plan|tier|account|forever|of charge)\b|\bfor free\b|\bat no cost\b/i, why: 'no "free" claims about Atlas' },
  { pattern: /(فترة|الفترة) (التجريبية|تجريبية) (ال)?مجاني|خطة مجاني|ببلاش|بدون أي تكلفة/, why: 'no "free" claims about Atlas' },
  { pattern: /\bUSD\b|\$\s?\d/, why: 'no USD prices' },
  { pattern: /\bpremium\b|بريميوم/i, why: 'no Premium plans (DL-38)' },
  { pattern: /prevents recording|blocks screen recording|cannot be recorded|leak-?proof|impossible to (leak|copy)|يمنع (تسجيل|تصوير) الشاشة|مستحيل (تسريب|نسخ)/i, why: 'protection claim beyond what is verified (DL-50)' },
  { pattern: /hidden watermark|invisible watermark|علامة مائية (مخفية|غير مرئية)/i, why: 'the watermark is visible; never call it hidden' },
  { pattern: /\bDRM\b/, why: 'Atlas has no DRM' },
  { pattern: /in minutes|في دقائق/i, why: 'no speed promises' },
  { pattern: /arabic-first|عربي بالكامل/i, why: 'banned positioning' },
  { pattern: /\b100 ?%|١٠٠ ?٪/, why: 'no absolute claims' },
  { pattern: /sign in with google|الدخول بجوجل|التسجيل بجوجل/i, why: 'Google sign-in is not released (claim gate)' },
  { pattern: /operating system for education|منصة تعليمية متكاملة/i, why: 'retired tagline' },
  { pattern: /\bRLS\b|row[- ]level security|tenant isolation/i, why: 'say "each academy’s data is kept separate", not the mechanism' },
  { pattern: /hosted video|upload (a |your )?video|رفع (ال)?فيديو|فيديو مستضاف/i, why: 'hosted video is switched off (DL-33)' },
  { pattern: /text lesson|درس نصي/i, why: 'text lessons are deferred (CF-01)' },
  { pattern: /live class|حصص? (أونلاين|مباشرة)|\bzoom (meeting|class|integration|account)|زووم/i, why: 'live classes are deferred (CF-15)' },
  { pattern: /atlas payments|add-ons?\b|إضافات مدفوعة/i, why: 'not available yet' },
  { pattern: /testimonial|شهادات العملاء|آراء العملاء/i, why: 'no testimonials (XA-07)' },
];

/** Banned patterns that may appear in specific articles (by id) because they explain the limitation itself. */
const BANNED_EXCEPTIONS: Readonly<Record<string, readonly RegExp[]>> = {
  'DOC-MED-001': [/\bDRM\b/],
  'DOC-FAQ-003': [/\bDRM\b/],
  'DOC-WEB-010': [/testimonial|شهادات العملاء|آراء العملاء/i],
};

const HOW_TO_TYPES = new Set(['step-by-step', 'setup-config', 'workflow']);

export interface DocsValidation {
  readonly errors: readonly string[];
  /** Inventory pages with no article yet (an error only when `requireComplete`). */
  readonly missing: readonly string[];
}

export interface RenderReport {
  readonly article: DocArticle;
  readonly problems: readonly string[];
  readonly shotKeys: readonly string[];
  /** Visible text of the rendered article (title, summary and body), for the wording rules. */
  readonly text: string;
  /** Numbered steps without a screenshot (1-based), for how-to articles. */
  readonly stepsWithoutShot: readonly number[];
}

export function specifiedShotKeys(specFiles: Record<string, string>): { keys: Set<string>; errors: string[] } {
  const keys = new Set<string>();
  const errors: string[] = [];
  for (const [path, raw] of Object.entries(specFiles)) {
    let list: unknown;
    try {
      list = parseYaml(raw);
    } catch (error) {
      errors.push(`${path}: invalid YAML (${(error as Error).message})`);
      continue;
    }
    if (list == null) continue;
    if (!Array.isArray(list)) {
      errors.push(`${path}: must be a list of shots`);
      continue;
    }
    for (const entry of list as { key?: unknown }[]) {
      if (typeof entry?.key !== 'string' || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(entry.key)) {
        errors.push(`${path}: shot without a valid key (${JSON.stringify(entry?.key)})`);
        continue;
      }
      if (keys.has(entry.key)) errors.push(`${path}: shot ${entry.key} is specified twice`);
      keys.add(entry.key);
    }
  }
  return { keys, errors };
}

export function validateDocs(input: {
  readonly articles: readonly DocArticle[];
  readonly reports: readonly RenderReport[];
  readonly specFiles: Record<string, string>;
  readonly requireComplete?: boolean;
  /** Fail on a screenshot that has not been captured yet (production builds). */
  readonly requireShots?: boolean;
}): DocsValidation {
  const errors: string[] = [];
  const inventory = new Map(DOC_INVENTORY.map((entry) => [entry.id, entry]));
  const byLangId = new Map<string, DocArticle>();
  const byLangPath = new Map<string, DocArticle>();

  for (const article of input.articles) {
    const where = article.source;
    if (article.category !== HOME_CATEGORY && !categoryById(article.category)) {
      errors.push(`${where}: unknown category "${article.category}"`);
    }
    const planned = inventory.get(article.id);
    if (!planned) errors.push(`${where}: ${article.id} is not in src/docs/inventory.json`);
    else if (planned.category !== article.category || planned.slug !== article.slug) {
      errors.push(`${where}: ${article.id} belongs at ${planned.category}/${planned.slug}`);
    }
    const idKey = `${article.lang}:${article.id}`;
    if (byLangId.has(idKey)) errors.push(`${where}: ${article.id} also in ${byLangId.get(idKey)!.source}`);
    byLangId.set(idKey, article);
    byLangPath.set(`${article.lang}:${article.category}/${article.slug}`, article);
    for (const related of article.related) {
      if (!inventory.has(related)) errors.push(`${where}: related ${related} is not a known page`);
      if (related === article.id) errors.push(`${where}: relates to itself`);
    }
  }

  // Pairs: same id at the same path in both languages.
  const ids = new Set(input.articles.map((a) => a.id));
  for (const id of ids) {
    const versions = DOC_LANGS.map((lang) => byLangId.get(`${lang}:${id}`));
    const [en, ar] = versions;
    if (!en || !ar) {
      const have = (en ?? ar)!;
      errors.push(`${have.source}: ${id} has no ${en ? 'Arabic' : 'English'} version`);
      continue;
    }
    if (en.category !== ar.category || en.slug !== ar.slug) {
      errors.push(`${ar.source}: ${id} must use the same path as ${en.source}`);
    }
    if (en.type !== ar.type || en.order !== ar.order || en.priority !== ar.priority) {
      errors.push(`${ar.source}: type, order and priority must match the English version`);
    }
  }

  const specified = specifiedShotKeys(input.specFiles);
  errors.push(...specified.errors);

  for (const report of input.reports) {
    const { article } = report;
    const where = article.source;
    for (const problem of report.problems) {
      if (!input.requireShots && problem.startsWith('missing screenshot')) continue;
      errors.push(`${where}: ${problem}`);
    }
    for (const key of report.shotKeys) {
      if (!specified.keys.has(key)) errors.push(`${where}: shot:${key} is not in content/docs/shots/*.yaml`);
      const category = key.split('/')[0];
      if (category !== article.category && !categoryById(category)) {
        errors.push(`${where}: shot:${key} names an unknown category`);
      }
    }
    if (HOW_TO_TYPES.has(article.type) && article.slug !== INDEX_SLUG) {
      for (const step of report.stepsWithoutShot) {
        errors.push(`${where}: step ${step} has no screenshot (every step of a how-to has one)`);
      }
    }
    const exceptions = BANNED_EXCEPTIONS[article.id] ?? [];
    for (const { pattern, why } of DOC_BANNED) {
      if (exceptions.some((e) => e.source === pattern.source)) continue;
      const hit = pattern.exec(report.text);
      if (hit) errors.push(`${where}: "${hit[0]}" — ${why}`);
    }
    if (article.lang === 'ar') {
      const arabic = (report.text.match(/[\u0600-\u06FF]/g) ?? []).length;
      const latin = (report.text.match(/[A-Za-z]/g) ?? []).length;
      if (arabic < 0.7 * (arabic + latin)) errors.push(`${where}: the Arabic version must be written in Arabic`);
    }
  }

  const missing = DOC_INVENTORY.filter((entry) =>
    DOC_LANGS.some((lang: DocLang) => !byLangId.has(`${lang}:${entry.id}`)),
  ).map((entry) => `${entry.id} (${entry.category}/${entry.slug})`);
  if (input.requireComplete) for (const m of missing) errors.push(`not written yet: ${m}`);

  return { errors, missing };
}
