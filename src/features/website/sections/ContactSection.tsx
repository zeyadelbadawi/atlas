/**
 * Contact Section.
 *
 * Phase 6 — two things changed from the original "no fake backend" draft:
 *
 * 1. `config.email`/`phone`/`address` are now OPTIONAL overrides, not the
 *    only source: when a field is left blank, it falls back to the
 *    Academy's own real, structured contact info (`useAcademyIdentity`) —
 *    the same single source `WebsiteChrome`'s header/footer resolve from
 *    — so Contact info is never duplicated per-section by default.
 * 2. The form now really submits, via `POST public/websites/:academyId/
 *    contact` — persisted for real (`ContactSubmission`), never a
 *    console-log or a fake success message.
 */
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAcademyIdentity } from '@hooks';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { useContactForm } from './contact/useContactForm';
import { contactSectionDescription } from './contact/contact-form.logic';
import {
  ContactFailureAlert,
  ContactFieldFeedback,
  ContactRequiredNote,
  useContactSubmitLabel,
} from './contact/ContactFormParts';
import type { ContactSectionConfig } from '@types';

export interface ContactSectionProps {
  readonly config: ContactSectionConfig;
  readonly academyId: string;
}

export function ContactSection({
  config,
  academyId,
}: ContactSectionProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { data: identity } = useAcademyIdentity(academyId);
  const contact = useContactForm(academyId);
  const submitLabel = useContactSubmitLabel(contact.isSending);
  const { locale } = usePublicWebsiteLocale();
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

  const description = contactSectionDescription(
    resolveLocalizedText(config.description, locale),
    !!(email || phone || address)
  );
  const nameField = contact.field('name');
  const emailField = contact.field('email');
  const messageField = contact.field('message');
  const feedbackClasses = {
    errorClassName: 'text-destructive',
    countClassName: 'text-muted-foreground',
  };

  return (
    <section className={`${container} ${section}`}>
      {(title || description) && (
        <div className="mb-10 space-y-2 text-center">
          {title ? (
            <h2 className={`${heading} text-3xl text-foreground`}>{title}</h2>
          ) : null}
          {description ? (
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      )}
      <div className={`grid gap-10 ${config.showForm ? 'lg:grid-cols-2' : ''}`}>
        <dl className="min-w-0 space-y-4">
          {/* `dir="ltr"` on email/phone — always effectively Latin/numeral
              tokens regardless of page direction; `dir="auto"` on address,
              which (unlike email/phone) can genuinely be authored in
              Arabic. All three are plain strings, never `LocalizedText` —
              see `FeaturedCoursesSection`'s identical comment for why this
              matters inside an RTL page. */}
          {email ? (
            <div className="flex items-center gap-3">
              <Mail
                className="size-5 shrink-0 text-[var(--website-primary-solid)]"
                aria-hidden
              />
              <dd
                className="min-w-0 break-words text-sm text-foreground"
                dir="ltr"
              >
                {email}
              </dd>
            </div>
          ) : null}
          {phone ? (
            <div className="flex items-center gap-3">
              <Phone
                className="size-5 shrink-0 text-[var(--website-primary-solid)]"
                aria-hidden
              />
              <dd
                className="min-w-0 break-words text-sm text-foreground"
                dir="ltr"
              >
                {phone}
              </dd>
            </div>
          ) : null}
          {address ? (
            <div className="flex items-center gap-3">
              <MapPin
                className="size-5 shrink-0 text-[var(--website-primary-solid)]"
                aria-hidden
              />
              <dd
                className="min-w-0 break-words text-sm text-foreground"
                dir="auto"
              >
                {address}
              </dd>
            </div>
          ) : null}
        </dl>
        {config.showForm ? (
          contact.status === 'sent' ? (
            <div
              ref={contact.successRef}
              role="status"
              tabIndex={-1}
              data-contact-success=""
              className="space-y-3 outline-none"
            >
              <p className="text-sm text-success">
                {t('website:renderer.contactSuccess')}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={contact.sendAnother}
              >
                {t('website:theme1.contact.sendAnother')}
              </Button>
            </div>
          ) : (
            <form
              className="relative space-y-4"
              noValidate
              onSubmit={contact.onSubmit}
            >
              <ContactRequiredNote className="text-sm text-muted-foreground" />
              <div className="space-y-1.5">
                <Label htmlFor={nameField.id}>
                  {t('website:renderer.contactNameLabel')}
                </Label>
                <Input {...nameField.controlProps} autoComplete="name" />
                <ContactFieldFeedback field={nameField} {...feedbackClasses} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={emailField.id}>
                  {t('website:renderer.contactEmailLabel')}
                </Label>
                <Input
                  {...emailField.controlProps}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  dir="ltr"
                  className="text-start"
                />
                <ContactFieldFeedback field={emailField} {...feedbackClasses} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={messageField.id}>
                  {t('website:renderer.contactMessageLabel')}
                </Label>
                <Textarea {...messageField.controlProps} rows={4} />
                <ContactFieldFeedback
                  field={messageField}
                  {...feedbackClasses}
                />
              </div>
              {/* Spam trap: out of sight, out of the tab order and hidden
                  from assistive tech, so only a bot fills it in. Same field
                  as every theme's contact form. */}
              <div
                aria-hidden
                className="pointer-events-none absolute -start-[10000px] size-px overflow-hidden"
              >
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
                className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-foreground"
                retryClassName="text-sm font-medium underline underline-offset-4"
              />
              <Button type="submit" disabled={contact.isSending}>
                {contact.isSending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {submitLabel}
              </Button>
            </form>
          )
        ) : null}
      </div>
    </section>
  );
}
