/**
 * Website CTA link resolution (Prompt 11).
 *
 * Turns a typed `WebsiteCta` into an actual path/URL — the one place
 * that logic lives, used identically by the public runtime (real
 * navigation) and available to any future consumer. Precedence is
 * `authAction` → `courseId` → `pageId` → `whatsapp` → `phone` → `url`
 * (the editor sets only one; the order only decides a malformed record); a malformed record (e.g. a stale `pageId` for a page that was
 * since deleted) resolves to `undefined` rather than throwing, and every
 * caller treats `undefined` as "render as an inert label, not a link" —
 * never a broken navigation.
 */
import { isSafeExternalUrl } from './url-safety.utils';
import { resolveLocalizedText } from './localized-text.utils';
import {
  CTA_PHONE_NUMBER_PATTERN,
  CTA_WHATSAPP_NUMBER_PATTERN,
} from '../constants/website.constants';
import {
  SECTION_BUTTON_SLOTS,
  type PublicWebsiteLocale,
  type SectionButtons,
  type WebsiteCta,
  type WebsitePage,
} from '@types';

/** The public path a `WebsitePage` is reachable at. Core pages map to their fixed path; `courseDetails` has no page-level path (it is reached via `/courses/:courseId`) and a custom page uses its own slug. */
export function resolvePagePath(page: WebsitePage): string | undefined {
  if (page.coreType === 'home') return '/';
  if (page.coreType === 'courseDetails') return undefined;
  if (page.coreType) return `/${page.coreType}`;
  return `/${page.slug}`;
}

/**
 * A WhatsApp chat link. The number is re-checked here, not trusted from
 * storage; `message` (already in the visitor's language) pre-fills the chat.
 */
export function whatsappHref(
  number: string,
  message?: string
): string | undefined {
  if (!CTA_WHATSAPP_NUMBER_PATTERN.test(number)) return undefined;
  const text = message?.trim();
  return `https://wa.me/${number.slice(1)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** A call link for an international number or a short hotline. */
export function phoneHref(number: string): string | undefined {
  return CTA_PHONE_NUMBER_PATTERN.test(number) ? `tel:${number}` : undefined;
}

/**
 * Resolves a CTA to a path/URL, or `undefined` if it has no usable target.
 * `locale` picks the language of a WhatsApp button's pre-filled message.
 */
export function resolveWebsiteCtaHref(
  cta: WebsiteCta | undefined,
  pages: readonly WebsitePage[],
  locale?: PublicWebsiteLocale
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

  if (cta.whatsapp) {
    return whatsappHref(
      cta.whatsapp,
      locale ? resolveLocalizedText(cta.whatsappMessage, locale) : undefined
    );
  }

  if (cta.phone) return phoneHref(cta.phone);

  if (cta.url && isSafeExternalUrl(cta.url)) return cta.url;

  return undefined;
}

/** Whether a section has any button to draw (one of its three slots is set). */
export function hasSectionButtons(config: SectionButtons): boolean {
  return SECTION_BUTTON_SLOTS.some((slot) => !!config[slot]);
}

/** True when `href` leaves the website (a full external URL) rather than being one of the site's own paths. */
export function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/.test(href);
}
