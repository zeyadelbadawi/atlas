/**
 * B3 — site banners and the pop-up on marketing pages (client script).
 *
 * After the page has loaded (never blocking it), asks
 * `GET /api/v1/public/site-announcements?surface=marketing&locale=&path=`
 * and renders up to two banner bars in the `[data-mk-announcements]` slot
 * above the header, and at most one pop-up after its delay, subject to its
 * frequency (`once` per browser, `session` per visit, `always`). Text is
 * set with `textContent` (never HTML); a CTA links only to https:// or a
 * site path. View, click and dismiss events are fire-and-forget
 * (`sendBeacon`, else `fetch` with `keepalive`).
 *
 * The pop-up is a modal dialog: `role="dialog"`, `aria-modal`, labelled by
 * its title and described by its text; focus moves into it, Tab stays
 * inside, Escape / the close button / a backdrop click close it, and focus
 * returns to where it was. It always has a close button: a modal a visitor
 * cannot leave is a trap (the `dismissible` flag governs banners). Motion
 * respects `prefers-reduced-motion`. Storage access is wrapped: a blocked
 * storage only means a pop-up may show again.
 *
 * CSP: no inline script or style attribute is needed (classes only).
 */
import {
  BANNER_CTA_CLASS,
  BANNER_TONE_CLASS,
  POPUP_ACCENT_CLASS,
  TONE_DOT_CLASS,
  dismissKey,
  isAnnouncementTone,
  isSafeAnnouncementUrl,
  localizeAnnouncementHref,
  popupAllowed,
  rememberPopupShown,
  safeStore,
  type AnnouncementTone,
  type KeyValueStore,
  type PopupFrequency,
} from '../announcements/presentation';

export interface MarketingAnnouncement {
  readonly id: string;
  readonly tone: AnnouncementTone;
  readonly title: string | null;
  readonly body: string;
  readonly ctaLabel: string | null;
  readonly ctaUrl: string | null;
  readonly imageUrl: string | null;
  readonly dismissible: boolean;
  readonly popupDelaySeconds: number;
  readonly popupFrequency: PopupFrequency;
  readonly updatedAt: string;
}

export interface AnnouncementFeed {
  readonly banners: readonly MarketingAnnouncement[];
  readonly popup: MarketingAnnouncement | null;
}

export type AnnouncementEvent = 'view' | 'click' | 'dismiss';

export interface AnnouncementDeps {
  readonly fetch: typeof fetch;
  readonly sendBeacon?: (url: string, data: BodyInit) => boolean;
  readonly local: KeyValueStore;
  readonly session: KeyValueStore;
  readonly setTimeout: (callback: () => void, ms: number) => unknown;
}

export const ANNOUNCEMENTS_ENDPOINT = '/api/v1/public/site-announcements';
const MAX_BANNERS = 2;
const MAX_DELAY_SECONDS = 60;

/** The feed URL for this page (the API strips the locale prefix itself too). */
export function feedUrl(lang: string, pathname: string): string {
  const query = new URLSearchParams({
    surface: 'marketing',
    locale: lang === 'ar' ? 'ar' : 'en',
    path: pathname || '/',
  });
  return `${ANNOUNCEMENTS_ENDPOINT}?${query.toString()}`;
}

function normalize(value: unknown): MarketingAnnouncement | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== 'string' ||
    typeof item.body !== 'string' ||
    !item.body.trim()
  )
    return null;
  const frequency = item.popupFrequency;
  return {
    id: item.id,
    tone: isAnnouncementTone(item.tone) ? item.tone : 'info',
    title:
      typeof item.title === 'string' && item.title.trim() ? item.title : null,
    body: item.body,
    ctaLabel:
      typeof item.ctaLabel === 'string' && item.ctaLabel.trim()
        ? item.ctaLabel
        : null,
    ctaUrl: isSafeAnnouncementUrl(item.ctaUrl as string | null)
      ? (item.ctaUrl as string)
      : null,
    imageUrl: isSafeAnnouncementUrl(item.imageUrl as string | null)
      ? (item.imageUrl as string)
      : null,
    dismissible: item.dismissible !== false,
    popupDelaySeconds: Math.min(
      MAX_DELAY_SECONDS,
      Math.max(
        0,
        Number.isFinite(item.popupDelaySeconds)
          ? Number(item.popupDelaySeconds)
          : 0
      )
    ),
    popupFrequency:
      frequency === 'session' || frequency === 'always' ? frequency : 'once',
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
  };
}

