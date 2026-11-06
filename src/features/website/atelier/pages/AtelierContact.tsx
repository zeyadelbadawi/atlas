/**
 * Atelier contact (Reports/THEME_2_ATELIER_PLAN.md §5a, `contact`): a
 * letter. The title and the academy's channels (email, phone, address —
 * each actionable) form a colophon column; the form is the letter itself,
 * underlined fields with their labels above.
 *
 * Behaviour is Theme 1's: the channels come from the section, else the
 * academy's own details; the submission is the existing public endpoint
 * with the same trimming, required fields, length bounds and spam trap
 * (sent only when a bot fills it); success and failure are announced, and
 * a failed send keeps the message.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
import { AtelierChapter, AtelierSectionHeader } from '../atelier-parts';
import '../atelier-pages.css';

export function AtelierContact({
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
          label: t('website:atelier.pages.contact.emailLabel'),
          value: email,
          href: `mailto:${email}`,
          dir: 'ltr' as const,
        }
      : null,
    phone
      ? {
          key: 'phone',
          label: t('website:atelier.pages.contact.phoneLabel'),
          value: phone,
          href: `tel:${phone.replace(/[^\d+]/g, '')}`,
          dir: 'ltr' as const,
        }
      : null,
    address
      ? {
          key: 'address',
          label: t('website:atelier.pages.contact.addressLabel'),
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
    <AtelierChapter labelledBy={title ? headingId : undefined}>
      <div
        className={cn(
          'grid gap-14',
          config.showForm && 'lg:grid-cols-12 lg:gap-10'
        )}
      >
        <div className={cn('min-w-0', config.showForm && 'lg:col-span-5')}>
          <AtelierSectionHeader
            id={headingId}
            title={title}
            description={description}
            numbered={false}
            className="!mb-10"
          />
          {channels.length > 0 ? (
            <div>
              <p className="at-label mb-4">
                {t('website:atelier.pages.contact.channels')}
              </p>
              <dl className="atp-channels" data-atelier-channels="">
                {channels.map(({ key, label, value, href, dir }) => (
                  <div key={key}>
                    <dt className="at-label">{label}</dt>
                    <dd className="mt-1.5">
                      {href ? (
                        <a
                          href={href}
                          dir={dir}
                          className="at-serif at-link break-all text-xl"
                        >
                          {value}
                        </a>
                      ) : (
                        <span
                          dir={dir}
                          className="at-serif break-words text-xl"
                        >
                          {value}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>

        {config.showForm ? (
          <Reveal className="min-w-0 lg:col-span-6 lg:col-start-7">
            <div className="atp-letter">
              {contact.status === 'sent' ? (
                <div
                  ref={contact.successRef}
                  role="status"
                  tabIndex={-1}
                  data-contact-success=""
                  className="flex min-h-[20rem] flex-col items-start justify-center gap-5 outline-none"
                >
                  <p className="at-subtitle">
                    {t('website:atelier.pages.contact.successTitle')}
                  </p>
                  <p className="at-lead">
                    {t('website:renderer.contactSuccess')}
                  </p>
                  <button
                    type="button"
                    className="at-btn-ghost mt-2"
                    onClick={contact.sendAnother}
                  >
                    {t('website:atelier.pages.contact.sendAnother')}
                  </button>
                </div>
              ) : (
                <form
                  className="space-y-8"
                  noValidate
                  onSubmit={contact.onSubmit}
                >
                  <div className="space-y-2">
                    <p className="at-subtitle">
                      {t('website:atelier.pages.contact.formTitle')}
                    </p>
                    <p className="text-sm text-[var(--atelier-text-muted)]">
                      {t('website:atelier.pages.contact.formNote')}
                    </p>
                  </div>
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                      <label htmlFor={nameField.id} className="atp-field-label">
                        {t('website:renderer.contactNameLabel')}
                      </label>
                      <input
                        {...nameField.controlProps}
                        autoComplete="name"
                        className="atp-field"
                      />
                      <ContactFieldFeedback
                        field={nameField}
                        errorClassName="atp-error"
                        countClassName="text-[var(--atelier-text-muted)]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={emailField.id}
                        className="atp-field-label"
                      >
                        {t('website:renderer.contactEmailLabel')}
                      </label>
                      <input
                        {...emailField.controlProps}
                        type="email"
                        autoComplete="email"
                        dir="ltr"
                        className="atp-field text-start"
                      />
                      <ContactFieldFeedback
                        field={emailField}
                        errorClassName="atp-error"
                        countClassName="text-[var(--atelier-text-muted)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor={messageField.id}
                      className="atp-field-label"
                    >
                      {t('website:renderer.contactMessageLabel')}
                    </label>
                    <textarea
                      {...messageField.controlProps}
                      rows={6}
                      className="atp-field"
                    />
                    <ContactFieldFeedback
                      field={messageField}
                      errorClassName="atp-error"
                      countClassName="text-[var(--atelier-text-muted)]"
                    />
                  </div>
                  {/* Spam trap: out of sight, out of the tab order and hidden
                      from assistive tech, so only a bot fills it in. */}
                  <div aria-hidden className="atp-trap">
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
                    className="atp-error"
                    retryClassName="at-btn-ghost mt-1"
                  />
                  <button
                    type="submit"
                    className="at-btn at-btn-lg"
                    disabled={contact.isSending}
                  >
                    {contact.isSending ? (
                      <Loader2
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                    ) : null}
                    {submitLabel}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        ) : null}
      </div>
    </AtelierChapter>
  );
}
