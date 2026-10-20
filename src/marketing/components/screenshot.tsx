/**
 * A real product screenshot in a neutral browser frame (SPEC §D.1): explicit
 * dimensions so nothing shifts, lazy below the fold, and the "Demo content"
 * caption every capture must carry.
 */
import { cn } from '@/shared/utils/class-name.utils';
import { SCREENSHOTS, type ScreenshotKey } from '../data/screenshots';
import type { MarketingLang } from '../types';

export function Screenshot({
  name,
  lang,
  alt,
  caption,
  demoLabel,
  priority = false,
  device = 'desktop',
  frameUrl,
  className,
  sizes,
}: {
  name: ScreenshotKey;
  lang: MarketingLang;
  alt: string;
  caption?: string;
  demoLabel: string;
  /** The LCP image: eager, high priority. Everything else lazy-loads. */
  priority?: boolean;
  device?: 'desktop' | 'mobile';
  /** Address shown in the frame bar (a demo subdomain, never a real one). */
  frameUrl?: string;
  className?: string;
  sizes?: string;
}) {
  const shot = SCREENSHOTS[name][lang];
  const srcSet = shot.widths.map((w) => `${shot.base}-${w}w.webp ${w}w`).join(', ');
  const largest = shot.widths[shot.widths.length - 1];
  return (
    <figure className={cn('m-0', className)}>
      <div className={cn('mk-frame', device === 'mobile' && 'mx-auto max-w-[320px] rounded-[2rem] p-2')}>
        {device === 'desktop' ? (
          <div className="mk-frame-bar" aria-hidden>
            <span className="mk-frame-dot" />
            <span className="mk-frame-dot" />
            <span className="mk-frame-dot" />
            {frameUrl ? (
              <span className="ms-3 truncate rounded-md bg-background px-3 py-0.5 text-xs text-muted-foreground" dir="ltr">
                {frameUrl}
              </span>
            ) : null}
          </div>
        ) : null}
        <img
          src={`${shot.base}-${largest}w.webp`}
          srcSet={srcSet}
          sizes={sizes ?? (device === 'mobile' ? '320px' : '(min-width: 1024px) 50vw, 100vw')}
          width={shot.width}
          height={shot.height}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          {...(priority ? { fetchpriority: 'high' } : {})}
          className={cn('block h-auto w-full', device === 'mobile' && 'rounded-[1.5rem]')}
        />
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold">
          {demoLabel}
        </span>
        {caption ? <span>{caption}</span> : null}
      </figcaption>
    </figure>
  );
}
