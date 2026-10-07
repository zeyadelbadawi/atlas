/**
 * Riwaq building blocks shared by its section renderers, chrome and pages
 * (Reports/THEME_4_RIWAQ_PLAN.md §3): bands on their grounds, the section
 * head with its start rail, headings with the marked phrase, photograph
 * windows (tinted, shuttered), actions, the crest, monograms and number
 * formatting.
 *
 * Colours come only from the Riwaq brand mapping (`--rw-*`, `--website-*`);
 * nothing here reads a raw brand colour. Everything renders its final,
 * readable state on the server; motion is CSS (`riwaq.css`).
 */
import { useId, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { cn } from '@utils';
import {
  ThemeImage,
  findThemeAsset,
  isThemeAssetReference,
} from '../theme-assets';
import { useReveal } from '../primitives';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { splitHighlight } from '../primitives';
import {
  isExternalHref,
  resolveWebsiteCtaHref,
} from '../utils/link-resolution.utils';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { WebsiteCta, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

/* ------------------------------------------------------------------ */
/* Bands                                                                */
/* ------------------------------------------------------------------ */

export type RiwaqGround = 'porcelain' | 'stone' | 'deep';

/**
 * A band: a labelled section landmark on one ground, with the colonnade
 * drawn behind its container. `colonnade={false}` leaves the lines out
 * (dense reading such as long lists).
 */
export function RiwaqBand({
  ground = 'porcelain',
  labelledBy,
  label,
  tight = false,
  colonnade = true,
  className,
  containerClassName,
  style,
  as: Tag = 'section',
  children,
}: {
  readonly ground?: RiwaqGround;
  readonly labelledBy?: string;
  /** An accessible name when there is no visible heading to point at. */
  readonly label?: string;
  readonly tight?: boolean;
  readonly colonnade?: boolean;
  readonly className?: string;
  readonly containerClassName?: string;
  readonly style?: CSSProperties;
  readonly as?: 'section' | 'div' | 'header' | 'footer' | 'article';
  readonly children: ReactNode;
}): JSX.Element {
  const landmark = Tag === 'section';
  return (
    <Tag
      aria-labelledby={landmark ? labelledBy : undefined}
      aria-label={landmark && !labelledBy ? label : undefined}
      data-ground={ground}
      data-tight={tight ? '' : undefined}
      data-colonnade={colonnade ? undefined : 'off'}
      className={cn('rw-band', className)}
      style={style}
    >
      <div className={cn('rw-container', containerClassName)}>{children}</div>
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Headings                                                             */
/* ------------------------------------------------------------------ */

/** Above this many characters a display headline steps down one size. */
export const RIWAQ_LONG_HEADLINE = 46;

/** A heading whose configured phrase is underlined by the marker. */
export function RiwaqHeading({
  as: Tag = 'h2',
  id,
  size = 'title',
  highlight,
  className,
  children,
}: {
  readonly as?: 'h1' | 'h2' | 'h3';
  readonly id?: string;
  readonly size?: 'display' | 'title' | 'subtitle';
  readonly highlight?: string;
  readonly className?: string;
  readonly children: string;
}): JSX.Element {
  const parts = splitHighlight(children, highlight);
  return (
    <Tag
      id={id}
      data-long={
        size === 'display' && children.length > RIWAQ_LONG_HEADLINE
          ? ''
          : undefined
      }
      className={cn(`rw-${size}`, className)}
    >
      {parts ? (
        <>
          {parts[0]}
          <em data-highlight className="rw-em">
            {parts[1]}
          </em>
          {parts[2]}
        </>
      ) : (
        children
      )}
    </Tag>
  );
}

/**
 * A section's opening on the page grid: the label in the start rail (a
 * ruled cell of three columns on desktop), the title and lead beside it,
 * an optional action under them. Renders nothing with nothing to say.
 */
export function RiwaqSectionHead({
  id,
  label,
  title,
  highlight,
  description,
  action,
  wide = false,
  className,
}: {
  readonly id?: string;
  readonly label?: string;
  readonly title?: string;
  readonly highlight?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly wide?: boolean;
  readonly className?: string;
}): JSX.Element | null {
  if (!label && !title && !description && !action) return null;
  return (
    <header className={cn('rw-head', className)} data-wide={wide ? '' : undefined}>
      <div className="rw-head-rail">
        {label ? (
          <p className="rw-label" data-mark="">
            {label}
          </p>
        ) : null}
      </div>
      {title || description ? (
        <div className="rw-head-body">
          {title ? (
            <RiwaqHeading id={id} highlight={highlight}>
              {title}
            </RiwaqHeading>
          ) : null}
          {description ? <p className="rw-lead">{description}</p> : null}
        </div>
      ) : null}
      {action ? <div className="rw-head-action">{action}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Windows                                                              */
/* ------------------------------------------------------------------ */

const SHOW_SLOT_LABEL = import.meta.env.MODE !== 'production';

/** The neutral stand-in for a photograph that isn't released (or failed). */
export function RiwaqPlaceholder({
  reference,
}: {
  readonly reference?: string;
}): JSX.Element {
  let label: string | undefined;
  if (SHOW_SLOT_LABEL && reference && isThemeAssetReference(reference)) {
    const [theme, key] = reference.slice('theme-asset:'.length).split('/');
    const found = findThemeAsset(theme, key);
    label = found ? `${key} · ${found.entry.ratio}` : key;
  }
  return (
    <div aria-hidden className="rw-placeholder" data-image-placeholder="">
      <ImageIcon className="size-6 opacity-60" strokeWidth={1.25} />
      {label ? (
        <span className="rw-placeholder-label" dir="ltr">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A photograph window: a fixed-ratio frame (no layout shift) with the
 * picture covering it, tinted in the brand's hue. `shutter` opens it once
 * on first view (never on the page's lead image); `develop` lifts the tint
 * on hover by itself (a window inside a link develops with the link).
 */
export function RiwaqWindow({
  value,
  alt,
  sizes,
  priority = false,
  shutter = false,
  develop = false,
  tint = true,
  className,
  children,
}: {
  readonly value: string | undefined;
  readonly alt: string;
  readonly sizes: string;
  readonly priority?: boolean;
  readonly shutter?: boolean;
  readonly develop?: boolean;
  readonly tint?: boolean;
  /** The ratio per breakpoint, e.g. `aspect-[4/5]`. */
  readonly className?: string;
  readonly children?: ReactNode;
}): JSX.Element {
  const image = (
    <ThemeImage
      value={value}
      alt={alt}
      sizes={sizes}
      className="size-full object-cover"
      fallback={<RiwaqPlaceholder reference={value} />}
      loading={priority ? 'eager' : 'lazy'}
      priority={priority}
    />
  );
  if (shutter && !priority) {
    return (
      <ShutteredWindow
        className={className}
        tint={tint}
        develop={develop}
        image={image}
      >
        {children}
      </ShutteredWindow>
    );
  }
  return (
    <div
      className={cn('rw-window', className)}
      data-tint={tint ? '' : undefined}
      data-develop={develop ? '' : undefined}
    >
      {image}
      {children}
    </div>
  );
}

function ShutteredWindow({
  className,
  tint,
  develop,
  image,
  children,
}: {
  readonly className?: string;
  readonly tint: boolean;
  readonly develop: boolean;
  readonly image: ReactNode;
  readonly children?: ReactNode;
}): JSX.Element {
  const { ref, state } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn('rw-window', className)}
      data-reveal={state}
      data-tint={tint ? '' : undefined}
      data-develop={develop ? '' : undefined}
    >
      {image}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Actions                                                              */
/* ------------------------------------------------------------------ */

/**
 * A path as a link when the runtime can navigate, else an inert button
 * (dashboard previews). On the public site a target that resolves to
 * nothing (a hidden or deleted page) renders nothing — never a dead control.
 */
export function RiwaqLink({
  href,
  linkRenderer,
  className,
  children,
}: {
  readonly href: string | undefined;
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly className?: string;
  readonly children: ReactNode;
}): JSX.Element | null {
  if (linkRenderer) {
    if (!href) return null;
    return linkRenderer({
      href,
      external: isExternalHref(href),
      className,
      children,
    });
  }
  return (
    <button type="button" className={className}>
      {children}
    </button>
  );
}

/** The arrow inside an action; mirrors with the reading direction. */
export function RiwaqArrow({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <ArrowRight
      className={cn('rw-arrow size-4', className)}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

export type RiwaqActionVariant = 'solid' | 'line' | 'link';

/** A `WebsiteCta` as a Riwaq action (nothing when it has no label). */
export function RiwaqAction({
  cta,
  pages,
  linkRenderer,
  variant = 'solid',
  large = false,
  arrow = true,
  className,
}: {
  readonly cta: WebsiteCta | undefined;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly variant?: RiwaqActionVariant;
  readonly large?: boolean;
  readonly arrow?: boolean;
  readonly className?: string;
}): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  if (!cta) return null;
  const label = resolveLocalizedText(cta.label, locale);
  if (!label) return null;
  return (
    <RiwaqLink
      href={linkRenderer ? resolveWebsiteCtaHref(cta, pages) : undefined}
      linkRenderer={linkRenderer}
      className={cn(riwaqActionClass(variant, large), className)}
    >
      <span className="min-w-0 break-words">{label}</span>
      {arrow ? <RiwaqArrow /> : null}
    </RiwaqLink>
  );
}

/**
 * An action's classes. Variants are classes, not attributes: the public
 * link renderer forwards `className` only.
 */
export function riwaqActionClass(
  variant: RiwaqActionVariant = 'solid',
  large = false
): string {
  if (variant === 'link') return 'rw-link';
  return cn(
    'rw-btn',
    variant === 'line' && 'rw-btn-line',
    large && 'rw-btn-lg'
  );
}

/* ------------------------------------------------------------------ */
/* The crest                                                            */
/* ------------------------------------------------------------------ */

/** Initials of a name (two words at most), in the name's own script. */
export function riwaqInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}

/**
 * The academy's crest: its name set on a ring around its initials, with a
 * marker rule. Pure SVG text (no image, no font beyond the theme's).
 * `turn` lets the ring turn with the reader's scroll where the browser
 * supports scroll timelines and motion is allowed (`riwaq.css`).
 * Decorative: the name it shows is always also on the page as text.
 */
export function RiwaqCrest({
  name,
  size,
  turn = false,
  className,
}: {
  readonly name: string;
  readonly size?: string;
  readonly turn?: boolean;
  readonly className?: string;
}): JSX.Element | null {
  const pathId = useId().replace(/:/g, '');
  const { locale } = usePublicWebsiteLocale();
  const clean = name.trim();
  if (!clean) return null;
  // The ring holds the name twice when it is short, so the circle reads
  // closed; a long name is set once and spaced to fit.
  const ringText =
    clean.length <= 24 ? `${clean}  ·  ${clean}  ·  ` : `${clean}  ·  `;
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 120 120"
      className={cn('rw-crest', className)}
      data-turn={turn ? '' : undefined}
      style={size ? ({ '--rw-crest-size': size } as CSSProperties) : undefined}
    >
      <circle className="rw-crest-disc" cx="60" cy="60" r="59" />
      <g className="rw-crest-ring">
        <path
          id={pathId}
          fill="none"
          d="M 60,60 m -45,0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0"
        />
        <text direction={locale === 'ar' ? 'rtl' : 'ltr'}>
          <textPath
            href={`#${pathId}`}
            textLength="281"
            lengthAdjust="spacing"
          >
            {ringText}
          </textPath>
        </text>
      </g>
      <path className="rw-crest-rule" d="M 46,74 H 74" />
      <text
        className="rw-crest-initials"
        x="60"
        y="67"
        textAnchor="middle"
      >
        {riwaqInitials(clean)}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Monograms, numbers, entrances                                        */
/* ------------------------------------------------------------------ */

/** Initials in a ruled square (a person without a photograph). */
export function RiwaqMonogram({
  name,
  className,
}: {
  readonly name: string;
  readonly className?: string;
}): JSX.Element {
  return (
    <span aria-hidden className={cn('rw-monogram', className)}>
      {riwaqInitials(name)}
    </span>
  );
}

/** The locale's digits (Arabic-Indic in Arabic). */
export function formatRiwaqNumber(value: number, locale: 'en' | 'ar'): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
}

/** Two-digit index (01, 02 / ٠١, ٠٢). */
export function formatRiwaqIndex(index: number, locale: 'en' | 'ar'): string {
  return (index + 1).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
}

/** The staggered load-time entrance for one supporting element. */
export function riwaqEnter(index: number): {
  className: string;
  style: CSSProperties;
} {
  return {
    className: 'rw-enter',
    style: { '--rw-enter-index': index } as CSSProperties,
  };
}

/** A group's entrance stagger: 60 ms per item, 360 ms at most. */
export const riwaqStagger = (index: number): number => Math.min(index * 60, 360);

/** Paragraphs are separated by a blank line; single breaks stay inside one. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** Theme photographs the pack draws itself. */
export const RIWAQ_COURSE_FALLBACK = 'theme-asset:riwaq/course-fallback';
export const RIWAQ_COURSES_LAUNCHING = 'theme-asset:riwaq/courses-launching';
