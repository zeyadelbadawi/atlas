/**
 * Article Markdown → React elements (build time only; rendered to static
 * HTML). Conventions are in content/docs/README.md:
 *
 *   1. ordered lists      numbered step cards (`.doc-steps`)
 *   ![alt](shot:key)      a captured screenshot in the article's language
 *   > [!NOTE] / [!TIP] / [!LIMITATION] / [!WARNING]   callouts
 *   [x](doc:DOC-ID) / (app:/path) / (site:/path)    resolved links
 *     (app: → the dashboard origin, site: → the marketing origin, DL-63)
 *
 * Raw HTML in the source is never parsed (`disableParsingRawHTML`): content
 * is Markdown only, so nothing can add a script, a style or a handler.
 * Unresolvable links and missing screenshots are collected as `problems`;
 * the build decides whether they fail it.
 */
import type { ReactNode } from 'react';
import { compiler, parser, RuleType } from 'markdown-to-jsx';
import { categoryPath, articlePath } from '../content/parse';
import type { DocArticle, DocHeading, DocLang, DocShot, DocsRenderContext } from '../types';
import { CalloutIcon } from '../components/icons';

export type CalloutKind = 'note' | 'tip' | 'limitation' | 'warning';

const CALLOUT_KINDS: Record<string, CalloutKind> = {
  NOTE: 'note',
  TIP: 'tip',
  IMPORTANT: 'note',
  LIMITATION: 'limitation',
  CAUTION: 'warning',
  WARNING: 'warning',
};

export const CALLOUT_LABELS: Record<DocLang, Record<CalloutKind, string>> = {
  en: { note: 'Note', tip: 'Tip', limitation: 'What this does not do', warning: 'Warning' },
  ar: { note: 'ملحوظة', tip: 'نصيحة', limitation: 'اللي الميزة دي ماتعملوش', warning: 'تنبيه' },
};

const SHOT_CAPTION: Record<DocLang, string> = {
  en: 'Demo content',
  ar: 'محتوى تجريبي',
};

/** Heading ids that keep Arabic letters (the default slugify drops them). */
export function headingSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\u064B-\u065F]|\u0670|\u0640/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section'
  );
}

/** `{trialDays}` style catalog tokens; unknown tokens are left for the validator to report. */
export function fillTokens(text: string, tokens: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => tokens[key] ?? match);
}

export interface RenderedArticle {
  readonly element: ReactNode;
  readonly headings: readonly DocHeading[];
  /** Number of numbered steps (how-to articles). */
  readonly steps: number;
  readonly shotKeys: readonly string[];
  readonly problems: readonly string[];
  /** Numbered steps (1-based, document order) that hold no screenshot. */
  readonly stepsWithoutShot: readonly number[];
  /** Plain text of the body, for the wording rules and the search index. */
  readonly text: string;
}

