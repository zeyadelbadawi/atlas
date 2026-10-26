/**
 * B3 — how a site announcement looks and when it may show, shared by the
 * marketing client script (vanilla DOM), the dashboard banner and the
 * Platform Owner's live previews (React), so a preview is the real thing.
 *
 * Lives under src/marketing so the marketing Tailwind pass (content globs:
 * src/marketing only) carries these classes; the dashboard build scans all
 * of src. Pure: no DOM, no storage — callers pass a storage adapter.
 */

export type AnnouncementTone = 'info' | 'promo' | 'success' | 'warning';
export type PopupFrequency = 'once' | 'session' | 'always';

/** The bar's surface and text per tone (token colours, AA contrast in both themes). */
export const BANNER_TONE_CLASS: Record<AnnouncementTone, string> = {
  info: 'border-info/30 bg-info-surface text-foreground',
  promo: 'border-primary bg-primary text-primary-foreground',
  success: 'border-success/30 bg-success-surface text-foreground',
  warning: 'border-warning/40 bg-warning-surface text-foreground',
};

/** The small tone mark before the text (decorative; the words carry the meaning). */
export const TONE_DOT_CLASS: Record<AnnouncementTone, string> = {
  info: 'bg-info',
  promo: 'bg-primary-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
};

/** The CTA inside a bar: an underlined link that reads on every tone. */
export const BANNER_CTA_CLASS =
  'inline-flex min-h-11 items-center font-semibold underline underline-offset-4 decoration-2 hover:decoration-[3px]';

/** The pop-up's accent strip per tone. */
export const POPUP_ACCENT_CLASS: Record<AnnouncementTone, string> = {
  info: 'bg-info',
  promo: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
};

export function isAnnouncementTone(value: unknown): value is AnnouncementTone {
  return (
    value === 'info' ||
    value === 'promo' ||
    value === 'success' ||
    value === 'warning'
  );
}

/** A CTA target the page may link to: https:// or a site path (`/x`, never `//x`). */
export function isSafeAnnouncementUrl(
  value: string | null | undefined
): value is string {
  if (!value) return false;
  const url = value.trim();
  if (url.startsWith('/')) return !/^\/[/\\]/.test(url);
  return /^https:\/\/[^\s/]/i.test(url);
}

/**
 * The public path without its locale prefix, as `pages` stores it:
 * `/ar/pricing` → `/pricing`, `/ar` → `/`, `/pricing/` → `/pricing`.
 */
export function unlocalizedPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  if (trimmed === '/ar') return '/';
  return trimmed.startsWith('/ar/') ? trimmed.slice(3) : trimmed;
}

/**
 * A CTA link as the visitor's page language needs it. One `ctaUrl` serves
 * both languages, and every marketing page has an Arabic twin under `/ar`,
 * so on an Arabic page a site path opens the Arabic page: `/pricing` →
 * `/ar/pricing`, `/` → `/ar`, `/contact?topic=sales` → `/ar/contact?topic=sales`.
 * Absolute URLs, paths already under `/ar`, `/api/…` and files (a path
 * with an extension, such as `/llms.txt`) are left as they are.
 */
export function localizeAnnouncementHref(url: string, lang: string): string {
  if (lang !== 'ar' || !url.startsWith('/') || url.startsWith('//')) return url;
  const match = /^([^?#]*)(.*)$/.exec(url);
  const path = match?.[1] ?? url;
  const rest = match?.[2] ?? '';
  if (path === '/ar' || path.startsWith('/ar/')) return url;
  if (path.startsWith('/api/') || /\.[a-z0-9]+$/i.test(path)) return url;
  return `/ar${path === '/' ? '' : path}${rest}`;
}

/** Whether a path matches a `pages` list ([] = every page; prefixes cover their children). */
export function pathMatchesPages(
  pathname: string,
  pages: readonly string[]
): boolean {
  if (pages.length === 0) return true;
  const path = unlocalizedPath(pathname);
  return pages.some((page) => {
    const prefix = page.replace(/\/+$/, '') || '/';
    if (prefix === '/') return path === '/';
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

/** Storage key remembering a dismissal of one version of an announcement. */
export function dismissKey(id: string, updatedAt: string): string {
  return `atlas:ann:dismissed:${id}:${updatedAt}`;
}

/** Storage key remembering that a pop-up was shown (per its frequency). */
export function popupSeenKey(id: string, updatedAt: string): string {
  return `atlas:ann:popup:${id}:${updatedAt}`;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A storage that never throws (private mode, blocked storage, SSR). */
export function safeStore(get: () => KeyValueStore | undefined): KeyValueStore {
  return {
    getItem(key) {
      try {
        return get()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        get()?.setItem(key, value);
      } catch {
        // Storage blocked: the choice still applies to this page view.
      }
    },
  };
}

/**
 * Whether a pop-up may open now. `once` is remembered per browser
 * (localStorage), `session` per visit (sessionStorage), `always` never.
 */
export function popupAllowed(
  popup: {
    readonly id: string;
    readonly updatedAt: string;
    readonly popupFrequency: PopupFrequency;
  },
  stores: { readonly local: KeyValueStore; readonly session: KeyValueStore }
): boolean {
  const key = popupSeenKey(popup.id, popup.updatedAt);
  if (popup.popupFrequency === 'once') return !stores.local.getItem(key);
  if (popup.popupFrequency === 'session') return !stores.session.getItem(key);
  return true;
}

/** Records that a pop-up was shown, for its frequency rule. */
export function rememberPopupShown(
  popup: {
    readonly id: string;
    readonly updatedAt: string;
    readonly popupFrequency: PopupFrequency;
  },
  stores: { readonly local: KeyValueStore; readonly session: KeyValueStore }
): void {
  const key = popupSeenKey(popup.id, popup.updatedAt);
  if (popup.popupFrequency === 'once') stores.local.setItem(key, '1');
  else if (popup.popupFrequency === 'session') stores.session.setItem(key, '1');
}
