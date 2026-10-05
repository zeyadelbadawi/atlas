/**
 * Atelier building blocks shared by its section renderers, chrome and pages
 * (Reports/THEME_2_ATELIER_PLAN.md §2): the chapter frame with its thread and
 * mark, headings, media frames, actions and monogram plates.
 *
 * Colours come only from the Atelier brand mapping (`--atelier-*`,
 * `--website-*`); nothing here reads a raw brand colour. Everything renders
 * its final, readable state on the server; motion is CSS (`atelier.css`).
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
/* Chapters                                                             */
/* ------------------------------------------------------------------ */

/** The two environments a chapter can sit in (plus the deeper paper band). */
export type AtelierEnv = 'paper' | 'deep' | 'ink';

/**
 * A chapter: a labelled section landmark with Atelier's rhythm and grid,
 * the thread running down its margin column, and (when `numbered`) a place
 * in the page's automatic chapter count.
 *
 * - `thread`: `'full'` (default) runs the whole chapter; `'start'` begins at
 *   `--at-thread-start` (the hero, under its actions); `'end'` stops after
 *   `--at-thread-end` (the closing chapter, where the thread ends in a knot);
 *   `'none'` draws no thread (system pages).
 * - `unveil`: an ink chapter opens like a window as it scrolls in.
 * - `backdrop`: a decorative layer drawn behind the chapter's content, across
 *   its full width (a cinematic scene's ink window, `cinematic/`).
 */
export function AtelierChapter({
  env = 'paper',
  labelledBy,
  label,
  numbered = false,
  thread = 'full',
  unveil = false,
  flushTop = false,
  backdrop,
  className,
  bodyClassName,
  style,
  children,
  as: Tag = 'section',
}: {
  readonly env?: AtelierEnv;
  readonly labelledBy?: string;
  /** An accessible name when there is no visible heading to point at. */
  readonly label?: string;
  readonly numbered?: boolean;
  readonly thread?: 'full' | 'start' | 'end' | 'none';
  readonly unveil?: boolean;
  readonly flushTop?: boolean;
  readonly backdrop?: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly style?: CSSProperties;
  readonly children: ReactNode;
  readonly as?: 'section' | 'div' | 'header';
}): JSX.Element {
  return (
    <Tag
      aria-labelledby={Tag === 'section' ? labelledBy : undefined}
      aria-label={Tag === 'section' && !labelledBy ? label : undefined}
      data-env={env}
      data-numbered={numbered ? '' : undefined}
      data-unveil={unveil && env === 'ink' ? '' : undefined}
      data-flush-top={flushTop ? '' : undefined}
      className={cn('at-chapter', className)}
      style={style}
    >
      {backdrop}
      {thread !== 'none' ? (
        <span
          aria-hidden
          className="at-thread"
          data-start={thread === 'start' ? '' : undefined}
          data-end={thread === 'end' ? '' : undefined}
        />
      ) : null}
      <div className="at-container">
        <div className={cn('at-body', bodyClassName)}>{children}</div>
      </div>
    </Tag>
  );
}

/**
 * The chapter mark: the page's running chapter number (a CSS counter, so the
 * Owner's section order is the story order), a short rule and a label, with
 * the knot where it meets the thread. The number is decorative; the label is
 * real text.
 */