/** Every text, link and alt in the AST, space separated. */
function plainTextDeep(nodes: readonly unknown[]): string {
  const out: string[] = [];
  const visit = (list: readonly unknown[]) => {
    for (const node of list) {
      const n = node as { text?: string; alt?: string; children?: unknown[]; items?: unknown[][]; header?: unknown[][]; cells?: unknown[][][] };
      if (typeof n.text === 'string') out.push(n.text);
      if (typeof n.alt === 'string') out.push(n.alt);
      if (n.children) visit(n.children);
      if (n.items) n.items.forEach(visit);
      if (n.header) n.header.forEach(visit);
      if (n.cells) n.cells.forEach((row) => row.forEach(visit));
    }
  };
  visit(nodes);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function plainText(nodes: readonly unknown[]): string {
  return nodes
    .map((node) => {
      const n = node as { text?: string; children?: unknown[] };
      if (typeof n.text === 'string') return n.text;
      return n.children ? plainText(n.children) : '';
    })
    .join('');
}

export function resolveDocLink(
  href: string,
  lang: DocLang,
  ctx: Pick<DocsRenderContext, 'byId' | 'siteUrl' | 'appUrl'>,
): { href: string; external: boolean } | null {
  if (href.startsWith('doc:')) {
    const [id, hash] = href.slice(4).split('#');
    const target = ctx.byId.get(id)?.[lang];
    if (!target) return null;
    return { href: `${articlePath(target)}${hash ? `#${hash}` : ''}`, external: false };
  }
  if (href.startsWith('category:')) {
    return { href: categoryPath(lang, href.slice(9)), external: false };
  }
  if (href.startsWith('app:')) {
    const path = href.slice(4);
    if (!path.startsWith('/')) return null;
    return { href: `${ctx.appUrl}${path}`, external: true };
  }
  if (href.startsWith('site:')) {
    const path = href.slice(5);
    if (!path.startsWith('/')) return null;
    const localised = lang === 'ar' ? (path === '/' ? '/ar' : `/ar${path}`) : path;
    return { href: `${ctx.siteUrl}${localised}`, external: true };
  }
  if (href.startsWith('#')) return { href, external: false };
  if (/^https:\/\//.test(href)) return { href, external: true };
  return null;
}

function ShotFigure({ shot, alt, lang, first }: { shot?: DocShot; alt: string; lang: DocLang; first: boolean }) {
  if (!shot) {
    return (
      <figure className="doc-shot" data-missing-shot>
        <div className="doc-shot-frame doc-shot-missing" role="img" aria-label={alt}>
          <span>{alt}</span>
        </div>
      </figure>
    );
  }
  const largest = shot.files[shot.files.length - 1];
  const srcSet = shot.files.map((f) => `/${f.src} ${f.width}w`).join(', ');
  const mobile = shot.width <= 500;
  return (
    <figure className={mobile ? 'doc-shot doc-shot-mobile' : 'doc-shot'}>
      <a className="doc-shot-frame" href={`/${largest.src}`}>
        <img
          src={`/${shot.files[0].src}`}
          srcSet={srcSet}
          sizes={mobile ? '(min-width: 640px) 320px, 80vw' : '(min-width: 1280px) 760px, (min-width: 1024px) 60vw, 92vw'}
          width={shot.width}
          height={shot.height}
          alt={alt}
          loading={first ? 'eager' : 'lazy'}
          decoding="async"
        />
      </a>
      <figcaption>{SHOT_CAPTION[lang]}</figcaption>
    </figure>
  );
}

function Callout({ kind, lang, children }: { kind: CalloutKind; lang: DocLang; children: ReactNode }) {
  return (
    <aside className={`doc-callout doc-callout-${kind}`} aria-label={CALLOUT_LABELS[lang][kind]}>
      <p className="doc-callout-title">
        <CalloutIcon kind={kind} />
        <span>{CALLOUT_LABELS[lang][kind]}</span>
      </p>
      <div className="doc-callout-body">{children}</div>
    </aside>
  );
}

export function renderArticleBody(
  article: Pick<DocArticle, 'body' | 'lang' | 'source'>,
  ctx: Pick<DocsRenderContext, 'byId' | 'siteUrl' | 'appUrl' | 'shots'>,
  tokens: Readonly<Record<string, string>>,
): RenderedArticle {
  const { lang } = article;
  const problems: string[] = [];
  const shotKeys: string[] = [];
  const shots = ctx.shots[lang];
  let shotIndex = 0;
  const source = fillTokens(article.body, tokens);
  for (const leftover of source.matchAll(/\{(\w+)\}/g)) {
    problems.push(`unknown token {${leftover[1]}}`);
  }

  const options = {
    disableParsingRawHTML: true,
    slugify: headingSlug,
    wrapper: null,
    forceBlock: true,
  } as const;

  const ast = parser(source, options);
  const headings: DocHeading[] = [];
  const stepsWithoutShot: number[] = [];
  let steps = 0;
  const hasShot = (nodes: readonly unknown[]): boolean =>
    nodes.some((node) => {
      const n = node as { type: number; target?: string; children?: unknown[]; items?: unknown[][] };
      if (n.type === RuleType.image && n.target?.startsWith('shot:')) return true;
      if (n.type === RuleType.orderedList) return false; // a nested list's shots are its own
      return (n.children ? hasShot(n.children) : false) || (n.items ?? []).some((item) => hasShot(item));
    });
  const walk = (nodes: readonly unknown[], nestedList: boolean) => {
    for (const node of nodes) {
      const n = node as { type: number; level?: number; id?: string; children?: unknown[]; items?: unknown[][] };
      if (n.type === RuleType.heading) {
        if (n.level === 1) problems.push('use ## for sections; the title is the only h1');
        if (n.level === 2 && n.id) headings.push({ id: n.id, text: plainText(n.children ?? []) });
      }
      if (n.type === RuleType.orderedList && n.items) {
        for (const item of n.items) {
          if (!nestedList) {
            steps += 1;
            if (!hasShot(item)) stepsWithoutShot.push(steps);
          }
          walk(item, true);
        }
        continue;
      }
      if (n.type === RuleType.unorderedList && n.items) {
        for (const item of n.items) walk(item, nestedList);
        continue;
      }
      if (n.children) walk(n.children, nestedList);
    }
  };
  walk(ast, false);
  const text = plainTextDeep(ast);

  const element = compiler(source, {
    ...options,
    overrides: {
      ol: { props: { className: 'doc-steps' } },
      table: {
        component: ({ children, ...rest }: { children: ReactNode }) => (
          <div className="doc-table">
            <table {...rest}>{children}</table>
          </div>
        ),
      },
    },
    // Links and screenshots are resolved here, at compile time, so every
    // problem is known when this function returns (overrides only run when
    // the element is rendered).
    renderRule(next, node, renderChildren, state) {
      const n = node as { type: number; alert?: string; children?: unknown[]; target?: string; alt?: string; title?: string };
      if (n.type === RuleType.link) {
        const href = n.target ?? '';
        const resolved = resolveDocLink(href, lang, ctx);
        const children = renderChildren(n.children as never, state);
        if (!resolved) {
          problems.push(`unresolved link ${href || '(empty)'}`);
          return <span key={state.key} className="doc-broken-link">{children}</span>;
        }
        return (
          <a key={state.key} href={resolved.href} title={n.title} {...(resolved.external ? { rel: 'noopener' } : {})}>
            {children}
          </a>
        );
      }
      if (n.type === RuleType.image) {
        const src = n.target ?? '';
        if (!src.startsWith('shot:')) {
          problems.push(`image ${src || '(empty)'}: only shot:<key> images are allowed`);
          return null;
        }
        const key = src.slice(5);
        const alt = n.alt ?? '';
        if (!alt.trim()) problems.push(`shot:${key} has no alt text`);
        shotKeys.push(key);
        const found = shots.get(key);
        if (!found) problems.push(`missing screenshot shot:${key} (${lang})`);
        const first = shotIndex === 0;
        shotIndex += 1;
        return <ShotFigure key={state.key} shot={found} alt={alt} lang={lang} first={first} />;
      }
      if (n.type === RuleType.blockQuote && n.alert) {
        const kind = CALLOUT_KINDS[n.alert.toUpperCase()];
        if (!kind) {
          problems.push(`unknown callout [!${n.alert}]`);
          return next();
        }
        return (
          <Callout key={state.key} kind={kind} lang={lang}>
            {renderChildren(n.children as never, state)}
          </Callout>
        );
      }
      // A paragraph holding only a screenshot renders the figure alone
      // (a <figure> inside <p> is invalid HTML).
      if (n.type === RuleType.paragraph && n.children?.length === 1) {
        const only = n.children[0] as { type: number; target?: string };
        if (only.type === RuleType.image && only.target?.startsWith('shot:')) {
          return renderChildren(n.children as never, state);
        }
      }
      return next();
    },
  });

  return { element, headings, steps, shotKeys, problems, stepsWithoutShot, text };
}
