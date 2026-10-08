/**
 * Manara footer (Reports/THEME_3_MANARA_PLAN.md §3.11): a night block with
 * a slanted seam against the page above. The content is the shared footer
 * (`useWebsiteFooterModel`): the academy's identity — logo, name, its own
 * description, its social marks — beside the link groups (the Owner's,
 * Learning, top categories, Help) and its contact details, then the
 * copyright line. Anything with no data behind it is left out.
 *
 * The name is an identity mark here, set in the display face at a size
 * that sits with the columns — not the banner it used to be.
 *
 * The platform attribution arrives as a finished element and is rendered
 * on the copyright line: the theme places it, it cannot remove or alter it.
 */
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThemeFooterProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  FooterEmail,
  renderFooterHomeLink,
  renderFooterLink,
  renderFooterSocialLink,
  telHref,
  useWebsiteFooterModel,
} from '@/features/website/renderer/website-footer.model';
import { ManaraBlock } from '../manara-parts';
import '../manara-pages.css';

/** Names longer than this set a size smaller still. */
const LONG_NAME = 24;

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
    <div className="mnp-footer-col" data-wide={wide ? '' : undefined}>
      <p id={titleId} className="mn-label mn-muted mb-3">
        {title}
      </p>
      {children(titleId)}
    </div>
  );
}

export function ManaraFooter(props: ThemeFooterProps): JSX.Element {
  const { t } = useTranslation();
  const model = useWebsiteFooterModel(props);
  const { name, logo, description, groups, contact, social, copyright } = model;

  return (
    <ManaraBlock as="footer" env="night" seamTop className="mnp-footer">
      <div className="mnp-footer-top">
        <div className="mnp-footer-id">
          {logo ? (
            <img
              src={logo}
              alt=""
              aria-hidden
              className="h-10 w-auto max-w-[12rem] object-contain"
            />
          ) : null}
          <p
            className="mnp-footer-name"
            dir="auto"
            data-length={name.length > LONG_NAME ? 'long' : undefined}
          >
            {renderFooterHomeLink(model, name, undefined, props)}
          </p>
          {description ? (
            <p className="mnp-footer-desc" dir="auto">
              {description}
            </p>
          ) : null}
          {social.length > 0 ? (
            <ul
              className="mnp-footer-social"
              aria-label={t('website:chrome.social')}
            >
              {social.map((link) => (
                <li key={link.key}>
                  {renderFooterSocialLink(
                    link,
                    'mnp-footer-social-link',
                    'size-[1.125rem]',
                    props
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {groups.length > 0 || contact ? (
          <nav
            className="mnp-footer-columns"
            aria-label={t('website:chrome.footerNavigation')}
          >
            {groups.map((group) => (
              <FooterColumn key={group.key} title={group.title}>
                {(titleId) => (
                  <ul className="flex flex-col" aria-labelledby={titleId}>
                    {group.links.map((link) => (
                      <li key={link.key}>
                        {renderFooterLink(link, 'mnp-footer-link', props)}
                      </li>
                    ))}
                  </ul>
                )}
              </FooterColumn>
            ))}

            {contact ? (
              <FooterColumn
                title={t('website:manara.chrome.contactColumn')}
                wide
              >
                {(titleId) => (
                  <ul className="flex flex-col" aria-labelledby={titleId}>
                    {contact.email ? (
                      <li>
                        <a
                          href={`mailto:${contact.email}`}
                          className="mnp-footer-link"
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
                          className="mnp-footer-link"
                          dir="ltr"
                        >
                          {contact.phone}
                        </a>
                      </li>
                    ) : null}
                    {contact.address ? (
                      <li className="mn-muted pt-2 text-[0.9375rem] leading-relaxed">
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

      <div data-testid="website-footer-legal" className="mnp-footer-legal">
        <p>{copyright}</p>
        {props.attribution}
      </div>
    </ManaraBlock>
  );
}
