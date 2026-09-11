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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAcademyIdentity } from '@features/public-website/hooks';
import { publicWebsiteService } from '@features/public-website/services/PublicWebsiteService';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { ContactSectionConfig } from '@types';

export interface ContactSectionProps {
  readonly config: ContactSectionConfig;
  readonly academyId: string;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export function ContactSection({
  config,
  academyId,
}: ContactSectionProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { data: identity } = useAcademyIdentity(academyId);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const { locale } = usePublicWebsiteLocale();
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    const submitterEmail = String(formData.get('email') ?? '').trim();
    const message = String(formData.get('message') ?? '').trim();
    if (!name || !submitterEmail || !message) return;

    setSubmitState('submitting');
    try {
      await publicWebsiteService.submitContactMessage(academyId, {
        name,
        email: submitterEmail,
        message,
      });
      setSubmitState('success');
      form.reset();
    } catch {
      setSubmitState('error');
    }
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
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="website-contact-name">
                {t('website:renderer.contactNameLabel')}
              </Label>
              <Input
                id="website-contact-name"
                name="name"
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website-contact-email">
                {t('website:renderer.contactEmailLabel')}
              </Label>
              <Input
                id="website-contact-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website-contact-message">
                {t('website:renderer.contactMessageLabel')}
              </Label>
              <Textarea
                id="website-contact-message"
                name="message"
                rows={4}
                required
              />
            </div>
            <Button type="submit" disabled={submitState === 'submitting'}>
              {submitState === 'submitting' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('website:renderer.contactSubmit')}
            </Button>
            {submitState === 'success' ? (
              <p role="status" className="text-sm text-success">
                {t('website:renderer.contactSuccess')}
              </p>
            ) : null}
            {submitState === 'error' ? (
              <p role="alert" className="text-sm text-destructive">
                {t('website:renderer.contactError')}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </section>
  );
}
