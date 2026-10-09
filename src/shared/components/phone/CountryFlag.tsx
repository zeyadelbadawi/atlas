/**
 * A country flag as an SVG image — never an emoji (Windows renders flag
 * emoji as two letters).
 *
 * The flags come from `country-flag-icons` (MIT, 3:2, ~178 KB raw / ~47 KB
 * gzip for all 260+). They are loaded as ONE lazy chunk the first time any
 * flag is rendered, so no page that does not show a phone field pays for
 * them, and the list of 245 countries costs one request. Each is drawn as an
 * `<img>` with a `data:` URL: an SVG loaded as an image cannot run script,
 * and nothing is injected into the DOM (the CSP already allows `data:` images).
 * Until the chunk arrives — or if it fails — a neutral box of the same size
 * keeps the layout still.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getLoadedFlags, loadFlags } from './flag-loader';
import type { FlagStrings } from './flag-loader';

function useFlags(): FlagStrings | null {
  const [flags, setFlags] = useState<FlagStrings | null>(getLoadedFlags);
  useEffect(() => {
    if (flags) return;
    let active = true;
    loadFlags().then(
      (loaded) => {
        if (active) setFlags(loaded);
      },
      () => {
        // The placeholder stays; the country name and code still say which.
      }
    );
    return () => {
      active = false;
    };
  }, [flags]);
  return flags;
}

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2, upper case. */
  readonly country: string;
  readonly className?: string;
}

/** Decorative: always rendered next to the country's name or calling code, which carry the meaning. */
export function CountryFlag({
  country,
  className,
}: CountryFlagProps): JSX.Element {
  const flags = useFlags();
  const svg = /^[A-Z]{2}$/.test(country) ? flags?.[country] : undefined;
  const box = cn(
    'inline-block h-4 w-6 shrink-0 rounded-[2px] shadow-[0_0_0_1px_hsl(var(--border))]',
    className
  );
  if (!svg) {
    return (
      <span
        aria-hidden
        data-testid={`flag-placeholder-${country}`}
        className={cn(box, 'bg-muted')}
      />
    );
  }
  return (
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      alt=""
      aria-hidden
      data-testid={`flag-${country}`}
      className={cn(box, 'object-cover')}
      draggable={false}
      decoding="async"
    />
  );
}
