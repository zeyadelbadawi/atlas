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
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
import { AtelierChapter, AtelierSectionHeader } from '../atelier-parts';
import '../atelier-pages.css';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export function AtelierContact({
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
              {state === 'success' ? (
                <div
                  role="status"
                  data-contact-success=""
                  className="flex min-h-[20rem] flex-col items-start justify-center gap-5"
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
                    onClick={() => setState('idle')}
                  >
                    {t('website:atelier.pages.contact.sendAnother')}
                  </button>
                </div>
              ) : (
                <form className="space-y-8" onSubmit={onSubmit}>
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
                      <label
                        htmlFor={`${fieldId}-name`}
                        className="atp-field-label"
                      >
                        {t('website:renderer.contactNameLabel')}
                      </label>
                      <input
                        id={`${fieldId}-name`}
                        name="name"
                        autoComplete="name"
                        maxLength={CONTACT_NAME_MAX_LENGTH}
                        required
                        className="atp-field"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${fieldId}-email`}
                        className="atp-field-label"
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
                        className="atp-field text-start"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor={`${fieldId}-message`}
                      className="atp-field-label"
                    >
                      {t('website:renderer.contactMessageLabel')}
                    </label>
                    <textarea
                      id={`${fieldId}-message`}
                      name="message"
                      rows={6}
                      maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                      required
                      className="atp-field"
                    />
                  </div>
                  {/* Spam trap: out of sight, out of the tab order and hidden
                      from assistive tech, so only a bot fills it in. */}
                  <div aria-hidden className="atp-trap">
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
                    <p role="alert" className="atp-error text-sm">
                      {t('website:renderer.contactError')}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    className="at-btn at-btn-lg"
                    disabled={state === 'submitting'}
                  >
                    {state === 'submitting' ? (
                      <Loader2
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                    ) : null}
                    {t('website:renderer.contactSubmit')}
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
