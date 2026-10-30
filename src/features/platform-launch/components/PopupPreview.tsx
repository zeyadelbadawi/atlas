/**
 * B3 — a static replica of the marketing pop-up (the real one is built by
 * `marketing/client/announcements.ts`): same layout, tone strip, optional
 * image, title, message, CTA and close button. Not a modal: it sits in the
 * editor's preview panel and is marked as a preview for assistive tech.
 */
import { X } from 'lucide-react';
import { cn } from '@utils';
import {
  POPUP_ACCENT_CLASS,
  isSafeAnnouncementUrl,
  type AnnouncementTone,
} from '@/marketing/announcements/presentation';

export interface PopupPreviewProps {
  readonly tone: AnnouncementTone;
  readonly title: string;
  readonly body: string;
  readonly ctaLabel?: string;
  readonly ctaUrl?: string | null;
  readonly imageUrl?: string | null;
  readonly dismissible: boolean;
  readonly closeLabel: string;
  readonly lang?: string;
  readonly dir?: 'ltr' | 'rtl';
}

export function PopupPreview({
  tone,
  title,
  body,
  ctaLabel,
  ctaUrl,
  imageUrl,
  dismissible,
  closeLabel,
  lang,
  dir,
}: PopupPreviewProps): JSX.Element {
  const hasCta = Boolean(ctaLabel && isSafeAnnouncementUrl(ctaUrl));
  return (
    <div className="flex items-center justify-center rounded-lg bg-foreground/40 p-4 sm:p-6">
      <div
        lang={lang}
        dir={dir}
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl"
      >
        <div aria-hidden className={cn('h-1.5', POPUP_ACCENT_CLASS[tone])} />
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="aspect-[2/1] w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <div className="space-y-3 p-5">
          <p className="pe-8 text-lg font-semibold leading-snug">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{body}</p>
          {hasCta ? (
            <span className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
              {ctaLabel}
            </span>
          ) : null}
        </div>
        {dismissible ? (
          <span
            aria-label={closeLabel}
            role="img"
            className="absolute end-2 top-3 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground"
          >
            <X className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
    </div>
  );
}
