/**
 * Atelier footer: the colophon (Reports/THEME_2_ATELIER_PLAN.md §5a
 * "Chrome"). The content is the shared footer (`useWebsiteFooterModel`):
 * the academy's identity — logo, name in the display face, its own
 * description, its social marks — set as a colophon beside the link groups
 * (the Owner's, Learning, top categories, Help) and its contact details,
 * under a hairline rule, then the copyright line. Anything with no data
 * behind it is left out.
 *
 * The name is a signature on the colophon, not a masthead: it sits with
 * the columns instead of filling the width above them.
 *
 * The platform attribution arrives as a finished element and is rendered on
 * the copyright line: the theme places it, it cannot remove or alter it.
 */
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import type { ThemeFooterProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  FooterEmail,
  renderFooterHomeLink,
  renderFooterLink,
  renderFooterSocialLink,
  telHref,
  useWebsiteFooterModel,
} from '@/features/website/renderer/website-footer.model';
import '../atelier-pages.css';

/** Names longer than this set a size smaller still, so they stay a signature, not a banner. */
const COLOPHON_LONG_NAME = 24;

function FooterColumn({
  title,
  children,
  wide = false,
}: {
  readonly title: string;
  readonly children: (titleId: string) => ReactNode;
  readonly wide?: boolean;
}): JSX.Element {
  const titleId = useId();
  return (
    <div className={cn('min-w-0', wide && 'col-span-2 md:col-span-1')}>
      <p id={titleId} className="at-label mb-4">
        {title}
      </p>
      {children(titleId)}
    </div>
  );
}

export function AtelierFooter(props: ThemeFooterProps): JSX.Element {
  const { t } = useTranslation();
  const model = useWebsiteFooterModel(props);
  const { name, logo, description, groups, contact, social, copyright } = model;

  return (
    <footer data-env="deep" className="atp-footer" data-atelier-footer="">
      <div className="at-container">
        <hr className="at-rule mb-10 md:mb-14" />
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(16rem,1.1fr)_minmax(0,2.9fr)]">
          <div className="flex min-w-0 flex-col items-start gap-5">
            {logo ? (
              <img
                src={logo}
                alt=""
                aria-hidden
                className="h-10 w-auto max-w-[12rem] object-contain"
              />
            ) : null}
            <p
              className="atp-colophon-name"
              dir="auto"
              data-length={
                name.length > COLOPHON_LONG_NAME ? 'long' : undefined
              }
            >
              {renderFooterHomeLink(model, name, undefined, props)}
            </p>
            {description ? (
              <p className="atp-colophon-desc" dir="auto">
                {description}
              </p>
            ) : null}
            {social.length > 0 ? (
              <ul
                className="atp-footer-social"
                aria-label={t('website:chrome.social')}
              >
                {social.map((link) => (
                  <li key={link.key}>
                    {renderFooterSocialLink(
                      link,
                      'atp-footer-social-link',
                      'size-[1.0625rem]',
                      props
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {groups.length > 0 || contact ? (
            <nav
              className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]"
              aria-label={t('website:chrome.footerNavigation')}
            >
              {groups.map((group) => (
                <FooterColumn key={group.key} title={group.title}>
                  {(titleId) => (
                    <ul
                      className="flex flex-col gap-1"
                      aria-labelledby={titleId}
                    >
                      {group.links.map((link) => (
                        <li key={link.key}>
                          {renderFooterLink(link, 'atp-footer-link', props)}
                        </li>
                      ))}
                    </ul>
                  )}
                </FooterColumn>
              ))}

              {contact ? (
                <FooterColumn title={t('website:chrome.contact')} wide>
                  {(titleId) => (
                    <ul
                      className="flex flex-col gap-1"
                      aria-labelledby={titleId}
                    >
                      {contact.email ? (
                        <li>
                          <a
                            href={`mailto:${contact.email}`}
                            className="atp-footer-link"
                            dir="ltr"
                          >
                            <FooterEmail email={contact.email} />
                          </a>
                        </li>
                      ) : null}
                      {contact.phone ? (
                        <li>
                          <a
                            href={telHref(contact.phone)}
                            className="atp-footer-link"
                            dir="ltr"
                          >
                            {contact.phone}
                          </a>
                        </li>
                      ) : null}
                      {contact.address ? (
                        <li className="pt-2 text-[0.9375rem] text-[var(--atelier-text-muted)]">
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
          data-testid="website-footer-legal"
          className="mt-14 flex flex-col items-center gap-x-6 gap-y-2 border-t border-[var(--atelier-hairline)] pt-6 sm:flex-row sm:flex-wrap sm:justify-between"
        >
          <p className="text-center text-xs text-[var(--atelier-text-muted)] sm:text-start">
            {copyright}
          </p>
          {props.attribution}
        </div>
      </div>
    </footer>
  );
}
