/**
 * The Atlas blog's Markdown renderer — ONE renderer for the public blog
 * (server-rendered by the `ssr` container, `renderToStaticMarkup`) and the
 * Platform Owner's live preview in the dashboard editor, so what the owner
 * previews is what visitors read.
 *
 * Sanitized (contract §1): raw HTML is never parsed
 * (`disableParsingRawHTML`), so no script, style, iframe or handler can be
 * written; links only `https://`, `http://`, `mailto:`, a site-relative
 * path (`/pricing`) or an in-page `#anchor`; images only `https://` or a
 * site-relative path. Anything else loses its URL (a link renders as its
 * text, an image is dropped). An `# h1` in the body is demoted to `h2`:
 * the post title is the page's only h1.
 *
 * Styling is plain Tailwind utilities on the elements (tokens only), so the
 * marketing build and the dashboard build both carry the classes without a
 * typography plugin or a second stylesheet.
 */
import type { ReactNode } from 'react';
import { compiler, RuleType } from 'markdown-to-jsx';

/** Heading ids that keep Arabic letters (the default slugify drops them). */
export function blogHeadingSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[ً-ٟ]|ٰ|ـ/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section'
  );
}

/** Whether a link target is allowed (http(s), mailto, site-relative, #anchor). */
export function isSafeBlogHref(value: string): boolean {
  const href = value.trim();
  if (!href) return false;
  if (href.startsWith('#')) return true;
  if (href.startsWith('/')) return !/^\/[/\\]/.test(href);
  return /^(https?:\/\/[^\s/]|mailto:[^\s])/i.test(href);
}

/** Whether an image source is allowed (https or site-relative). */
export function isSafeBlogImage(value: string): boolean {
  const src = value.trim();
  if (src.startsWith('/')) return !/^\/[/\\]/.test(src);
  return /^https:\/\/[^\s/]/i.test(src);
}

function sanitize(
  value: string,
  tag: string,
  attribute: string
): string | null {
  if (tag === 'img' && attribute === 'src') {
    return isSafeBlogImage(value) ? value.trim() : null;
  }
  if (attribute === 'href') return isSafeBlogHref(value) ? value.trim() : null;
  // Every other URL-bearing attribute markdown can produce: refuse.
  if (
    attribute === 'src' ||
    attribute === 'action' ||
    attribute === 'formaction'
  ) {
    return null;
  }
  return value;
}

const HEADING_2 =
  'mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight text-foreground';
const HEADING_3 = 'mt-8 scroll-mt-24 text-xl font-semibold text-foreground';
const HEADING_4 = 'mt-6 text-lg font-semibold text-foreground';

const OVERRIDES = {
  h1: { component: 'h2', props: { className: HEADING_2 } },
  h2: { props: { className: HEADING_2 } },
  h3: { props: { className: HEADING_3 } },
  h4: { props: { className: HEADING_4 } },
  h5: { component: 'h4', props: { className: HEADING_4 } },
  h6: { component: 'h4', props: { className: HEADING_4 } },
  p: { props: { className: 'mt-5 leading-8 text-foreground/90' } },
  ul: {
    props: {
      className:
        'mt-5 list-disc space-y-2 ps-6 leading-8 marker:text-muted-foreground',
    },
  },
  ol: {
    props: {
      className:
        'mt-5 list-decimal space-y-2 ps-6 leading-8 marker:text-muted-foreground',
    },
  },
  li: { props: { className: 'ps-1' } },
  blockquote: {
    props: {
      className:
        'mt-6 border-s-4 border-primary/40 bg-surface px-5 py-3 text-foreground/90 [&>p]:mt-0',
    },
  },
  a: {
    props: {
      className:
        'font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary',
    },
  },
  strong: { props: { className: 'font-semibold text-foreground' } },
  code: {
    props: {
      className: 'rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]',
    },
  },
  pre: {
    props: {
      className:
        'mt-6 overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-sm leading-6 [&>code]:bg-transparent [&>code]:p-0',
      dir: 'ltr',
    },
  },
  hr: { props: { className: 'my-10 border-border' } },
  table: {
    component: ({ children, ...rest }: { children: ReactNode }) => (
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table {...rest} className="w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    ),
  },
  th: {
    props: {
      className:
        'border-b border-border bg-surface px-3 py-2 text-start font-semibold',
    },
  },
  td: { props: { className: 'border-b border-border px-3 py-2 align-top' } },
  img: {
    props: {
      className: 'mt-6 h-auto max-w-full rounded-lg border border-border',
      loading: 'lazy',
      decoding: 'async',
    },
  },
} as const;

export interface BlogHeading {
  readonly id: string;
  readonly text: string;
}

/** The post body as React elements (server render and dashboard preview). */
export function renderBlogMarkdown(body: string): ReactNode {
  return compiler(body ?? '', {
    disableParsingRawHTML: true,
    forceBlock: true,
    wrapper: null,
    slugify: blogHeadingSlug,
    sanitizer: sanitize,
    overrides: OVERRIDES as never,
    renderRule(next, node) {
      const n = node as { type: number; target?: string | null };
      // A link or image whose URL the sanitizer refused: link → its text
      // (rendered by `next` without an href), image → nothing at all.
      if (
        n.type === RuleType.image &&
        (!n.target || !isSafeBlogImage(n.target))
      ) {
        return null;
      }
      return next();
    },
  });
}

/** `##` headings, for a table of contents (plain text, slugged like the renderer). */
export function blogHeadings(body: string): BlogHeading[] {
  const headings: BlogHeading[] = [];
  let fenced = false;
  for (const line of (body ?? '').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const text = match[1]
        .replace(/[*_`[\]]/g, '')
        .replace(/\(([^)]*)\)/g, '')
        .trim();
      headings.push({ id: blogHeadingSlug(text), text });
    }
  }
  return headings;
}

/** Words / 200, at least 1 (the server's reading-time rule, for the editor's hint). */
export function readingMinutes(body: string): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
