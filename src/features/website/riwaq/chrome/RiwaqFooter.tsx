/**
 * Riwaq footer (plan §4, chrome): the deep ground. The content is the
 * shared footer (`useWebsiteFooterModel`): the crest (or logo), the
 * academy's name, its own description and its social marks, on the start
 * of the page grid; the link groups (the Owner's, Learning, departments,
 * Help) and the contact details on the rest; the copyright line carries the
 * platform attribution the chrome hands in (never removable). Anything with
 * no data behind it is left out. Only resolvable links on the public site;
 * every link in previews.
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
import { RiwaqBand, RiwaqCrest } from '../riwaq-parts';
import '../riwaq-pages.css';

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
    <div className="rwc-foot-col" data-wide={wide ? '' : undefined}>
      <p id={titleId} className="rw-label">
        {title}
      </p>
      {children(titleId)}
    </div>
  );
}

export function RiwaqFooter(props: ThemeFooterProps): JSX.Element {
  const { t } = useTranslation();
  const model = useWebsiteFooterModel(props, {
    categories: t('website:riwaq.chrome.departments'),
  });
  const { name, logo, description, groups, contact, social, copyright } = model;

  return (
    <RiwaqBand as="footer" ground="deep" className="rwc-foot">
      <div className="rw-grid">
        <div className="rwc-foot-id">
          {logo ? (
            <img src={logo} alt="" aria-hidden className="rwc-foot-logo" />
          ) : (
            <RiwaqCrest name={name} size="4rem" />
          )}
          <p
            className="rwc-foot-name"
            dir="auto"
            data-length={name.length > LONG_NAME ? 'long' : undefined}
          >
            {renderFooterHomeLink(model, name, undefined, props)}
          </p>
          {description ? (
            <p className="rwc-foot-desc" dir="auto">
              {description}
            </p>
          ) : null}
          {social.length > 0 ? (
            <ul
              className="rwc-foot-social"
              aria-label={t('website:chrome.social')}
            >
              {social.map((link) => (
                <li key={link.key}>
                  {renderFooterSocialLink(
                    link,
                    'rwc-foot-social-link',
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
            className="rwc-foot-cols"
            aria-label={t('website:chrome.footerNavigation')}
          >
            {groups.map((group) => (
              <FooterColumn key={group.key} title={group.title}>
                {(titleId) => (
                  <ul aria-labelledby={titleId}>
                    {group.links.map((link) => (
                      <li key={link.key}>
                        {renderFooterLink(link, 'rwc-foot-link', props)}
                      </li>
                    ))}
                  </ul>
                )}
              </FooterColumn>
            ))}
            {contact ? (
              <FooterColumn
                title={t('website:riwaq.chrome.contactColumn')}
                wide
              >
                {(titleId) => (
                  <ul aria-labelledby={titleId}>
                    {contact.email ? (
                      <li>
                        <a
                          href={`mailto:${contact.email}`}
                          className="rwc-foot-link"
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
                          className="rwc-foot-link"
                          dir="ltr"
                        >
                          {contact.phone}
                        </a>
                      </li>
                    ) : null}
                    {contact.address ? (
                      <li className="rwc-foot-address">
                        <span dir="auto">{contact.address}</span>
                      </li>
                    ) : null}
                  </ul>
                )}
              </FooterColumn>
            ) : null}
          </nav>
        ) : null}

        <div data-testid="website-footer-legal" className="rwc-foot-legal">
          <p>{copyright}</p>
          {props.attribution}
        </div>
      </div>
    </RiwaqBand>
  );
}
