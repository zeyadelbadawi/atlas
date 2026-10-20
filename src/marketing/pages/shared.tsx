/**
 * What every page module needs: the copy for its language, the catalog
 * tokens, the EN/AR paths of a page, icons named in the copy, and the
 * JSON-LD entity graph (one Organization / WebSite / SoftwareApplication,
 * referenced by @id from every page so AI and search engines see one entity).
 */
import type { ReactNode } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Globe,
  GraduationCap,
  KeyRound,
  Languages,
  LayoutTemplate,
  Link2,
  ListChecks,
  Lock,
  MonitorSmartphone,
  Palette,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { MarketingContent } from '../content/content.types';
import { ar } from '../content/ar';
import { en } from '../content/en';
import { catalogTokens, fill, fillTree, type Tokens } from '../lib/copy';
import { localePath } from '../lib/site';
import type { MarketingHead, MarketingLang, MarketingRenderContext } from '../types';
import { PageShell } from '../components/chrome';

export const CONTENT: Record<MarketingLang, MarketingContent> = { en, ar };

export interface PageEnv {
  readonly content: MarketingContent;
  readonly tokens: Tokens;
  readonly lang: MarketingLang;
  readonly ctx: MarketingRenderContext;
}

export function pageEnv(lang: MarketingLang, ctx: MarketingRenderContext): PageEnv {
  const raw = CONTENT[lang];
  const year = new Date(ctx.buildDate).getUTCFullYear();
  const tokens: Tokens = { ...catalogTokens(raw, ctx.plans), year: String(year) };
  return { content: fillTree(raw, tokens), lang, ctx, tokens };
}

/** `/pricing` → { en: '/pricing', ar: '/ar/pricing' }. */
export function pairPaths(path: string): { en: string; ar: string } {
  return { en: localePath('en', path), ar: localePath('ar', path) };
}

export function Shell({
  env,
  path,
  currentId,
  children,
}: {
  env: PageEnv;
  path: string;
  currentId?: string;
  children: ReactNode;
}) {
  const paths = pairPaths(path);
  return (
    <PageShell content={env.content} tokens={env.tokens} enPath={paths.en} arPath={paths.ar} currentId={currentId}>
      {children}
    </PageShell>
  );
}

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  link: Link2,
  'monitor-smartphone': MonitorSmartphone,
  wallet: Wallet,
  receipt: ReceiptText,
  'credit-card': CreditCard,
  palette: Palette,
  layout: LayoutTemplate,
  users: Users,
  'user-cog': UserCog,
  building: Building2,
  quiz: ListChecks,
  'list-checks': ListChecks,
  assignment: ClipboardCheck,
  certificate: BadgeCheck,
  'badge-check': BadgeCheck,
  languages: Languages,
  book: BookOpen,
  'graduation-cap': GraduationCap,
  shield: ShieldCheck,
  lock: Lock,
  key: KeyRound,
  smartphone: Smartphone,
  file: FileCheck2,
};

export function Icon({ name, fallback = BookOpen }: { name?: string; fallback?: LucideIcon }) {
  const Component = (name && ICONS[name]) || fallback;
  return <Component className="size-5" aria-hidden strokeWidth={1.75} />;
}

/** Icons for item lists whose copy names none, in a stable order. */


export const OG_IMAGE: Record<MarketingLang, string> = {
  en: '/marketing-assets/og/og-en.jpg',
  ar: '/marketing-assets/og/og-ar.jpg',
};

// ─── JSON-LD ────────────────────────────────────────────────────────────────

export function orgId(siteUrl: string): string {
  return `${siteUrl}/#organization`;
}
export function siteId(siteUrl: string): string {
  return `${siteUrl}/#website`;
}
export function appId(siteUrl: string): string {
  return `${siteUrl}/#software`;
}

/** The shared entity graph, emitted on the home page of each language. */
export function entityGraph(env: PageEnv): object[] {
  const { content, ctx, tokens } = env;
  const url = ctx.siteUrl;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': orgId(url),
      name: content.brand.name,
      alternateName: content.brand.otherName,
      url: `${url}/`,
      logo: `${url}/icon-512.png`,
      description: fill(content.jsonLd.organizationDescription, tokens),
      areaServed: { '@type': 'Country', name: 'Egypt' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': siteId(url),
      name: content.brand.name,
      url: `${url}${localePath(env.lang, '/')}`,
      inLanguage: env.lang,
      description: fill(content.jsonLd.websiteDescription, tokens),
      publisher: { '@id': orgId(url) },
    },
  ];
}

export function breadcrumb(env: PageEnv, items: readonly { name: string; path: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: env.content.chrome.breadcrumbs.home, path: localePath(env.lang, '/') },
      ...items.map((item) => ({ name: item.name, path: localePath(env.lang, item.path) })),
    ].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${env.ctx.siteUrl}${item.path}`,
    })),
  };
}

/** FAQPage from the same strings the page shows (SPEC §B.4 S12). */
export function faqPage(env: PageEnv, items: readonly { question: string; answer: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: env.lang,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** WebPage node tying a page to the site entity, with a freshness date. */
export function webPage(env: PageEnv, path: string, name: string, type = 'WebPage'): object {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${env.ctx.siteUrl}${localePath(env.lang, path)}#webpage`,
    url: `${env.ctx.siteUrl}${localePath(env.lang, path)}`,
    name,
    inLanguage: env.lang,
    isPartOf: { '@id': siteId(env.ctx.siteUrl) },
    about: { '@id': orgId(env.ctx.siteUrl) },
    dateModified: env.ctx.buildDate,
  };
}

/** Builds the common head fields from the page's SEO copy. */
export function seoHead(
  env: PageEnv,
  id: keyof MarketingContent['seo'],
  path: string,
  jsonLd: readonly object[],
): MarketingHead {
  const seo = env.content.seo[id];
  return {
    title: fill(seo.title, env.tokens),
    description: fill(seo.description, env.tokens),
    canonicalPath: localePath(env.lang, path),
    alternates: pairPaths(path),
    ogImage: OG_IMAGE[env.lang],
    ogImageAlt: fill(seo.ogImageAlt, env.tokens),
    jsonLd,
  };
}
