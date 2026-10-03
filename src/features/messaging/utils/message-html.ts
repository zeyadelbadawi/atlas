/**
 * W3-compose — the editor's client-side allowlist.
 *
 * The SERVER is the boundary: `sanitizeRichText` in the backend rebuilds the
 * body from the same allowlist before anything is stored or emailed. This
 * copy exists so what the author sees (after a paste, in the preview) is
 * what will be sent, and so pasted markup from a web page or a word
 * processor never sits in the editor as live HTML.
 *
 * Same rules: p, br, strong, em, u, s, ul, ol, li, h2, h3, blockquote and
 * links (https: or mailto: only). Every attribute except a link's href is
 * dropped; images, scripts, styles and frames disappear with their content.
 * Parsed with DOMParser on a detached document, which runs no script and
 * fetches nothing.
 */
const ALLOWED = new Set([
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'a',
  'h2',
  'h3',
  'blockquote',
]);
const ALIASES: Readonly<Record<string, string>> = {
  b: 'strong',
  i: 'em',
  strike: 's',
  del: 's',
  div: 'p',
  h1: 'h2',
  h4: 'h3',
  h5: 'h3',
  h6: 'h3',
};
const DROP_WITH_CONTENT = new Set([
  'script',
  'style',
  'template',
  'iframe',
  'object',
  'embed',
  'textarea',
  'title',
  'noscript',
  'svg',
  'math',
  'head',
  'img',
  'video',
  'audio',
  'picture',
]);

export function safeMessageHref(raw: string): string | null {
  // eslint-disable-next-line no-control-regex
  const value = raw.replace(/[\u0000- \u007f-\u009f]/g, '');
  if (/^mailto:[^<>"'\s]+$/i.test(value)) return value;
  if (!/^https:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeChildren(
  source: Node,
  target: Node,
  doc: Document,
  depth: number
): void {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.textContent ?? ''));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const element = child as Element;
    const raw = element.tagName.toLowerCase();
    if (DROP_WITH_CONTENT.has(raw)) continue;
    const name = ALIASES[raw] ?? raw;
    if (!ALLOWED.has(name) || depth >= 16) {
      // Unknown wrapper (span, font, section…): keep its text, lose the tag.
      sanitizeChildren(element, target, doc, depth);
      continue;
    }
    if (name === 'a') {
      const href = safeMessageHref(element.getAttribute('href') ?? '');
      if (!href) {
        sanitizeChildren(element, target, doc, depth);
        continue;
      }
      const link = doc.createElement('a');
      link.setAttribute('href', href);
      link.setAttribute('rel', 'noopener noreferrer nofollow');
      link.setAttribute('target', '_blank');
      sanitizeChildren(element, link, doc, depth + 1);
      target.appendChild(link);
      continue;
    }
    const clean = doc.createElement(name);
    sanitizeChildren(element, clean, doc, depth + 1);
    target.appendChild(clean);
  }
}

/** Allowlist HTML for the editor value. Returns '' for content with no text. */
export function sanitizeMessageHtml(html: string): string {
  if (!html) return '';
  const parsed = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    'text/html'
  );
  const out = document.implementation.createHTMLDocument('');
  const container = out.createElement('div');
  sanitizeChildren(parsed.body, container, out, 0);
  if (!(container.textContent ?? '').trim()) return '';
  return container.innerHTML;
}

/** The visible text of a body — what the server's length limit counts. */
export function messagePlainText(html: string): string {
  if (!html) return '';
  const parsed = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    'text/html'
  );
  return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** A uuid for the send's idempotency key (crypto.randomUUID when available). */
export function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  cryptoApi?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    ''
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
