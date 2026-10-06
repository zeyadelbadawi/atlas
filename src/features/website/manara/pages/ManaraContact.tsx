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
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { cn } from '@utils';
import { useAcademyIdentity } from '@hooks';
import { publicWebsiteService } from '@services';
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
} from '@/features/website/constants/website.constants';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { Reveal } from '@/features/website/primitives';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import { ManaraArrow, ManaraBlock, ManaraSectionHeader } from '../manara-parts';
import '../manara-pages.css';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

/** Each channel on its own dyed tile: brand, accent, night. */
const CHANNEL_TONES = ['block', 'accent', 'night'] as const;

export function ManaraContact({
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
              {state === 'success' ? (
                <div
                  role="status"
                  data-contact-success=""
                  className="flex min-h-[20rem] flex-col items-start justify-center gap-4"
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
                    onClick={() => setState('idle')}
                  >
                    {t('website:manara.pages.contact.sendAnother')}
                  </button>
                </div>
              ) : (
                <form className="grid gap-6" onSubmit={onSubmit}>
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
                      <label
                        htmlFor={`${fieldId}-name`}
                        className="mn-field-label"
                      >
                        {t('website:renderer.contactNameLabel')}
                      </label>
                      <input
                        id={`${fieldId}-name`}
                        name="name"
                        autoComplete="name"
                        maxLength={CONTACT_NAME_MAX_LENGTH}
                        required
                        className="mn-input"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${fieldId}-email`}
                        className="mn-field-label"
                      >
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
                        className="mn-input text-start"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor={`${fieldId}-message`}
                      className="mn-field-label"
                    >
                      {t('website:renderer.contactMessageLabel')}
                    </label>
                    <textarea
                      id={`${fieldId}-message`}
                      name="message"
                      rows={6}
                      maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                      required
                      className="mn-input"
                    />
                  </div>
                  {/* Spam trap: out of sight, out of the tab order and hidden
                      from assistive tech, so only a bot fills it in. */}
                  <div aria-hidden className="mnp-trap">
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
                    <p role="alert" className="mnp-error text-sm">
                      {t('website:renderer.contactError')}
                    </p>
                  ) : null}
                  <div>
                    <button
                      type="submit"
                      className="mn-btn mn-btn-lg"
                      disabled={state === 'submitting'}
                    >
                      {state === 'submitting' ? (
                        <Loader2
                          className="size-4 animate-spin motion-reduce:animate-none"
                          aria-hidden
                        />
                      ) : null}
                      {t('website:renderer.contactSubmit')}
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
