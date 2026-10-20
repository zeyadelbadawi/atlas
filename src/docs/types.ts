/**
 * The Atlas Help Center on `docs.<base>` (DL-57): static pages rendered at
 * build time from `content/docs/{en,ar}/**.md` (see content/docs/README.md),
 * served by Caddy from /srv-docs. No React at runtime; one small vanilla
 * script (`client/main.ts`) adds search, theme and the drawer.
 */
import type { Plan } from '@/types/plan.types';

export type DocLang = 'en' | 'ar';
export const DOC_LANGS: readonly DocLang[] = ['en', 'ar'];

export const ARTICLE_TYPES = [
  'step-by-step',
  'setup-config',
  'feature-explanation',
  'workflow',
  'role-guide',
  'troubleshooting',
  'faq',
  'reference',
  'glossary',
  'security-privacy',
  'integration',
  'changelog',
  'hub',
] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export const AUDIENCES = ['owner', 'manager', 'instructor', 'learner', 'everyone'] as const;
export type Audience = (typeof AUDIENCES)[number];

export interface DocFrontMatter {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly summary: string;
  readonly type: ArticleType;
  readonly audience: readonly Audience[];
  readonly order: number;
  readonly priority: 'P0' | 'P1' | 'P2';
  readonly related: readonly string[];
  readonly keywords: readonly string[];
  readonly updated: string;
}

/** One article in one language, after parsing (body not yet rendered). */
export interface DocArticle extends DocFrontMatter {
  readonly lang: DocLang;
  readonly category: string;
  readonly slug: string;
  /** `content/docs/en/selling/payment-methods.md` (for error messages). */
  readonly source: string;
  /** Markdown body (front matter removed). */
  readonly body: string;
}

export interface DocCategory {
  readonly id: string;
  readonly order: number;
  /** Lucide icon name (see components/icons.tsx). */
  readonly icon: string;
  readonly title: Readonly<Record<DocLang, string>>;
  readonly description: Readonly<Record<DocLang, string>>;
  /** Shown on the help home's "Start here" row. */
  readonly featured?: boolean;
}

/** A captured screenshot (content/docs/media/<lang>/manifest.json entry). */
export interface DocShot {
  readonly key: string;
  readonly width: number;
  readonly height: number;
  /** Published file names relative to the docs media root, e.g. `media/en/selling/payment-methods-1440.webp`. */
  readonly files: readonly { readonly src: string; readonly width: number }[];
}

export interface DocsRenderContext {
  readonly plans: readonly Plan[];
  /** Origin of the help center, e.g. `https://docs.atlass.dpdns.org`. */
  readonly docsUrl: string;
  /** Origin of the Atlas app and marketing site, e.g. `https://atlass.dpdns.org`. */
  readonly siteUrl: string;
  readonly buildDate: string;
  /** Screenshots per language, by key. */
  readonly shots: Readonly<Record<DocLang, ReadonlyMap<string, DocShot>>>;
  /** Index from page id → article per language. */
  readonly byId: ReadonlyMap<string, Partial<Record<DocLang, DocArticle>>>;
}

export interface DocHeading {
  readonly id: string;
  readonly text: string;
}
