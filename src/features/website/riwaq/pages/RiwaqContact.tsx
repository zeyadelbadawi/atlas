/**
 * Riwaq contact (plan §4, `contact`): the channels as a datasheet (a ruled
 * definition table) in the start columns, the form as a ruled cell beside
 * it. The channels fall back to the academy's identity when the section
 * names none; the form posts to the shared public endpoint with the same
 * hidden spam trap as every theme.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { useAcademyIdentity } from '@hooks';
import { publicWebsiteService } from '@services';
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
} from '@/features/website/constants/website.constants';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import { RiwaqArrow, RiwaqBand, RiwaqHeading } from '../riwaq-parts';
import '../riwaq-pages.css';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export function RiwaqContact({
  config,
  academyId,
}: SectionRenderProps<'contact'>): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const fieldId = useId();
  const { data: identity } = useAcademyIdentity(academyId);
  const [state, setState] = useState<SubmitState>('idle');
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);
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

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const submitterEmail = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    const company = String(data.get('company') ?? '').trim();
    if (!name || !submitterEmail || !message) return;
    setState('submitting');
    try {
      await publicWebsiteService.submitContactMessage(academyId, {
        name,
        email: submitterEmail,
        message,
        // Sent only when filled — i.e. by a bot (see the field below).
        ...(company ? { company } : {}),
      });
      setState('success');
      form.reset();
    } catch {
      setState('error');
    }
  };

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
            {state === 'success' ? (
              <div role="status" data-contact-success="" className="rwp-form-done">
                <p className="rw-title">{t('website:riwaq.pages.contact.successTitle')}</p>
                <p className="rw-lead">{t('website:renderer.contactSuccess')}</p>
                <button type="button" className="rw-btn rw-btn-line" onClick={() => setState('idle')}>
                  {t('website:riwaq.pages.contact.sendAnother')}
                </button>
              </div>
            ) : (
              <form className="rwp-form-grid" onSubmit={onSubmit}>
                <div className="rwp-form-head">
                  <p className="rw-subtitle">{t('website:riwaq.pages.contact.formTitle')}</p>
                  <p className="rw-body">{t('website:riwaq.pages.contact.formNote')}</p>
                </div>
                <div className="rwp-field">
                  <label htmlFor={`${fieldId}-name`} className="rw-label">
                    {t('website:renderer.contactNameLabel')}
                  </label>
                  <input
                    id={`${fieldId}-name`}
                    name="name"
                    autoComplete="name"
                    maxLength={CONTACT_NAME_MAX_LENGTH}
                    required
                    className="rw-input"
                  />
                </div>
                <div className="rwp-field">
                  <label htmlFor={`${fieldId}-email`} className="rw-label">
                    {t('website:renderer.contactEmailLabel')}
                  </label>
                  <input
                    id={`${fieldId}-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={CONTACT_EMAIL_MAX_LENGTH}
                    required
                    dir="ltr"
                    className="rw-input text-start"
                  />
                </div>
                <div className="rwp-field rwp-field-wide">
                  <label htmlFor={`${fieldId}-message`} className="rw-label">
                    {t('website:renderer.contactMessageLabel')}
                  </label>
                  <textarea
                    id={`${fieldId}-message`}
                    name="message"
                    rows={6}
                    maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                    required
                    className="rw-input"
                  />
                </div>
                {/* Spam trap: out of sight, out of the tab order and hidden
                    from assistive tech, so only a bot fills it in. */}
                <div aria-hidden className="rwp-trap">
                  <label htmlFor={`${fieldId}-company`}>Company</label>
                  <input
                    id={`${fieldId}-company`}
                    name="company"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    defaultValue=""
                  />
                </div>
                {state === 'error' ? (
                  <p role="alert" className="rwp-error rwp-field-wide">
                    {t('website:renderer.contactError')}
                  </p>
                ) : null}
                <div className="rwp-field-wide">
                  <button type="submit" className="rw-btn rw-btn-lg" disabled={state === 'submitting'}>
                    {state === 'submitting' ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : null}
                    {t('website:renderer.contactSubmit')}
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