/** Validates the API response; anything malformed is dropped. */
export function parseFeed(data: unknown): AnnouncementFeed {
  const raw = (data && typeof data === 'object' ? data : {}) as Record<
    string,
    unknown
  >;
  const banners = Array.isArray(raw.banners)
    ? raw.banners
        .map(normalize)
        .filter((item): item is MarketingAnnouncement => item !== null)
    : [];
  return {
    banners: banners.slice(0, MAX_BANNERS),
    popup: normalize(raw.popup),
  };
}

/** Fire-and-forget event; never throws, never waits. */
export function sendEvent(
  deps: Pick<AnnouncementDeps, 'fetch' | 'sendBeacon'>,
  id: string,
  type: AnnouncementEvent
): void {
  const url = `${ANNOUNCEMENTS_ENDPOINT}/${encodeURIComponent(id)}/events`;
  const body = JSON.stringify({ type });
  try {
    if (deps.sendBeacon?.(url, new Blob([body], { type: 'application/json' })))
      return;
  } catch {
    // fall through to fetch
  }
  try {
    void deps
      .fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'omit',
      })
      .catch(() => undefined);
  } catch {
    // Events are best effort.
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  return node;
}

const CLOSE_ICON = 'M18 6 6 18M6 6l12 12';

function closeIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'size-4');
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CLOSE_ICON);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  svg.append(path);
  return svg;
}

function ctaLink(
  doc: Document,
  item: MarketingAnnouncement,
  className: string,
  onClick: () => void
): HTMLAnchorElement | null {
  if (!item.ctaLabel || !item.ctaUrl) return null;
  const a = el(doc, 'a', className);
  // One link for both languages: on an Arabic page a site path opens the
  // Arabic page.
  a.href = localizeAnnouncementHref(item.ctaUrl, doc.documentElement.lang);
  a.textContent = item.ctaLabel;
  if (/^https:/i.test(item.ctaUrl)) a.rel = 'noopener';
  a.addEventListener('click', onClick);
  return a;
}

/** One banner bar (exported for tests). */
export function renderBanner(
  doc: Document,
  item: MarketingAnnouncement,
  labels: { region: string; dismiss: string },
  handlers: { onClick: () => void; onDismiss: () => void }
): HTMLElement {
  const region = el(doc, 'div', `border-b ${BANNER_TONE_CLASS[item.tone]}`);
  region.setAttribute('role', 'region');
  region.setAttribute('aria-label', labels.region);
  region.dataset.announcement = item.id;
  region.dataset.tone = item.tone;
  const inner = el(
    doc,
    'div',
    'mx-auto flex w-full max-w-marketing items-center gap-3 px-5 py-1 text-sm sm:px-6 lg:px-8'
  );
  const dot = el(
    doc,
    'span',
    `size-2 shrink-0 rounded-full ${TONE_DOT_CLASS[item.tone]}`
  );
  dot.setAttribute('aria-hidden', 'true');
  const text = el(doc, 'p', 'min-w-0 flex-1 py-2 leading-6');
  if (item.title) {
    const strong = el(doc, 'strong', 'font-semibold');
    strong.textContent = item.title;
    text.append(strong, doc.createTextNode(' '));
  }
  text.append(doc.createTextNode(item.body));
  const cta = ctaLink(
    doc,
    item,
    `${BANNER_CTA_CLASS} ms-2 min-h-0 align-baseline`,
    handlers.onClick
  );
  if (cta) text.append(doc.createTextNode(' '), cta);
  inner.append(dot, text);
  if (item.dismissible) {
    const close = el(
      doc,
      'button',
      '-me-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md opacity-80 hover:opacity-100'
    );
    close.type = 'button';
    close.setAttribute('aria-label', labels.dismiss);
    close.append(closeIcon(doc));
    close.addEventListener('click', handlers.onDismiss);
    inner.append(close);
  }
  region.append(inner);
  return region;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Opens the modal pop-up; resolves the close function (exported for tests). */
export function openPopup(
  doc: Document,
  item: MarketingAnnouncement,
  labels: { close: string },
  handlers: { onClick: () => void; onClose: () => void }
): () => void {
  const previous =
    doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
  const titleId = `mk-popup-title-${item.id}`;
  const bodyId = `mk-popup-body-${item.id}`;
  const backdrop = el(
    doc,
    'div',
    'fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center motion-safe:animate-in motion-safe:fade-in-0'
  );
  backdrop.dataset.mkPopup = item.id;
  const dialog = el(
    doc,
    'div',
    'relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200'
  );
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.setAttribute('aria-describedby', bodyId);
  dialog.tabIndex = -1;
  const accent = el(doc, 'div', `h-1.5 ${POPUP_ACCENT_CLASS[item.tone]}`);
  accent.setAttribute('aria-hidden', 'true');
  dialog.append(accent);
  if (item.imageUrl) {
    const img = el(doc, 'img', 'aspect-[2/1] w-full object-cover');
    img.src = item.imageUrl;
    img.alt = '';
    img.width = 800;
    img.height = 400;
    dialog.append(img);
  }
  const content = el(doc, 'div', 'space-y-3 p-6');
  const title = el(doc, 'h2', 'pe-10 text-xl font-semibold leading-snug');
  title.id = titleId;
  title.textContent = item.title ?? '';
  const body = el(doc, 'p', 'leading-7 text-muted-foreground');
  body.id = bodyId;
  body.textContent = item.body;
  content.append(title, body);
  let closed = false;
  const close = (reason: 'dismiss' | 'cta') => {
    if (closed) return;
    closed = true;
    doc.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    doc.documentElement.style.overflow = '';
    if (reason === 'dismiss') handlers.onClose();
    previous?.focus?.();
  };
  const cta = ctaLink(doc, item, 'mk-btn mk-btn-primary mt-2', () => {
    handlers.onClick();
    close('cta');
  });
  if (cta) content.append(cta);
  dialog.append(content);
  const closeButton = el(
    doc,
    'button',
    'absolute end-2 top-3 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground'
  );
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', labels.close);
  closeButton.append(closeIcon(doc));
  closeButton.addEventListener('click', () => close('dismiss'));
  dialog.append(closeButton);
  backdrop.append(dialog);
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) close('dismiss');
  });
  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close('dismiss');
      return;
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = doc.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (active === last || !dialog.contains(active))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  doc.addEventListener('keydown', onKey, true);
  doc.body.append(backdrop);
  doc.documentElement.style.overflow = 'hidden';
  closeButton.focus();
  return () => close('dismiss');
}

