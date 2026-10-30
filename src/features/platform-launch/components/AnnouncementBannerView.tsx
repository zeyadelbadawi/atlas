/**
 * B3 — one announcement bar: the dashboard banner and the Platform Owner's
 * live previews of the marketing banner and the dashboard banner. The tone
 * classes are the marketing client's own (`marketing/announcements`), so a
 * preview looks like what visitors get.
 *
 * Text is plain (never HTML). A CTA opens only an https:// address or a
 * site path. The dismiss button is 44×44 and labelled.
 */
import { X } from 'lucide-react';
import { cn } from '@utils';
import {
  BANNER_CTA_CLASS,
  BANNER_TONE_CLASS,
  TONE_DOT_CLASS,
  isSafeAnnouncementUrl,
  type AnnouncementTone,
} from '@/marketing/announcements/presentation';

export interface AnnouncementBannerViewProps {
  readonly tone: AnnouncementTone;
  readonly title?: string;
  readonly body: string;
  readonly ctaLabel?: string;
  readonly ctaUrl?: string | null;
  readonly dismissible: boolean;
  readonly dismissLabel: string;
  readonly onDismiss?: () => void;
  readonly onCtaClick?: () => void;
  /** Accessible name of the region (`role="region"`); omit for a preview. */
  readonly regionLabel?: string;
  readonly lang?: string;
  readonly dir?: 'ltr' | 'rtl';
  readonly className?: string;
  /** false for a preview: the CTA and close control look real but do nothing. */
  readonly interactive?: boolean;
}

export function AnnouncementBannerView({
  tone,
  title,
  body,
  ctaLabel,
  ctaUrl,
  dismissible,
  dismissLabel,
  onDismiss,
  onCtaClick,
  regionLabel,
  lang,
  dir,
  className,
  interactive = true,
}: AnnouncementBannerViewProps): JSX.Element {
  const href = isSafeAnnouncementUrl(ctaUrl) ? ctaUrl : undefined;
  const external = href ? /^https:/i.test(href) : false;
  return (
    <div
      role={regionLabel ? 'region' : undefined}
      aria-label={regionLabel}
      lang={lang}
      dir={dir}
      data-tone={tone}
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-2 text-sm',
        BANNER_TONE_CLASS[tone],
        className
      )}
    >
      <span
        aria-hidden
        className={cn('size-2 shrink-0 rounded-full', TONE_DOT_CLASS[tone])}
      />
      <p className="min-w-0 flex-1 py-1.5 leading-6">
        {title ? <strong className="font-semibold">{title} </strong> : null}
        <span>{body}</span>
        {href && ctaLabel && !interactive ? (
          <>
            {' '}
            <span
              className={cn(BANNER_CTA_CLASS, 'ms-1 min-h-0 align-baseline')}
            >
              {ctaLabel}
            </span>
          </>
        ) : null}
        {href && ctaLabel && interactive ? (
          <>
            {' '}
            <a
              href={href}
              onClick={onCtaClick}
              className={cn(BANNER_CTA_CLASS, 'ms-1 min-h-0 align-baseline')}
              {...(external ? { rel: 'noopener noreferrer' } : {})}
            >
              {ctaLabel}
            </a>
          </>
        ) : null}
      </p>
      {dismissible && !interactive ? (
        <span
          role="img"
          aria-label={dismissLabel}
          className="-me-2 inline-flex size-11 shrink-0 items-center justify-center opacity-80"
        >
          <X className="size-4" aria-hidden />
        </span>
      ) : null}
      {dismissible && interactive ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="-me-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
