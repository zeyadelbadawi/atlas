/**
 * Website CTA link resolution (Prompt 11).
 *
 * Turns a typed `WebsiteCta` into an actual path/URL — the one place
 * that logic lives, used identically by the public runtime (real
 * navigation) and available to any future consumer. Precedence is
 * `courseId` → `pageId` → `url`, matching `WebsiteCta`'s own doc
 * comment; a malformed record (e.g. a stale `pageId` for a page that was
 * since deleted) resolves to `undefined` rather than throwing, and every
 * caller treats `undefined` as "render as an inert label, not a link" —
 * never a broken navigation.
 */
import { isSafeExternalUrl } from './url-safety.utils';
import type { WebsiteCta, WebsitePage } from '@types';

/** The public path a `WebsitePage` is reachable at. Core pages map to their fixed path; `courseDetails` has no page-level path (it is reached via `/courses/:courseId`) and a custom page uses its own slug. */
export function resolvePagePath(page: WebsitePage): string | undefined {
  if (page.coreType === 'home') return '/';
  if (page.coreType === 'courseDetails') return undefined;
  if (page.coreType) return `/${page.coreType}`;
  return `/${page.slug}`;
}

/** Resolves a CTA to a path/URL, or `undefined` if it has no usable target. */
export function resolveWebsiteCtaHref(
  cta: WebsiteCta | undefined,
  pages: readonly WebsitePage[]
): string | undefined {
  if (!cta) return undefined;

  // Phase 1 (Extended Scope, Decision 11, dependency C) — highest
  // precedence: an explicit, unambiguous request for this Academy's own
  // Sign In/Sign Up, never confusable with a `pageId`/`courseId`/`url`.
  if (cta.authAction === 'signIn') return '/sign-in';
  if (cta.authAction === 'signUp') return '/sign-up';

  if (cta.courseId) return `/courses/${cta.courseId}`;

  if (cta.pageId) {
    const page = pages.find((candidate) => candidate.id === cta.pageId);
    return page ? resolvePagePath(page) : undefined;
  }

  if (cta.url && isSafeExternalUrl(cta.url)) return cta.url;

  return undefined;
}

/** True when `href` leaves the website (a full external URL) rather than being one of the site's own paths. */
export function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/.test(href);
}
