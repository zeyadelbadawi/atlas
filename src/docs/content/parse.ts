/**
 * Turns the raw Markdown files of `content/docs/` into `DocArticle`s: path
 * → language, category and slug; front matter → typed fields (zod). Pure,
 * so the build and the tests share it. Rules that span files (pairs, links,
 * screenshots) live in `validate.ts`.
 */
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { ARTICLE_TYPES, AUDIENCES, type DocArticle, type DocLang } from '../types';

/** `content/docs/en/selling/payment-methods.md`, `…/en/tasks/_index.md`, `…/en/index.md`. */
const PATH_RE = /(?:^|\/)content\/docs\/(en|ar)\/(?:(?<category>[a-z0-9-]+)\/)?(?<slug>_index|[a-z0-9]+(?:-[a-z0-9]+)*|index)\.md$/;

export const HOME_CATEGORY = 'home';
export const HOME_SLUG = '_home';
export const INDEX_SLUG = '_index';

const isoDate = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'updated must be YYYY-MM-DD'));

const frontMatterSchema = z
  .object({
    id: z.string().regex(/^(DOC-[A-Z]+-\d{3}|GLO-\d{3})$/, 'id must look like DOC-COM-002'),
    title: z.string().min(3).max(120),
    description: z.string().min(40).max(170),
    summary: z.string().min(60).max(600),
    type: z.enum(ARTICLE_TYPES),
    audience: z.array(z.enum(AUDIENCES)).min(1),
    order: z.number().int().min(0).max(999),
    priority: z.enum(['P0', 'P1', 'P2']),
    related: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    updated: isoDate,
  })
  .strict();

export class DocParseError extends Error {}

/** Splits `---\nyaml\n---\nbody`. */
export function splitFrontMatter(raw: string): { data: unknown; body: string } {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) throw new DocParseError('missing front matter (--- … ---)');
  return { data: parseYaml(match[1]), body: match[2] };
}

export function parseArticle(source: string, raw: string): DocArticle {
  const where = PATH_RE.exec(source.replace(/\\/g, '/'));
  if (!where?.groups) {
    throw new DocParseError(`${source}: not a content/docs/<en|ar>/<category>/<slug>.md path`);
  }
  const lang = where[1] as DocLang;
  let { category, slug } = where.groups as { category?: string; slug: string };
  if (slug === 'index' && !category) {
    category = HOME_CATEGORY;
    slug = HOME_SLUG;
  } else if (!category || slug === 'index') {
    throw new DocParseError(`${source}: articles live in a category folder`);
  }
  let parsed: { data: unknown; body: string };
  try {
    parsed = splitFrontMatter(raw);
  } catch (error) {
    throw new DocParseError(`${source}: ${(error as Error).message}`);
  }
  const result = frontMatterSchema.safeParse(parsed.data);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(front matter)'}: ${issue.message}`)
      .join('; ');
    throw new DocParseError(`${source}: ${issues}`);
  }
  const fm = result.data;
  return {
    ...fm,
    summary: fm.summary.trim().replace(/\s+/g, ' '),
    description: fm.description.trim(),
    lang,
    category,
    slug,
    source,
    body: parsed.body.trim(),
  };
}

/** Public path of an article: `/selling/payment-methods`, `/ar/selling/payment-methods`, `/tasks`, `/`. */
export function articlePath(article: Pick<DocArticle, 'lang' | 'category' | 'slug'>): string {
  const prefix = article.lang === 'ar' ? '/ar' : '';
  if (article.category === HOME_CATEGORY) return prefix || '/';
  if (article.slug === INDEX_SLUG) return `${prefix}/${article.category}`;
  return `${prefix}/${article.category}/${article.slug}`;
}

/** Path of a category page in a language. */
export function categoryPath(lang: DocLang, categoryId: string): string {
  return `${lang === 'ar' ? '/ar' : ''}/${categoryId}`;
}

/** Path of a fixed page (`/search`) in a language; the root stays `/` / `/ar`. */
export function localDocsPath(lang: DocLang, path: string): string {
  const clean = path === '/' ? '' : path;
  return lang === 'ar' ? `/ar${clean}` : clean || '/';
}
