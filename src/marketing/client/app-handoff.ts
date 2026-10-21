/**
 * DL-63 — the header knows the dashboard, and the hop to it shows a
 * transition.
 *
 * 1. "Sign in" becomes "Open dashboard" when the base-domain hint cookie
 *    `atlas_signed_in=1` is present. The hint is set and cleared by the
 *    platform (a constant, never a credential); a stale one costs nothing:
 *    the dashboard checks the real session and shows sign-in. Both labels
 *    and targets are rendered into the page; this only swaps them.
 * 2. A plain left click on any link into the app shows a full-screen
 *    "Opening your dashboard…" (or sign-in / sign-up) screen, then navigates;
 *    the dashboard's own boot screen continues it. New-tab clicks are left
 *    alone, and Back (bfcache) removes the screen.
 */
export const SIGNED_IN_HINT = 'atlas_signed_in=1';

export function hasSignedInHint(cookie: string): boolean {
  return cookie.split(';').some((part) => part.trim() === SIGNED_IN_HINT);
}

export type HandoffKind = 'dashboard' | 'signIn' | 'signUp';

/** Which screen a link into the app shows; `null` for any link not on the app origin. */
export function handoffKind(href: string, appOrigin: string): HandoffKind | null {
  if (!appOrigin) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.origin !== appOrigin) return null;
  if (/^\/auth\/(register|sign-up)(\/|$)/.test(url.pathname)) return 'signUp';
  if (url.pathname.startsWith('/auth')) return 'signIn';
  return 'dashboard';
}

/** Swaps every `[data-auth-cta]` link to its signed-in target and label. */
export function applyAuthCtas(root: ParentNode, signedIn: boolean): void {
  if (!signedIn) return;
  root.querySelectorAll<HTMLAnchorElement>('a[data-auth-cta]').forEach((link) => {
    const href = link.dataset.signedInHref;
    const label = link.dataset.signedInLabel;
    if (!href || !label) return;
    link.href = href;
    link.textContent = label;
  });
}

function isPlainClick(event: MouseEvent, link: HTMLAnchorElement): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (!link.target || link.target === '_self') &&
    !link.hasAttribute('download')
  );
}

export function initAppHandoff(
  appOrigin: string,
  doc: Document = document,
  navigate: (href: string) => void = (href) => window.location.assign(href)
): void {
  applyAuthCtas(doc, hasSignedInHint(doc.cookie));
  const overlay = doc.getElementById('mk-app-handoff');
  if (!overlay || !appOrigin) return;
  const text = overlay.querySelector<HTMLElement>('[data-handoff-text]');

  doc.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || !isPlainClick(event, link)) return;
    const kind = handoffKind(link.href, appOrigin);
    if (!kind) return;
    event.preventDefault();
    const copy = overlay.dataset[`text${kind[0].toUpperCase()}${kind.slice(1)}`];
    if (text && copy) text.textContent = copy;
    overlay.hidden = false;
    // One frame so the screen paints before the browser starts leaving.
    window.requestAnimationFrame(() => navigate(link.href));
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) overlay.hidden = true;
  });
}
