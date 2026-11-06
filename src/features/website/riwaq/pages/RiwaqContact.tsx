/**
 * Riwaq contact (plan §4, `contact`): the channels as a datasheet (a ruled
 * definition table) in the start columns, the form as a ruled cell beside
 * it. The channels fall back to the academy's identity when the section
 * names none; the form posts to the shared public endpoint with the same
 * hidden spam trap as every theme.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { useAcademyIdentity } from '@hooks';
import { useContactForm } from '@/features/website/sections/contact/useContactForm';
import { contactSectionDescription } from '@/features/website/sections/contact/contact-form.logic';
import {
  ContactFailureAlert,
  ContactFieldFeedback,
  useContactSubmitLabel,
} from '@/features/website/sections/contact/ContactFormParts';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import { RiwaqArrow, RiwaqBand, RiwaqHeading } from '../riwaq-parts';
import '../riwaq-pages.css';

export function RiwaqContact({
  config,
  academyId,
}: SectionRenderProps<'contact'>): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const { data: identity } = useAcademyIdentity(academyId);
  const contact = useContactForm(academyId);
  const submitLabel = useContactSubmitLabel(contact.isSending);
  const title = resolveLocalizedText(config.title, locale);
  const email = config.email || identity?.contactEmail;
  const phone = config.phone || identity?.contactPhone;
  const address =
    config.address ||
    [identity?.address?.street, identity?.address?.city, identity?.address?.country]
      .filter(Boolean)
      .join(', ') ||
    undefined;
  const channels = [
    email
      ? {
          key: 'email',
          Icon: Mail,
          label: t('website:riwaq.pages.contact.emailLabel'),
          value: email,
          href: `mailto:${email}`,
          dir: 'ltr' as const,
        }
      : null,
    phone
      ? {
          key: 'phone',
          Icon: Phone,
          label: t('website:riwaq.pages.contact.phoneLabel'),
          value: phone,
          href: `tel:${phone.replace(/[^\d+]/g, '')}`,
          dir: 'ltr' as const,
        }
      : null,
    address
      ? {
          key: 'address',
          Icon: MapPin,
          label: t('website:riwaq.pages.contact.addressLabel'),
          value: address,
          href: undefined,
          dir: 'auto' as const,
        }
      : null,
  ].filter((channel): channel is NonNullable<typeof channel> => !!channel);
  const description = contactSectionDescription(
    resolveLocalizedText(config.description, locale),
    channels.length > 0
  );
  const nameField = contact.field('name');
  const emailField = contact.field('email');
  const messageField = contact.field('message');

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:riwaq.pages.contact.label')}
    >
      <div className="rw-grid rwp-contact" data-form={config.showForm ? '' : undefined}>
        <div className="rwp-contact-info">
          <div className="rw-head-rail" />
          {title ? <RiwaqHeading id={headingId}>{title}</RiwaqHeading> : null}
          {description ? <p className="rw-lead">{description}</p> : null}
          {channels.length > 0 ? (
            <dl className="rw-facts rwp-channels" data-riwaq-channels="">
              {channels.map(({ key, Icon, label, value, href, dir }) => (
                <div key={key} className="contents">
                  <dt>
                    <Icon className="me-2 inline size-4 align-[-0.15em]" strokeWidth={1.75} aria-hidden />
                    {label}
                  </dt>
                  <dd>
                    {href ? (
                      <a href={href} dir={dir} className="rwp-channel-link">
                        {value}
                      </a>
                    ) : (
                      <span dir={dir}>{value}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {config.showForm ? (
          <div className="rw-cell rwp-form" data-tick="">
            {contact.status === 'sent' ? (
              <div ref={contact.successRef} role="status" tabIndex={-1} data-contact-success="" className="rwp-form-done outline-none">
                <p className="rw-title">{t('website:riwaq.pages.contact.successTitle')}</p>
                <p className="rw-lead">{t('website:renderer.contactSuccess')}</p>
                <button type="button" className="rw-btn rw-btn-line" onClick={contact.sendAnother}>
                  {t('website:riwaq.pages.contact.sendAnother')}
                </button>
              </div>
            ) : (
              <form className="rwp-form-grid" noValidate onSubmit={contact.onSubmit}>
                <div className="rwp-form-head">
                  <p className="rw-subtitle">{t('website:riwaq.pages.contact.formTitle')}</p>
                  <p className="rw-body">{t('website:riwaq.pages.contact.formNote')}</p>
                </div>
                <div className="rwp-field">
                  <label htmlFor={nameField.id} className="rw-label">
                    {t('website:renderer.contactNameLabel')}
                  </label>
                  <input
                    {...nameField.controlProps}
                    autoComplete="name"
                    className="rw-input"
                  />
                  <ContactFieldFeedback
                    field={nameField}
                    errorClassName="rwp-error"
                    countClassName="rw-body"
                  />
                </div>
                <div className="rwp-field">
                  <label htmlFor={emailField.id} className="rw-label">
                    {t('website:renderer.contactEmailLabel')}
                  </label>
                  <input
                    {...emailField.controlProps}
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    className="rw-input text-start"
                  />
                  <ContactFieldFeedback
                    field={emailField}
                    errorClassName="rwp-error"
                    countClassName="rw-body"
                  />
                </div>
                <div className="rwp-field rwp-field-wide">
                  <label htmlFor={messageField.id} className="rw-label">
                    {t('website:renderer.contactMessageLabel')}
                  </label>
                  <textarea
                    {...messageField.controlProps}
                    rows={6}
                    className="rw-input"
                  />
                  <ContactFieldFeedback
                    field={messageField}
                    errorClassName="rwp-error"
                    countClassName="rw-body"
                  />
                </div>
                {/* Spam trap: out of sight, out of the tab order and hidden
                    from assistive tech, so only a bot fills it in. */}
                <div aria-hidden className="rwp-trap">
                  <label htmlFor={contact.trapId}>Company</label>
                  <input
                    id={contact.trapId}
                    {...contact.register('company')}
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <ContactFailureAlert
                  contact={contact}
                  className="rwp-error rwp-field-wide"
                  retryClassName="rw-btn rw-btn-line mt-1"
                />
                <div className="rwp-field-wide">
                  <button type="submit" className="rw-btn rw-btn-lg" disabled={contact.isSending}>
                    {contact.isSending ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : null}
                    {submitLabel}
                    <RiwaqArrow />
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </RiwaqBand>
  );
}
