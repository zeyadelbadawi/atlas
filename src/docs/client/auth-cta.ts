/**
 * The header's account button (DL-63). Pages render "Sign in" → the app's
 * sign-in page; when the `atlas_signed_in=1` hint cookie is present (set by
 * the backend on `Domain=<base>` while a dashboard session exists, not
 * HttpOnly, a constant value) the button becomes "Open dashboard" →
 * `<app>/dashboard`. The cookie is only a UI hint: the app checks the real
 * session, so a stale or forged cookie can at worst show the wrong label.
 *
 * Every label, URL and notice comes from data attributes rendered at build
 * time (components/chrome.tsx); this file only swaps them. A plain left
 * click shows a full-screen notice (`[data-auth-overlay]`) and then
 * navigates; modified and middle clicks keep the browser's behaviour.
 */

export const SIGNED_IN_COOKIE = 'atlas_signed_in';

/** The value of cookie `name` in a `document.cookie` string, exact name match only. */
export function readCookie(cookies: string, name: string): string | null {
  for (const part of cookies.split(';')) {
    const pair = part.trim();
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    if (pair.slice(0, eq) === name) return pair.slice(eq + 1);
  }
  return null;
}

export function isSignedIn(cookies: string): boolean {
  return readCookie(cookies, SIGNED_IN_COOKIE) === '1';
}

/** Sets every `[data-auth-cta]` link to its signed-in or signed-out state. */
export function applyAuthCta(doc: Document, signedIn: boolean): void {
  const state = signedIn ? 'SignedIn' : 'SignedOut';
  doc.querySelectorAll<HTMLAnchorElement>('a[data-auth-cta]').forEach((a) => {
    const href = a.dataset[`href${state}`];
    const label = a.dataset[`label${state}`];
    if (!href || !label) return;
    a.href = href;
    a.textContent = label;
    a.dataset.authState = signedIn ? 'signed-in' : 'signed-out';
  });
}

/** Shows the full-screen notice; returns false when the page has none. */
export function showAuthOverlay(doc: Document, signedIn: boolean): boolean {
  const overlay = doc.querySelector<HTMLElement>('[data-auth-overlay]');
  const text = overlay?.querySelector<HTMLElement>('[data-auth-overlay-text]');
  if (!overlay || !text) return false;
  const message = signedIn ? overlay.dataset.textSignedIn : overlay.dataset.textSignedOut;
  overlay.hidden = false;
  // Filled after it is shown so the live region announces it.
  text.textContent = message ?? '';
  return true;
}

export function hideAuthOverlay(doc: Document): void {
  const overlay = doc.querySelector<HTMLElement>('[data-auth-overlay]');
  if (!overlay) return;
  overlay.hidden = true;
  const text = overlay.querySelector<HTMLElement>('[data-auth-overlay-text]');
  if (text) text.textContent = '';
}

/** A click the page may take over: primary button, no modifier keys. */
export function isPlainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export interface AuthCtaOptions {
  readonly navigate?: (href: string) => void;
  readonly cookies?: () => string;
}

export function initAuthCta(doc: Document = document, win: Window = window, options: AuthCtaOptions = {}): void {
  const cookies = options.cookies ?? (() => doc.cookie);
  const navigate = options.navigate ?? ((href: string) => win.location.assign(href));
  applyAuthCta(doc, isSignedIn(cookies()));

  doc.querySelectorAll<HTMLAnchorElement>('a[data-auth-cta]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (!isPlainClick(e)) return;
      e.preventDefault();
      const href = a.href;
      if (!showAuthOverlay(doc, a.dataset.authState === 'signed-in')) {
        navigate(href);
        return;
      }
      // One frame for the notice to paint, then leave.
      win.requestAnimationFrame(() => win.setTimeout(() => navigate(href), 0));
    });
  });

  // Back/forward cache: the page comes back as it was left, notice included.
  win.addEventListener('pageshow', (e) => {
    if (!(e as PageTransitionEvent).persisted) return;
    hideAuthOverlay(doc);
    applyAuthCta(doc, isSignedIn(cookies()));
  });
}