export function AtelierChapterMark({
  label,
  numbered = true,
  filledKnot = false,
  className,
}: {
  readonly label?: string;
  readonly numbered?: boolean;
  readonly filledKnot?: boolean;
  readonly className?: string;
}): JSX.Element | null {
  if (!label && !numbered) return null;
  return (
    <div className={cn('at-mark', className)}>
      <span
        aria-hidden
        className="at-knot"
        data-filled={filledKnot ? '' : undefined}
      />
      {numbered ? (
        <span aria-hidden className="at-mark-no at-chapter-no" />
      ) : null}
      {numbered && label ? <span aria-hidden className="at-mark-rule" /> : null}
      {label ? <p className="at-label">{label}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Headings                                                             */
/* ------------------------------------------------------------------ */

/** A display heading whose configured phrase is set in the brand italic. */
export function AtelierHeading({
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
      className={cn(
        size === 'display'
          ? 'at-display'
          : size === 'title'
            ? 'at-title'
            : 'at-subtitle',
        className
      )}
    >
      {parts ? (
        <>
          {parts[0]}
          <em data-highlight className="at-em">
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
 * A chapter's opening: the mark, the title and the lead, with an optional
 * action. Renders nothing when it has nothing to say.
 */
export function AtelierSectionHeader({
  id,
  eyebrow,
  title,
  highlight,
  description,
  action,
  numbered = true,
  layout = 'stacked',
  className,
}: {
  readonly id?: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly highlight?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly numbered?: boolean;
  /** `split`: title on the start side, lead and action on the end side (desktop). */
  readonly layout?: 'stacked' | 'split';
  readonly className?: string;
}): JSX.Element | null {
  if (!eyebrow && !title && !description && !action && !numbered) return null;
  return (
    <header className={cn('mb-12 md:mb-16', className)}>
      <AtelierChapterMark label={eyebrow} numbered={numbered} />
      <div
        className={cn(
          'grid gap-6',
          layout === 'split' && 'lg:grid-cols-12 lg:items-end lg:gap-10'
        )}
      >
        {title ? (
          <AtelierHeading
            id={id}
            highlight={highlight}
            className={cn('max-w-4xl', layout === 'split' && 'lg:col-span-7')}
          >
            {title}
          </AtelierHeading>
        ) : null}
        {description || action ? (
          <div
            className={cn(
              'space-y-6',
              layout === 'split' && 'lg:col-span-4 lg:col-start-9'
            )}
          >
            {description ? <p className="at-lead">{description}</p> : null}
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
export function AtelierPlaceholder({
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
    <div aria-hidden className="at-placeholder" data-image-placeholder="">
      <ImageIcon className="size-6 opacity-40" strokeWidth={1.25} />
      {label ? (
        <span className="at-placeholder-label" dir="ltr">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A fixed-ratio frame with the image covering it; the frame reserves its
 * space before the file arrives (no layout shift).
 */
export function AtelierMedia({
  value,
  alt,
  sizes,
  shape = 'rect',
  settle = false,
  priority = false,
  className,
  children,
}: {
  readonly value: string | undefined;
  readonly alt: string;
  readonly sizes: string;
  readonly shape?: 'rect' | 'arch' | 'round';
  /** The image settles into the frame as it scrolls in (scroll-driven, progressive). */
  readonly settle?: boolean;
  /** The page's lead image: loads eagerly at high priority. */
  readonly priority?: boolean;
  /** The ratio per breakpoint, e.g. `aspect-[4/5]`. */
  readonly className?: string;
  readonly children?: ReactNode;
}): JSX.Element {
  return (
    <div
      className={cn('at-frame', settle && 'at-settle', className)}
      data-shape={shape === 'rect' ? undefined : shape}
    >
      <ThemeImage
        value={value}
        alt={alt}
        sizes={sizes}
        className="size-full object-cover"
        fallback={<AtelierPlaceholder reference={value} />}
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

export type AtelierActionVariant =
  'primary' | 'ghost' | 'link' | 'ink' | 'inkGhost';

const ACTION_CLASSES: Record<AtelierActionVariant, string> = {
  primary: 'at-btn',
  ghost: 'at-btn-ghost',
  link: 'at-link',
  ink: 'at-btn-ink',
  inkGhost: 'at-btn-ink-ghost',
};

/**
 * A path as a link when the runtime can navigate, else an inert button
 * (dashboard previews). On the public site a target that resolves to
 * nothing (a hidden or deleted page) renders nothing — never a dead control.
 */
export function AtelierLink({
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

/** A `WebsiteCta` as an Atelier action (nothing when it has no label). */
export function AtelierAction({
  cta,
  pages,
  linkRenderer,
  variant = 'primary',
  large = false,
  arrow = true,
  className,
}: {
  readonly cta: WebsiteCta | undefined;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly variant?: AtelierActionVariant;
  readonly large?: boolean;
  readonly arrow?: boolean;
  readonly className?: string;
}): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  if (!cta) return null;
  const label = resolveLocalizedText(cta.label, locale);
  if (!label) return null;
  return (
    <AtelierLink
      href={linkRenderer ? resolveWebsiteCtaHref(cta, pages) : undefined}
      linkRenderer={linkRenderer}
      className={cn(ACTION_CLASSES[variant], large && 'at-btn-lg', className)}
    >
      {label}
      {arrow && variant !== 'link' ? <AtelierArrow /> : null}
    </AtelierLink>
  );
}

/** The arrow inside an action; mirrors and nudges with the reading direction. */
export function AtelierArrow({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <ArrowRight
      className={cn('at-arrow size-4', className)}
      strokeWidth={1.5}
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------ */
/* People and numbers                                                   */
/* ------------------------------------------------------------------ */

/** Initials set in the display face on a brand-tinted plate. */
export function AtelierMonogram({
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
    <span aria-hidden className={cn('at-monogram', className)}>
      {initials}
    </span>
  );
}

/** The locale's digits (Arabic-Indic in Arabic). */
export function formatAtelierNumber(
  value: number,
  locale: 'en' | 'ar'
): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
}

/** Two-digit index for lists (01, 02 / ٠١, ٠٢). */
export function formatAtelierIndex(index: number, locale: 'en' | 'ar'): string {
  return (index + 1).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
}
