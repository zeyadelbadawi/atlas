/**
 * Theme 1 contact and gallery sections (plan §C.4, §C.6).
 *
 * - **Contact:** method cards from the Academy's own details (email, phone,
 *   address, each actionable) beside the real contact form, with designed
 *   success and error states. The submission is the existing public
 *   endpoint — nothing faked.
 * - **Gallery:** a bento of five (one large, one wide and three squares)
 *   with a keyboard-friendly lightbox. Any other count is an even grid.
 *   Unreleased theme photographs show the neutral placeholder and don't
 *   open the lightbox.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MapPin,
  Phone,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@utils';
import { useAcademyIdentity } from '@hooks';
import { publicWebsiteService } from '@services';
import { ThemeImage, hasRenderableImage } from '../theme-assets';
import { PUBLIC_WEBSITE_LOCALE_DIRECTION } from '../constants/locale.constants';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import { T1ImagePlaceholder, T1Section, T1SectionHeader } from './t1-parts';

/* ------------------------------------------------------------------ */
/* Contact                                                               */
/* ------------------------------------------------------------------ */

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export function T1Contact({
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

  const methods = [
    email
      ? {
          key: 'email',
          Icon: Mail,
          label: t('website:renderer.contactEmailLabel'),
          value: email,
          href: `mailto:${email}`,
          dir: 'ltr' as const,
        }
      : null,
    phone
      ? {
          key: 'phone',
          Icon: Phone,
          label: t('website:theme1.contact.phoneLabel'),
          value: phone,
          href: `tel:${phone.replace(/[^\d+]/g, '')}`,
          dir: 'ltr' as const,
        }
      : null,
    address
      ? {
          key: 'address',
          Icon: MapPin,
          label: t('website:theme1.contact.addressLabel'),
          value: address,
          href: undefined,
          dir: 'auto' as const,
        }
      : null,
  ].filter((method): method is NonNullable<typeof method> => !!method);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const submitterEmail = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    if (!name || !submitterEmail || !message) return;
    setState('submitting');
    try {
      await publicWebsiteService.submitContactMessage(academyId, {
        name,
        email: submitterEmail,
        message,
      });
      setState('success');
      form.reset();
    } catch {
      setState('error');
    }
  };

  const labelClass =
    'mb-1.5 block text-sm font-semibold text-[var(--website-foreground)]';

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <div
        className={cn(
          'grid gap-10',
          config.showForm &&
            'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14'
        )}
      >
        <div className="min-w-0 space-y-8">
          <T1SectionHeader
            id={headingId}
            title={title}
            description={description}
            className="!mb-0"
          />
          {methods.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {methods.map(({ key, Icon, label, value, href, dir }) => (
                <li key={key} className="t1-card flex items-start gap-4 p-5">
                  <span className="t1-icon-tile">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--website-foreground-muted)]">
                      {label}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        dir={dir}
                        className="t1-link min-h-0 break-all text-base text-[var(--website-foreground)]"
                      >
                        {value}
                      </a>
                    ) : (
                      <p
                        dir={dir}
                        className="break-words font-semibold text-[var(--website-foreground)]"
                      >
                        {value}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {config.showForm ? (
          <div className="t1-card p-6 md:p-9">
            {state === 'success' ? (
              <div
                role="status"
                data-contact-success=""
                className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center"
              >
                <span className="t1-icon-tile size-14 rounded-full">
                  <CheckCircle2 className="size-7" aria-hidden />
                </span>
                <p className="font-display text-2xl font-bold text-[var(--website-foreground)]">
                  {t('website:theme1.contact.successTitle')}
                </p>
                <p className="max-w-sm text-[var(--website-foreground-muted)]">
                  {t('website:renderer.contactSuccess')}
                </p>
                <button
                  type="button"
                  className="t1-btn-secondary mt-2"
                  onClick={() => setState('idle')}
                >
                  {t('website:theme1.contact.sendAnother')}
                </button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={onSubmit}>
                <p className="font-display text-xl font-bold text-[var(--website-foreground)]">
                  {t('website:theme1.contact.formTitle')}
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${fieldId}-name`} className={labelClass}>
                      {t('website:renderer.contactNameLabel')}
                    </label>
                    <input
                      id={`${fieldId}-name`}
                      name="name"
                      autoComplete="name"
                      required
                      className="t1-input"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${fieldId}-email`} className={labelClass}>
                      {t('website:renderer.contactEmailLabel')}
                    </label>
                    <input
                      id={`${fieldId}-email`}
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      dir="ltr"
                      className="t1-input text-start"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor={`${fieldId}-message`} className={labelClass}>
                    {t('website:renderer.contactMessageLabel')}
                  </label>
                  <textarea
                    id={`${fieldId}-message`}
                    name="message"
                    rows={6}
                    required
                    className="t1-input min-h-[10rem] py-3"
                  />
                </div>
                {state === 'error' ? (
                  <p
                    role="alert"
                    className="text-sm font-medium text-[var(--website-error)]"
                  >
                    {t('website:renderer.contactError')}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="t1-cta t1-btn-lg w-full sm:w-auto"
                  disabled={state === 'submitting'}
                >
                  {state === 'submitting' ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t('website:renderer.contactSubmit')}
                </button>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery                                                               */
/* ------------------------------------------------------------------ */

export function T1Gallery({
  config,
}: SectionRenderProps<'gallery'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const direction = PUBLIC_WEBSITE_LOCALE_DIRECTION[locale];
  const headingId = useId();
  const [open, setOpen] = useState<number | null>(null);
  const images = config.images
    .map((image) => {
      const caption = resolveLocalizedText(image.caption, locale);
      return {
        id: image.id,
        value: image.image,
        caption,
        alt: resolveLocalizedText(image.imageAlt, locale) || caption,
        viewable: hasRenderableImage(image.image),
      };
    })
    .filter((image) => image.value);
  if (images.length === 0) return null;
  const title = resolveLocalizedText(config.title, locale);
  const bento = images.length === 5;
  const viewable = images.filter((image) => image.viewable);
  const current = open !== null ? viewable[open] : undefined;
  const PrevIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;
  const step = (delta: number) =>
    setOpen((value) =>
      value === null
        ? value
        : (value + delta + viewable.length) % viewable.length
    );

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader id={headingId} title={title} />
      <ul
        className={cn(
          'grid gap-3 md:gap-4',
          bento ? 't1-bento' : 'grid-cols-2 md:grid-cols-3'
        )}
      >
        {images.map((image, index) => {
          const viewIndex = viewable.indexOf(image);
          const picture = (
            <ThemeImage
              value={image.value}
              alt={image.alt}
              sizes={
                bento && index < 2
                  ? '(min-width: 768px) 66vw, 100vw'
                  : '(min-width: 768px) 33vw, 33vw'
              }
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
              fallback={<T1ImagePlaceholder reference={image.value} />}
            />
          );
          return (
            <li
              key={image.id}
              className={cn(
                'relative overflow-hidden rounded-[var(--t1-radius-card)] bg-[var(--website-surface-muted)] [&>*]:absolute [&>*]:inset-0',
                !bento && 'aspect-[1/1]'
              )}
            >
              {viewIndex >= 0 ? (
                <button
                  type="button"
                  className="group block size-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[var(--website-focus)]"
                  onClick={() => setOpen(viewIndex)}
                  aria-label={t('website:theme1.gallery.open', {
                    name: image.alt || String(index + 1),
                  })}
                >
                  {picture}
                </button>
              ) : (
                picture
              )}
            </li>
          );
        })}
      </ul>
      <Dialog
        open={current !== undefined}
        onOpenChange={(value) => {
          if (!value) setOpen(null);
        }}
      >
        <DialogContent
          dir={direction}
          data-t1-lightbox=""
          className="max-w-5xl gap-4 border-none bg-[var(--website-background)] p-3 sm:p-4 [&>button:last-child]:hidden"
          onKeyDown={(event) => {
            const back = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
            const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
            if (event.key === back) step(-1);
            if (event.key === forward) step(1);
          }}
        >
          <DialogTitle className="sr-only">
            {current?.alt || title || t('website:theme1.gallery.title')}
          </DialogTitle>
          {current ? (
            <>
              <div className="flex max-h-[75vh] justify-center overflow-hidden rounded-2xl bg-[var(--website-surface-muted)]">
                <ThemeImage
                  value={current.value}
                  alt={current.alt}
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  className="max-h-[75vh] w-auto object-contain"
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-1">
                <DialogDescription className="min-w-0 text-sm text-[var(--website-foreground-muted)]">
                  {current.caption}
                </DialogDescription>
                <div className="flex shrink-0 gap-2">
                  {viewable.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="t1-btn-secondary size-11 !px-0"
                        onClick={() => step(-1)}
                        aria-label={t('website:theme1.gallery.previous')}
                      >
                        <PrevIcon className="size-5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="t1-btn-secondary size-11 !px-0"
                        onClick={() => step(1)}
                        aria-label={t('website:theme1.gallery.next')}
                      >
                        <NextIcon className="size-5" aria-hidden />
                      </button>
                    </>
                  ) : null}
                  <DialogClose
                    className="t1-btn-secondary size-11 !px-0"
                    aria-label={t('website:theme1.gallery.close')}
                  >
                    <X className="size-5" aria-hidden />
                  </DialogClose>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </T1Section>
  );
}
