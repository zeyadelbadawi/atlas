/**
 * Manara building blocks shared by its section renderers, chrome and pages
 * (Reports/THEME_3_MANARA_PLAN.md §3): blocks with their grounds and seams,
 * the beam, headings, media frames, actions, pills, tiles, numerals and
 * monograms.
 *
 * Colours come only from the Manara brand mapping (`--mn-*`, `--website-*`);
 * nothing here reads a raw brand colour. Everything renders its final,
 * readable state on the server; motion is CSS (`manara.css`).
 */
import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { cn } from '@utils';
import {
  ThemeImage,
  findThemeAsset,
  isThemeAssetReference,
} from '../theme-assets';
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
/* Blocks                                                               */
/* ------------------------------------------------------------------ */

/** The grounds a block can sit on. */
export type ManaraEnv = 'day' | 'soft' | 'night' | 'block' | 'accent';

/**
 * A block: a labelled section landmark on one ground, with Manara's rhythm
 * and container. `seamTop`/`seamBottom` slant its edges against the
 * neighbouring block (the previous ground shows through the top corner).
 * `beam` draws the decorative beam behind the content; `sweep` runs it
 * across once at load (the hero).
 */
export function ManaraBlock({
  env = 'day',
  labelledBy,
  label,
  seamTop = false,
  seamBottom = false,
  tight = false,
  flushTop = false,
  beam,
  sweep = false,
  className,
  bodyClassName,
  style,
  children,
  as: Tag = 'section',
}: {
  readonly env?: ManaraEnv;
  readonly labelledBy?: string;
  /** An accessible name when there is no visible heading to point at. */
  readonly label?: string;
  readonly seamTop?: boolean;
  readonly seamBottom?: boolean;
  readonly tight?: boolean;
  readonly flushTop?: boolean;
  /** Where the beam sits, or none. */
  readonly beam?: 'start' | 'centre' | 'end';
  readonly sweep?: boolean;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly style?: CSSProperties;
  readonly children: ReactNode;
  readonly as?: 'section' | 'div' | 'header' | 'footer';
}): JSX.Element {
  return (
    <Tag
      aria-labelledby={Tag === 'section' ? labelledBy : undefined}
      aria-label={Tag === 'section' && !labelledBy ? label : undefined}
      data-env={env}
      data-seam-top={seamTop ? '' : undefined}
      data-seam-bottom={seamBottom ? '' : undefined}
      data-tight={tight ? '' : undefined}
      data-flush-top={flushTop ? '' : undefined}
      className={cn('mn-block', className)}
      style={style}
    >
      {beam ? <ManaraBeam position={beam} sweep={sweep} /> : null}
      <div className={cn('mn-container', bodyClassName)}>{children}</div>
    </Tag>
  );
}

