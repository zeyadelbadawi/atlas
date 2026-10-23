/**
 * CMS phase 3d — the map section's shared body (`map`): the address card,
 * a "Get directions" link and a map that loads only when the visitor asks.
 *
 * NOTHING LOADS UNTIL IT IS NEEDED. The page carries no map script, frame
 * or tile: the map's box is a same-size placeholder with a "Show map"
 * button, and only that click inserts the Google Maps frame — into the
 * box already reserved for it, so nothing below moves.
 *
 * The visitor's text never becomes an `href` or a frame `src` as typed:
 * the query (or the address) is URL-encoded into two fixed Google Maps
 * addresses. The frame needs `frame-src https://www.google.com/maps` in
 * the site's CSP (Caddyfile, `(csp)`).
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation } from 'lucide-react';
import { cn } from '@utils';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import {
  googleMapsDirectionsUrl,
  googleMapsEmbedUrl,
  type ResolvedMap,
} from './section-bodies.logic';

/**
 * The directions link: a real external link (new tab) on the public site,
 * an inert button in previews — the same rule as every section button.
 */
export function MapDirectionsLink({
  query,
  linkRenderer,
  className,
}: {
  readonly query: string;
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly className?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const content = (
    <>
      <Navigation className="size-4 shrink-0" aria-hidden />
      <span>{t('website:renderer.map.directions')}</span>
      <span className="sr-only"> {t('website:renderer.opensInNewTab')}</span>
    </>
  );
  if (linkRenderer) {
    return linkRenderer({
      href: googleMapsDirectionsUrl(query),
      external: true,
      className,
      children: content,
    });
  }
  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}

export interface MapEmbedClasses {
  /** The reserved box (its ratio, radius and border). */
  readonly frame?: string;
  /** The placeholder's ground and text. */
  readonly placeholder?: string;
  /** The "Show map" button. */
  readonly button?: string;
  readonly notice?: string;
}

/**
 * The map facade. The box keeps one size before and after the click; the
 * frame takes focus once it is in, so a keyboard user lands on the map
 * they asked for instead of the page's top.
 */
export function MapEmbed({
  query,
  place,
  classes = {},
}: {
  readonly query: string;
  /** Names the frame for screen readers ("Map: 12 Tahrir St."). */
  readonly place: string;
  readonly classes?: MapEmbedClasses;
}): JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (open) frameRef.current?.focus();
  }, [open]);

  return (
    <div
      data-map-embed={open ? 'open' : 'closed'}
      className={cn(
        'relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10]',
        classes.frame
      )}
    >
      {open ? (
        <iframe
          ref={frameRef}
          src={googleMapsEmbedUrl(query)}
          title={t('website:renderer.map.frameTitle', { place })}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          // Scripts run in Google's own origin (needed to pan and zoom);
          // popups let "View larger map" open Google Maps in a tab.
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      ) : (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center',
            classes.placeholder
          )}
        >
          <MapPin className="size-8 opacity-70" strokeWidth={1.5} aria-hidden />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'inline-flex min-h-11 items-center justify-center gap-2 px-5',
              classes.button
            )}
          >
            {t('website:renderer.map.showMap')}
          </button>
          <p className={cn('max-w-xs text-sm', classes.notice)}>
            {t('website:renderer.map.mapNotice')}
          </p>
        </div>
      )}
    </div>
  );
}

/** The address as lines (`<address>`, line breaks kept), then the note. */
export function MapAddress({
  map,
  className,
  noteClassName,
}: {
  readonly map: ResolvedMap;
  readonly className?: string;
  readonly noteClassName?: string;
}): JSX.Element {
  return (
    <>
      <address className={cn('not-italic', className)}>
        {map.addressLines.map((line, index) => (
          <span key={index} className="block break-words">
            {line}
          </span>
        ))}
      </address>
      {map.note ? (
        <p className={cn('break-words', noteClassName)}>{map.note}</p>
      ) : null}
    </>
  );
}
