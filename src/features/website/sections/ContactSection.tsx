/**
 * Contact Section.
 *
 * `showForm` renders a real, accessible contact form — submission wiring
 * is left to the future backend contract (`WebsitePage`'s `contact`
 * section carries no submission endpoint of its own; the form's `onSubmit`
 * intentionally does nothing beyond preventing navigation, since no
 * contact-message backend contract exists yet — see
 * `Reports/ARCHITECTURE.md`, Prompt 9, "No Fake Backend"). The form is
 * rendered so the layout/experience is real and reviewable; it is
 * deliberately not wired to a fake success message.
 */
import { useTranslation } from 'react-i18next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useWebsiteContainerClass, useWebsiteHeadingClass, useWebsiteSectionClass } from '../renderer/renderer-style.utils';
import type { ContactSectionConfig } from '@types';

export interface ContactSectionProps {
  readonly config: ContactSectionConfig;
}

export function ContactSection({ config }: ContactSectionProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();

  return (
    <section className={`${container} ${section}`}>
      {(config.title || config.description) && (
        <div className="mb-10 space-y-2 text-center">
          {config.title ? <h2 className={`${heading} text-3xl text-foreground`}>{config.title}</h2> : null}
          {config.description ? (
            <p className="mx-auto max-w-2xl text-muted-foreground">{config.description}</p>
          ) : null}
        </div>
      )}
      <div className={`grid gap-10 ${config.showForm ? 'lg:grid-cols-2' : ''}`}>
        <dl className="space-y-4">
          {config.email ? (
            <div className="flex items-center gap-3">
              <Mail className="size-5 text-[var(--website-primary-solid)]" aria-hidden />
              <dd className="text-sm text-foreground">{config.email}</dd>
            </div>
          ) : null}
          {config.phone ? (
            <div className="flex items-center gap-3">
              <Phone className="size-5 text-[var(--website-primary-solid)]" aria-hidden />
              <dd className="text-sm text-foreground">{config.phone}</dd>
            </div>
          ) : null}
          {config.address ? (
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-[var(--website-primary-solid)]" aria-hidden />
              <dd className="text-sm text-foreground">{config.address}</dd>
            </div>
          ) : null}
        </dl>
        {config.showForm ? (
          <form
            className="space-y-4"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="space-y-1.5">
              <Label htmlFor="website-contact-name">{t('website:renderer.contactNameLabel')}</Label>
              <Input id="website-contact-name" name="name" autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website-contact-email">{t('website:renderer.contactEmailLabel')}</Label>
              <Input id="website-contact-email" name="email" type="email" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website-contact-message">{t('website:renderer.contactMessageLabel')}</Label>
              <Textarea id="website-contact-message" name="message" rows={4} />
            </div>
            <Button type="submit">{t('website:renderer.contactSubmit')}</Button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