/** The decorative beam: a diagonal band of the accent (never carries meaning). */
export function ManaraBeam({
  position = 'centre',
  sweep = false,
  className,
}: {
  readonly position?: 'start' | 'centre' | 'end';
  readonly sweep?: boolean;
  readonly className?: string;
}): JSX.Element {
  return (
    <span
      aria-hidden
      className={cn('mn-beam', className)}
      data-position={position === 'centre' ? undefined : position}
      data-sweep={sweep ? '' : undefined}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Headings                                                             */
/* ------------------------------------------------------------------ */

/** Above this many characters a display headline steps down one size (plan §3.14). */
export const MANARA_LONG_HEADLINE = 48;

/** A display heading whose configured phrase takes the beam's marker stroke. */
export function ManaraHeading({
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
        size === 'display' && children.length > MANARA_LONG_HEADLINE
          ? ''
          : undefined
      }
      className={cn(
        size === 'display'
          ? 'mn-display'
          : size === 'title'
            ? 'mn-title'
            : 'mn-subtitle',
        className
      )}
    >
      {parts ? (
        <>
          {parts[0]}
          <em data-highlight className="mn-em">
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
 * A block's opening: the eyebrow pill with its rule, the title and the
 * lead, with an optional action. Renders nothing when it has nothing to say.
 */
export function ManaraSectionHeader({
  id,
  eyebrow,
  title,
  highlight,
  description,
  action,
  layout = 'stacked',
  align = 'start',
  className,
}: {
  readonly id?: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly highlight?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  /** `split`: title on the start side, lead and action on the end side (desktop). */
  readonly layout?: 'stacked' | 'split';
  readonly align?: 'start' | 'center';
  readonly className?: string;
}): JSX.Element | null {
  if (!eyebrow && !title && !description && !action) return null;
  return (
    <header
      className={cn(
        'mb-10 md:mb-14',
        align === 'center' && 'text-center',
        className
      )}
    >
      {eyebrow ? (
        <div
          className={cn(
            'mb-4 flex items-center gap-3',
            align === 'center' && 'justify-center'
          )}
        >
          <span aria-hidden className="mn-rule" />
          <p className="mn-label">{eyebrow}</p>
        </div>
      ) : null}
      <div
        className={cn(
          'grid gap-5',
          layout === 'split' && 'lg:grid-cols-12 lg:items-end lg:gap-10'
        )}
      >
        {title ? (
          <ManaraHeading
            id={id}
            highlight={highlight}
            className={cn(
              'max-w-4xl',
              align === 'center' && 'mx-auto',
              layout === 'split' && 'lg:col-span-7'
            )}
          >
            {title}
          </ManaraHeading>
        ) : null}
        {description || action ? (
          <div
            className={cn(
              'space-y-5',
              align === 'center' && 'mx-auto',
              layout === 'split' && 'lg:col-span-4 lg:col-start-9'
            )}
          >
            {description ? (
              <p
                className={cn(
                  'mn-lead mn-muted',
                  align === 'center' && 'mx-auto'
                )}
              >
                {description}
              </p>
            ) : null}
            {action ? <div>{action}</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Media                                                                */
/* ------------------------------------------------------------------ */

const SHOW_SLOT_LABEL = import.meta.env.MODE !== 'production';

/**
 * The neutral block standing in for a theme photograph that isn't released
 * (or an image that failed). Outside production builds it names the slot.
 */
export function ManaraPlaceholder({
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
    <div aria-hidden className="mn-placeholder" data-image-placeholder="">
      <ImageIcon className="size-6 opacity-50" strokeWidth={1.25} />
      {label ? (
        <span className="mn-placeholder-label" dir="ltr">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A fixed-ratio frame with the image covering it; the frame reserves its
 * space before the file arrives (no layout shift). `slant` cuts the bottom
 * edge; `poster` cuts opposite corners (the hero).
 */
export function ManaraMedia({
  value,
  alt,
  sizes,
  shape = 'rect',
  priority = false,
  className,
  children,
}: {
  readonly value: string | undefined;
  readonly alt: string;
  readonly sizes: string;
  readonly shape?: 'rect' | 'slant' | 'poster';
  /** The page's lead image: loads eagerly at high priority. */
  readonly priority?: boolean;
  /** The ratio per breakpoint, e.g. `aspect-[4/5]`. */
  readonly className?: string;
  readonly children?: ReactNode;
}): JSX.Element {
  return (
    <div
      className={cn('mn-frame', className)}
      data-shape={shape === 'rect' ? undefined : shape}
    >
      <ThemeImage
        value={value}
        alt={alt}
        sizes={sizes}
        className="size-full object-cover"
        fallback={<ManaraPlaceholder reference={value} />}
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
      />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Actions                                                              */
/* ------------------------------------------------------------------ */

export type ManaraActionVariant =
  'accent' | 'block' | 'outline' | 'quiet' | 'link';

const ACTION_CLASSES: Record<ManaraActionVariant, string> = {
  accent: 'mn-btn',
  block: 'mn-btn mn-btn-block',
  outline: 'mn-btn mn-btn-outline',
  quiet: 'mn-btn mn-btn-quiet',
  link: 'mn-link',
};

/**
 * A path as a link when the runtime can navigate, else an inert button
 * (dashboard previews). On the public site a target that resolves to
 * nothing (a hidden or deleted page) renders nothing — never a dead control.
 */
export function ManaraLink({
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

/** A `WebsiteCta` as a Manara action (nothing when it has no label). */
export function ManaraAction({
  cta,
  pages,
  linkRenderer,
  variant = 'accent',
  large = false,
  arrow = true,
  className,
}: {
  readonly cta: WebsiteCta | undefined;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly variant?: ManaraActionVariant;
  readonly large?: boolean;
  readonly arrow?: boolean;
  readonly className?: string;
}): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  if (!cta) return null;
  const label = resolveLocalizedText(cta.label, locale);
  if (!label) return null;
  return (
    <ManaraLink
      href={linkRenderer ? resolveWebsiteCtaHref(cta, pages) : undefined}
      linkRenderer={linkRenderer}
      className={cn(ACTION_CLASSES[variant], large && 'mn-btn-lg', className)}
    >
      <span className="min-w-0 break-words">{label}</span>
      {arrow ? <ManaraArrow /> : null}
    </ManaraLink>
  );
}

/** The arrow inside an action; mirrors and nudges with the reading direction. */
export function ManaraArrow({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <ArrowRight
      className={cn('mn-arrow size-4', className)}
      strokeWidth={2.25}
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------ */
/* Pills, tiles, numerals, people                                       */
/* ------------------------------------------------------------------ */

/** A short label pill (level, count, status). Real text, never colour alone. */
export function ManaraPill({
  tone,
  className,
  children,
}: {
  readonly tone?: 'accent' | 'block';
  readonly className?: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <span className={cn('mn-pill', className)} data-tone={tone}>
      {children}
    </span>
  );
}

/** A giant number in the display face, in the locale's digits. */
export function ManaraNumeral({
  value,
  className,
}: {
  readonly value: string;
  readonly className?: string;
}): JSX.Element {
  return <span className={cn('mn-numeral', className)}>{value}</span>;
}

/** Initials set in the display face on a dyed plate. */
export function ManaraMonogram({
  name,
  className,
}: {
  readonly name: string;
  readonly className?: string;
}): JSX.Element {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
  return (
    <span aria-hidden className={cn('mn-monogram', className)}>
      {initials}
    </span>
  );
}

/** The locale's digits (Arabic-Indic in Arabic). */
export function formatManaraNumber(value: number, locale: 'en' | 'ar'): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
}

/** Two-digit index for lists and steps (01, 02 / ٠١, ٠٢). */
export function formatManaraIndex(index: number, locale: 'en' | 'ar'): string {
  return (index + 1).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
}

/** The staggered load-time entrance for one supporting element. */
export function manaraEnter(index: number): {
  className: string;
  style: CSSProperties;
} {
  return {
    className: 'mn-enter',
    style: { '--mn-enter-index': index } as CSSProperties,
  };
}
