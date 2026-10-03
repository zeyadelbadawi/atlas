/**
 * One place that decides where the page is scrolled after a navigation
 * (Task 5).
 *
 * It replaces react-router's `<ScrollRestoration/>`, which got two cases
 * wrong for this app: it jumped to the top on EVERY new history entry —
 * including the `setSearchParams(…, { replace: true })` used for tabs,
 * filters and date ranges, so switching a tab threw the user back to the
 * top — and it restored a Back/Forward offset at the moment the location
 * committed, while the page was still a few skeletons tall, so the saved
 * offset was clamped and the user landed near the bottom of a page that
 * then grew underneath them.
 *
 * The rules:
 *  - PUSH/REPLACE to a different page (pathname) → top, window and every
 *    `[data-scroll-container]`.
 *  - Same page, only the query or state changed (tabs, filters,
 *    pagination in the URL) → leave the scroll where it is.
 *  - A `#hash` → that element, retried briefly while lazy content mounts.
 *  - Back/Forward (POP) → the offset that entry had, applied once the page
 *    is tall enough to hold it (or after a short cap), and never against
 *    the user: any wheel/touch/key input cancels the pending restore.
 *
 * In-page view swaps that are not navigations (a form replaced by its
 * success card) are not routing events; they use `useResetScrollOnReveal`.
 *
 * Browser-only work happens in effects, so the module renders on the
 * server (the public Academy site is server-rendered through the same
 * `appRoutes`).
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'atlas:scroll-positions';
/** Entries kept in sessionStorage; older ones are dropped. */
const MAX_ENTRIES = 100;
/** How long a Back/Forward restore waits for the page to grow. */
const RESTORE_WAIT_MS = 1500;
/** How long a `#hash` waits for its target to mount. */
const HASH_WAIT_MS = 1000;

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Positions = Record<string, number>;

function readPositions(): Positions {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Positions) : {};
  } catch {
    return {};
  }
}

function writePositions(positions: Positions): void {
  try {
    const keys = Object.keys(positions);
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)))
      delete positions[key];
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Private mode or a full quota: Back/Forward simply starts at the top.
  }
}

function scrollWindowTo(top: number): void {
  // `instant` bypasses any `scroll-behavior: smooth` a page may set.
  window.scrollTo({ top, left: 0, behavior: 'instant' as ScrollBehavior });
}

function resetToTop(): void {
  scrollWindowTo(0);
  document
    .querySelectorAll<HTMLElement>('[data-scroll-container]')
    .forEach((element) => {
      element.scrollTop = 0;
    });
}

/** Retries `attempt` every frame until it returns true or `waitMs` passes. */
function retryEachFrame(
  attempt: () => boolean,
  waitMs: number,
  onTimeout?: () => void
): () => void {
  const deadline = performance.now() + waitMs;
  let frame = 0;
  const tick = () => {
    if (attempt()) return;
    if (performance.now() >= deadline) {
      onTimeout?.();
      return;
    }
    frame = window.requestAnimationFrame(tick);
  };
  tick();
  return () => window.cancelAnimationFrame(frame);
}

export function AppScrollManager(): null {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef<Positions | null>(null);
  const previous = useRef<{ key: string; pathname: string } | null>(null);

  // Manual restoration, so the browser does not race the rules above.
  useEffect(() => {
    const history = window.history;
    const before = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    positions.current = readPositions();
    return () => {
      history.scrollRestoration = before;
    };
  }, []);

  // Remember the current entry's offset as the user scrolls. One listener
  // for the app's lifetime; it writes under `currentKey`, which the effect
  // below switches synchronously BEFORE it resets or restores, so a reset
  // is never recorded as the previous page's position. A plain assignment
  // per scroll event, persisted only when the page is hidden or left.
  const currentKey = useRef(location.key);
  useEffect(() => {
    const remember = () => {
      positions.current ??= readPositions();
      positions.current[currentKey.current] = window.scrollY;
    };
    const persist = () => {
      if (positions.current) writePositions(positions.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('scroll', remember, { passive: true });
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('scroll', remember);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    const prev = previous.current;
    previous.current = { key: location.key, pathname: location.pathname };
    if (prev?.key === location.key) return;
    currentKey.current = location.key;

    let cancel: (() => void) | undefined;
    const stop = () => cancel?.();
    // Never fight the user: their own scrolling ends a pending restore.
    const userInput = ['wheel', 'touchstart', 'keydown'] as const;
    userInput.forEach((type) =>
      window.addEventListener(type, stop, { passive: true, once: true })
    );

    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      cancel = retryEachFrame(() => {
        const target = document.getElementById(id);
        if (!target) return false;
        target.scrollIntoView();
        return true;
      }, HASH_WAIT_MS);
    } else if (navigationType === 'POP') {
      positions.current ??= readPositions();
      const saved = positions.current[location.key] ?? 0;
      const fits = () =>
        document.documentElement.scrollHeight - window.innerHeight >= saved;
      cancel = retryEachFrame(
        () => {
          if (!fits()) return false;
          scrollWindowTo(saved);
          return true;
        },
        RESTORE_WAIT_MS,
        () => scrollWindowTo(saved)
      );
    } else if (!prev || prev.pathname !== location.pathname) {
      // A first load on a fresh URL stays at the top; a new page goes there.
      if (prev) resetToTop();
    }
    // Otherwise the same page with a new query or state: stay put.

    return () => {
      stop();
      userInput.forEach((type) => window.removeEventListener(type, stop));
    };
  }, [location.key]);

  return null;
}
