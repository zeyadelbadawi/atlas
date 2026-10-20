/**
 * `/llms-full.txt` (GEO): the visible text of every published marketing
 * page — English, then Arabic — as plain Markdown-ish text, followed by the
 * `/pricing.md` body. Generated from each page's rendered HTML, `<main>`
 * only (no header, footer or navigation); scripts, styles, SVG and
 * `aria-hidden`/`hidden` content are dropped; headings become `#`, list
 * items `-`, table rows `| a | b |`.
 *
 * The input is `renderToStaticMarkup` output (well-formed), so a small
 * tokenizer is enough; it is not a general HTML parser.
 */
import type { MarketingLang } from '../types';
import { absoluteUrl } from './document';

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'source', 'track', 'wbr',
]);
const SKIP = new Set(['script', 'style', 'svg', 'noscript', 'template', 'head']);
const BLOCK = new Set([
  'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'div', 'dl',
  'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'header', 'hr',
  'legend', 'li', 'main', 'nav', 'ol', 'p', 'section', 'summary', 'table',
  'tbody', 'thead', 'tfoot', 'tr', 'ul', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'label', 'caption',
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** The inner HTML of the first `<main>`, or the whole input when there is none. */
export function mainHtml(html: string): string {
  const open = /<main\b[^>]*>/i.exec(html);
  if (!open) return html;
  const start = open.index + open[0].length;
  const end = html.lastIndexOf('</main>');
  return end > start ? html.slice(start, end) : html.slice(start);
}

function isHidden(attrs: string): boolean {
  return (
    /\saria-hidden="true"/i.test(attrs) ||
    /\shidden(?:[\s=>/]|$)/i.test(attrs) ||
    /\sinert(?:[\s=>/]|$)/i.test(attrs)
  );
}

/** Visible text of an HTML fragment, one block per line group. */
export function htmlToText(html: string): string {
  const blocks: string[] = [];
  let current = '';
  let prefix = '';
  let cells: string[] | null = null;
  let skipDepth = 0;
  const stack: { name: string; skip: boolean }[] = [];

  const flush = () => {
    const text = current.replace(/\s+/g, ' ').trim();
    if (text) blocks.push(prefix + text);
    current = '';
    prefix = '';
  };

  const tokens = html.match(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+|</g) ?? [];
  for (const token of tokens) {
    if (token.startsWith('<!--')) continue;
    const tag = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>$/.exec(token);
    if (!tag) {
      if (skipDepth === 0) current += decodeEntities(token);
      continue;
    }
    const [, closing, rawName, attrs] = tag;
    const name = rawName.toLowerCase();
    const selfClosing = VOID.has(name) || attrs.trim().endsWith('/');

    if (closing) {
      // Pop to the matching element (tolerates stray closers).
      const index = stack.map((entry) => entry.name).lastIndexOf(name);
      if (index === -1) continue;
      const popped = stack.splice(index);
      skipDepth -= popped.filter((entry) => entry.skip).length;
      if (skipDepth > 0) continue;
      if (name === 'td' || name === 'th') {
        if (cells) cells.push(current.replace(/\s+/g, ' ').trim());
        current = '';
      } else if (name === 'tr') {
        if (cells && cells.some(Boolean)) blocks.push(`| ${cells.join(' | ')} |`);
        cells = null;
      } else if (BLOCK.has(name)) {
        flush();
      }
      continue;
    }

    if (selfClosing) {
      if (skipDepth > 0) continue;
      if (name === 'br') current += '\n';
      else if (name === 'hr') flush();
      continue;
    }

    const skip = SKIP.has(name) || isHidden(attrs);
    stack.push({ name, skip });
    if (skip) {
      skipDepth += 1;
      continue;
    }
    if (skipDepth > 0) continue;

    if (name === 'a' && current && !/\s$/.test(current)) {
      // Adjacent links (buttons rendered as <a>) read as separate words.
      current += ' ';
    }
    if (name === 'tr') {
      flush();
      cells = [];
    } else if (name === 'td' || name === 'th') {
      current = '';
    } else if (BLOCK.has(name)) {
      flush();
      const heading = /^h([1-6])$/.exec(name);
      if (heading) prefix = `${'#'.repeat(Number(heading[1]))} `;
      else if (name === 'li') prefix = '- ';
    } else if (name === 'button' || name === 'select') {
      // Controls are UI, not content.
      stack[stack.length - 1].skip = true;
      skipDepth += 1;
    }
  }
  flush();

  // Consecutive list items / table rows stay together; other blocks get a blank line.
  let out = '';
  blocks.forEach((block, index) => {
    if (index > 0) {
      const previous = blocks[index - 1];
      const tight =
        (block.startsWith('- ') && previous.startsWith('- ')) ||
        (block.startsWith('| ') && previous.startsWith('| '));
      out += tight ? '\n' : '\n\n';
    }
    out += block;
  });
  return out;
}

export interface LlmsFullPage {
  readonly lang: MarketingLang;
  readonly canonicalPath: string;
  readonly title: string;
  /** The full rendered document (or body) HTML. */
  readonly html: string;
}

export function buildLlmsFullTxt(input: {
  readonly siteUrl: string;
  readonly buildDate: string;
  readonly pages: readonly LlmsFullPage[];
  readonly pricingMarkdown: string;
  readonly heading?: string;
  readonly summary?: string;
}): string {
  const ordered = [
    ...input.pages.filter((page) => page.lang === 'en'),
    ...input.pages.filter((page) => page.lang === 'ar'),
  ];
  const parts: string[] = [
    `# ${input.heading ?? 'Atlas'} — full text`,
    '',
    ...(input.summary ? [`> ${input.summary.replace(/\s+/g, ' ').trim()}`, ''] : []),
    `The visible text of the published pages of ${input.siteUrl.replace(/\/+$/, '')}, English then Arabic, as of ${input.buildDate}, followed by the pricing file.`,
    '',
  ];
  for (const page of ordered) {
    parts.push(
      '---',
      '',
      `URL: ${absoluteUrl(input.siteUrl, page.canonicalPath)}`,
      `Language: ${page.lang}`,
      `Title: ${page.title}`,
      '',
      htmlToText(mainHtml(page.html)),
      ''
    );
  }
  parts.push('---', '', input.pricingMarkdown.trim(), '');
  return parts.join('\n');
}