/** Renders the feed into the page (exported for tests). */
export function renderAnnouncements(
  doc: Document,
  feed: AnnouncementFeed,
  deps: AnnouncementDeps
): void {
  const slot = doc.querySelector<HTMLElement>('[data-mk-announcements]');
  const labels = {
    region: slot?.dataset.labelRegion || 'Announcement',
    dismiss: slot?.dataset.labelDismiss || 'Dismiss',
    close: slot?.dataset.labelClose || 'Close',
  };
  if (slot) {
    for (const banner of feed.banners) {
      const key = dismissKey(banner.id, banner.updatedAt);
      if (deps.local.getItem(key)) continue;
      const node = renderBanner(doc, banner, labels, {
        onClick: () => sendEvent(deps, banner.id, 'click'),
        onDismiss: () => {
          deps.local.setItem(key, '1');
          sendEvent(deps, banner.id, 'dismiss');
          // Focus goes to the next sensible place, not the top of the page.
          const next =
            node.nextElementSibling?.querySelector<HTMLElement>(
              'button, a[href]'
            ) ?? doc.querySelector<HTMLElement>('[data-header] a[href]');
          node.remove();
          next?.focus();
        },
      });
      slot.append(node);
      sendEvent(deps, banner.id, 'view');
    }
  }
  const popup = feed.popup;
  if (popup && popup.title && popupAllowed(popup, deps)) {
    deps.setTimeout(() => {
      // Not over another open dialog or the mobile menu.
      if (doc.querySelector('[data-mk-popup], details[data-drawer][open]'))
        return;
      rememberPopupShown(popup, deps);
      sendEvent(deps, popup.id, 'view');
      openPopup(doc, popup, labels, {
        onClick: () => sendEvent(deps, popup.id, 'click'),
        onClose: () => sendEvent(deps, popup.id, 'dismiss'),
      });
    }, popup.popupDelaySeconds * 1000);
  }
}

/** Entry point: after load, fetch and render; failures change nothing. */
export function initAnnouncements(win: Window = window): void {
  const doc = win.document;
  if (!doc.querySelector('[data-mk-announcements]')) return;
  const deps: AnnouncementDeps = {
    fetch: win.fetch.bind(win),
    sendBeacon:
      typeof win.navigator.sendBeacon === 'function'
        ? win.navigator.sendBeacon.bind(win.navigator)
        : undefined,
    local: safeStore(() => win.localStorage),
    session: safeStore(() => win.sessionStorage),
    setTimeout: (callback, ms) => win.setTimeout(callback, ms),
  };
  const run = () => {
    deps
      .fetch(feedUrl(doc.documentElement.lang, win.location.pathname), {
        headers: { Accept: 'application/json' },
        credentials: 'omit',
      })
      .then((response) =>
        response.ok ? (response.json() as Promise<unknown>) : Promise.reject()
      )
      .then((data) => renderAnnouncements(doc, parseFeed(data), deps))
      .catch(() => {
        // No banners: the page is complete without them.
      });
  };
  if (doc.readyState === 'complete') run();
  else win.addEventListener('load', run, { once: true });
}
