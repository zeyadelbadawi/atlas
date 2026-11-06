/**
 * Manara contact (Reports/THEME_3_MANARA_PLAN.md §3.11, `contact`): the
 * academy's channels (email, phone, address — each actionable) as dyed
 * block tiles beside the form on a card, with bold labels, boxed fields
 * and the accent submit.
 *
 * Behaviour is Theme 1's: the channels come from the section, else the
 * academy's own details; the submission is the existing public endpoint
 * with the same trimming, required fields, length bounds and spam trap
 * (sent only when a bot fills it); success and failure are announced, and
 * a failed send keeps the message.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { cn } from '@utils';
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
import { Reveal } from '@/features/website/primitives';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import { ManaraArrow, ManaraBlock, ManaraSectionHeader } from '../manara-parts';
import '../manara-pages.css';

/** Each channel on its own dyed tile: brand, accent, night. */
const CHANNEL_TONES = ['block', 'accent', 'night'] as const;

export function ManaraContact({
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
    [
      identity?.address?.street,
      identity?.address?.city,
      identity?.address?.country,
    ]
      .filter(Boolean)
      .join(', ') ||
    undefined;

  const channels = [
    email
      ? {
          key: 'email',
          Icon: Mail,
          label: t('website:manara.pages.contact.emailLabel'),
          value: email,
          href: `mailto:${email}`,
          dir: 'ltr' as const,
        }
      : null,
    phone
      ? {
          key: 'phone',
          Icon: Phone,
          label: t('website:manara.pages.contact.phoneLabel'),
          value: phone,
          href: `tel:${phone.replace(/[^\d+]/g, '')}`,
          dir: 'ltr' as const,
        }
      : null,
    address
      ? {
          key: 'address',
          Icon: MapPin,
          label: t('website:manara.pages.contact.addressLabel'),
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
    <ManaraBlock labelledBy={title ? headingId : undefined}>
      <div
        className={cn(
          'grid gap-10',
          config.showForm && 'lg:grid-cols-12 lg:gap-10'
        )}
      >
        <div className={cn('min-w-0', config.showForm && 'lg:col-span-5')}>
          <ManaraSectionHeader
            id={headingId}
            title={title}
            description={description}
            className="!mb-8"
          />
          {channels.length > 0 ? (
            <div>
              <p className="mn-label mn-muted mb-3">
                {t('website:manara.pages.contact.channels')}
              </p>
              <dl className="mnp-channels" data-manara-channels="">
                {channels.map(
                  ({ key, Icon, label, value, href, dir }, index) => (
                    <div
                      key={key}
                      className="mn-tile mnp-channel"
                      data-tone={CHANNEL_TONES[index % CHANNEL_TONES.length]}
                    >
                      <dt className="flex items-center gap-2">
                        <Icon
                          className="size-4"
                          strokeWidth={2.25}
                          aria-hidden
                        />
                        {label}
                      </dt>
                      <dd>
                        {href ? (
                          <a href={href} dir={dir}>
                            {value}
                          </a>
                        ) : (
                          <span dir={dir}>{value}</span>
                        )}
                      </dd>
                    </div>
                  )
                )}
              </dl>
            </div>
          ) : null}
        </div>

        {config.showForm ? (
          <Reveal className="min-w-0 lg:col-span-7">
            <div className="mn-card mnp-form">
              {contact.status === 'sent' ? (
                <div
                  ref={contact.successRef}
                  role="status"
                  tabIndex={-1}
                  data-contact-success=""
                  className="flex min-h-[20rem] flex-col items-start justify-center gap-4 outline-none"
                >
                  <p className="mn-title">
                    {t('website:manara.pages.contact.successTitle')}
                  </p>
                  <p className="mn-lead mn-muted">
                    {t('website:renderer.contactSuccess')}
                  </p>
                  <button
                    type="button"
                    className="mn-btn mn-btn-outline mt-2"
                    onClick={contact.sendAnother}
                  >
                    {t('website:manara.pages.contact.sendAnother')}
                  </button>
                </div>
              ) : (
                <form
                  className="grid gap-6"
                  noValidate
                  onSubmit={contact.onSubmit}
                >
                  <div className="grid gap-1">
                    <p className="mn-subtitle">
                      {t('website:manara.pages.contact.formTitle')}
                    </p>
                    <p className="mn-muted text-sm">
                      {t('website:manara.pages.contact.formNote')}
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor={nameField.id} className="mn-field-label">
                        {t('website:renderer.contactNameLabel')}
                      </label>
                      <input
                        {...nameField.controlProps}
                        autoComplete="name"
                        className="mn-input"
                      />
                      <ContactFieldFeedback
                        field={nameField}
                        errorClassName="mnp-error"
                        countClassName="mn-muted"
                      />
                    </div>
                    <div>
                      <label htmlFor={emailField.id} className="mn-field-label">
                        {t('website:renderer.contactEmailLabel')}
                      </label>
                      <input
                        {...emailField.controlProps}
                        type="email"
                        autoComplete="email"
                        dir="ltr"
                        className="mn-input text-start"
                      />
                      <ContactFieldFeedback
                        field={emailField}
                        errorClassName="mnp-error"
                        countClassName="mn-muted"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={messageField.id} className="mn-field-label">
                      {t('website:renderer.contactMessageLabel')}
                    </label>
                    <textarea
                      {...messageField.controlProps}
                      rows={6}
                      className="mn-input"
                    />
                    <ContactFieldFeedback
                      field={messageField}
                      errorClassName="mnp-error"
                      countClassName="mn-muted"
                    />
                  </div>
                  {/* Spam trap: out of sight, out of the tab order and hidden
                      from assistive tech, so only a bot fills it in. */}
                  <div aria-hidden className="mnp-trap">
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
                    className="mnp-error"
                    retryClassName="mn-btn mn-btn-outline mt-1"
                  />
                  <div>
                    <button
                      type="submit"
                      className="mn-btn mn-btn-lg"
                      disabled={contact.isSending}
                    >
                      {contact.isSending ? (
                        <Loader2
                          className="size-4 animate-spin motion-reduce:animate-none"
                          aria-hidden
                        />
                      ) : null}
                      {submitLabel}
                      <ManaraArrow />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>
        ) : null}
      </div>
    </ManaraBlock>
  );
}
