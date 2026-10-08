/**
 * Theme 1 footer (plan §C.1 "Footer").
 *
 * The content is the shared footer (`useWebsiteFooterModel`): the brand —
 * logo or name, the academy's own description and its social marks — then
 * the link groups (the Owner's, Learning, top categories, Help) and the
 * contact details. Up to five columns on desktop, two on tablets, and on
 * phones each column after the brand folds into a disclosure (native
 * `<details>`: keyboard- and screen-reader-operable with no script).
 * Anything with no data behind it is left out rather than shown empty.
 *
 * The platform attribution arrives as a finished element and is rendered
 * as the last row — the theme positions it, it cannot remove or alter it.
 */
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import { cn } from '@utils';
import { useWebsiteContainerClass } from '../renderer/renderer-style.utils';
import {
  FooterEmail,
  renderFooterHomeLink,
  renderFooterLink,
  renderFooterSocialLink,
  telHref,
  useWebsiteFooterModel,
} from '../renderer/website-footer.model';
import type { ThemeFooterProps } from '../theme-packs/theme-pack.types';

const LINK_CLASS = 't1-footer-link t1-focus text-sm';

/** A titled column: a plain column from `sm` up, a disclosure below it. */
function FooterColumn({
  title,
  children,
}: {
  readonly title: string;
  readonly children: (titleId: string) => ReactNode;
}): JSX.Element {
  const titleId = useId();
  const wideTitleId = useId();
  return (
    <div className="min-w-0">
      <details className="group border-b border-[var(--website-border)] sm:hidden">
        <summary className="t1-focus flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold text-[var(--website-foreground)] [&::-webkit-details-marker]:hidden">
          <span id={titleId}>{title}</span>
          <ChevronDown
            className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <div className="pb-4">{children(titleId)}</div>
      </details>
      <div className="hidden sm:block">
        <p
          id={wideTitleId}
          className="mb-4 text-sm font-semibold text-[var(--website-foreground)]"
        >
          {title}
        </p>
        {children(wideTitleId)}
      </div>
    </div>
  );
}

export function ModernEducationFooter(props: ThemeFooterProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const model = useWebsiteFooterModel(props);
  const { name, logo, description, groups, contact, social, copyright } = model;

  const focusClass = 't1-focus rounded-[var(--t1-radius-control)]';
  // The logo (or the name) leads to this Academy's own Home page, as in
  // the header — only while Home is a visible page.
  const brandMark = logo ? (
    renderFooterHomeLink(
      model,
      <img
        src={logo}
        alt={name}
        className="h-10 w-auto max-w-[12rem] object-contain"
      />,
      cn(focusClass, 'flex w-fit max-w-full'),
      props
    )
  ) : (
    <p
      className="break-words font-display text-xl font-bold text-[var(--website-foreground)]"
      dir="auto"
    >
      {renderFooterHomeLink(model, name, focusClass, props)}
    </p>
  );

  const columnCount = groups.length + (contact ? 1 : 0);

  return (
    <footer className="mt-auto border-t border-[var(--website-border)] bg-[var(--website-surface)] pb-6 pt-14 sm:pt-16">
      <div
        className={cn(
          container,
          'grid gap-x-10 gap-y-2 sm:grid-cols-2 sm:gap-y-10',
          columnCount >= 4
            ? 'lg:grid-cols-[1.5fr_repeat(4,1fr)]'
            : 'lg:grid-cols-[1.5fr_repeat(3,1fr)]'
        )}
      >
        <div className="min-w-0 space-y-4 pb-6 sm:col-span-2 sm:pb-0 lg:col-span-1">
          {brandMark}
          {description ? (
            <p
              className="max-w-[38ch] text-sm leading-relaxed text-[var(--website-foreground-muted)]"
              dir="auto"
            >
              {description}
            </p>
          ) : null}
          {social.length > 0 ? (
            <ul
              className="-ms-2.5 flex flex-wrap gap-1"
              aria-label={t('website:chrome.social')}
            >
              {social.map((link) => (
                <li key={link.key}>
                  {renderFooterSocialLink(
                    link,
                    't1-focus t1-footer-social',
                    'size-[1.125rem]',
                    props
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {groups.length > 0 || contact ? (
          // `contents`: the columns stay on the footer's grid; the element
          // only adds the navigation landmark.
          <nav
            className="contents"
            aria-label={t('website:chrome.footerNavigation')}
          >
            {groups.map((group) => (
              <FooterColumn key={group.key} title={group.title}>
                {(titleId) => (
                  <ul className="flex flex-col gap-3" aria-labelledby={titleId}>
                    {group.links.map((link) => (
                      <li key={link.key}>
                        {renderFooterLink(
                          link,
                          cn(LINK_CLASS, 'text-start'),
                          props
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </FooterColumn>
            ))}

            {contact ? (
              <FooterColumn title={t('website:chrome.contact')}>
                {(titleId) => (
                  <ul
                    className="flex flex-col gap-3 text-sm"
                    aria-labelledby={titleId}
                  >
                    {contact.email ? (
                      <li className="flex items-start gap-2">
                        <Mail
                          className="mt-0.5 size-4 shrink-0 text-[var(--website-icon-fg)]"
                          aria-hidden
                        />
                        <a
                          href={`mailto:${contact.email}`}
                          className={LINK_CLASS}
                          dir="ltr"
                        >
                          <FooterEmail email={contact.email} />
                        </a>
                      </li>
                    ) : null}
                    {contact.phone ? (
                      <li className="flex items-start gap-2">
                        <Phone
                          className="mt-0.5 size-4 shrink-0 text-[var(--website-icon-fg)]"
                          aria-hidden
                        />
                        <a
                          href={telHref(contact.phone)}
                          className={LINK_CLASS}
                          dir="ltr"
                        >
                          {contact.phone}
                        </a>
                      </li>
                    ) : null}
                    {contact.address ? (
                      <li className="flex items-start gap-2 text-[var(--website-foreground-muted)]">
                        <MapPin
                          className="mt-0.5 size-4 shrink-0 text-[var(--website-icon-fg)]"
                          aria-hidden
                        />
                        <span dir="auto">{contact.address}</span>
                      </li>
                    ) : null}
                  </ul>
                )}
              </FooterColumn>
            ) : null}
          </nav>
        ) : null}
      </div>

      <div
        className={cn(
          container,
          'mt-10 border-t border-[var(--website-border)] pt-6'
        )}
      >
        {/* The Atlas attribution shares the copyright's line (stacked and
            centred on phones) instead of a bordered row of its own. */}
        <div
          data-testid="website-footer-legal"
          className="flex flex-col items-center gap-x-4 gap-y-1.5 sm:flex-row sm:flex-wrap sm:justify-between"
        >
          <p className="text-center text-xs text-[var(--website-foreground-muted)] sm:text-start">
            {copyright}
          </p>
          {props.attribution}
        </div>
      </div>
    </footer>
  );
}
