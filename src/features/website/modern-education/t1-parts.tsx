/**
 * Theme 1 building blocks shared by its section renderers (plan §B, §F.1):
 * the section frame and heading block, the media frame with the neutral
 * placeholder, actions resolved from a `WebsiteCta`, the brand shapes and
 * the initials avatar.
 *
 * Colours come only from the Theme 1 brand mapping (`--website-*`
 * variables, §F.5); nothing here reads a raw brand colour.
 */
import type { ReactNode } from 'react';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { cn } from '@utils';
import {
  ThemeImage,
  findThemeAsset,
  isThemeAssetReference,
} from '../theme-assets';
import { useWebsiteContainerClass } from '../renderer/renderer-style.utils';
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
/* Section frame                                                        */
/* ------------------------------------------------------------------ */

export type T1Tone = 'default' | 'soft' | 'ink';

/** A labelled section landmark with the theme's rhythm, tone and container. */
export function T1Section({
  tone = 'default',
  labelledBy,
  className,
  containerClassName,
  children,
}: {
  readonly tone?: T1Tone;
  readonly labelledBy?: string;
  readonly className?: string;
  readonly containerClassName?: string;
  readonly children: ReactNode;
}): JSX.Element {
  const container = useWebsiteContainerClass();
  return (
    <section
      aria-labelledby={labelledBy}
      data-tone={tone}
      className={cn(
        't1-section',
        tone === 'ink' ? 't1-ink' : 'text-[var(--website-foreground)]',
        className
      )}
    >
      <div className={cn(container, containerClassName)}>{children}</div>
    </section>
  );
}

/** A heading whose one configured phrase carries the highlight stroke. */
export function T1Heading({
  as: Tag = 'h2',
  id,
  size = 'title',
  highlight,
  className,
  children,
}: {
  readonly as?: 'h1' | 'h2' | 'h3';
  readonly id?: string;
  readonly size?: 'display' | 'title';
  readonly highlight?: string;
  readonly className?: string;
  readonly children: string;
}): JSX.Element {
  const parts = splitHighlight(children, highlight);
  return (
    <Tag
      id={id}
      className={cn(
        'break-words font-display font-bold [text-wrap:balance]',
        size === 'display' ? 't1-display' : 't1-title',
        className
      )}
    >
      {parts ? (
        <>
          {parts[0]}
          <span data-highlight className="website-highlight">
            {parts[1]}
          </span>
          {parts[2]}
        </>
      ) : (
        children
      )}
    </Tag>
  );
}

/**
 * Eyebrow, title and lead for a section, with an optional action at the
 * logical end on tablets and up, under the text on phones.
 */
export function T1SectionHeader({
  id,
  eyebrow,
  title,
  description,
  align = 'start',
  action,
  className,
}: {
  readonly id?: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly description?: string;
  readonly align?: 'start' | 'center';
  readonly action?: ReactNode;
  readonly className?: string;
}): JSX.Element | null {
  if (!eyebrow && !title && !description && !action) return null;
  const centered = align === 'center';
  return (
    <div
      className={cn(
        'mb-10 flex flex-col gap-5 md:mb-12',
        !centered && action && 'md:flex-row md:items-end md:justify-between',
        centered && 'items-center text-center',
        className
      )}
    >
      <div className={cn('min-w-0 max-w-3xl space-y-3', centered && 'mx-auto')}>
        {eyebrow ? <p className="t1-eyebrow">{eyebrow}</p> : null}
        {title ? <T1Heading id={id}>{title}</T1Heading> : null}
        {description ? (
          <p className={cn('t1-lead', centered && 'mx-auto')}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Media                                                                */
/* ------------------------------------------------------------------ */

const SHOW_SLOT_LABEL = import.meta.env.MODE !== 'production';

/**
 * The neutral block standing in for a theme photograph that isn't
 * released yet (plan §E.6: production images come after the whole site is
 * built). Outside production builds it names the slot — asset key and
 * planned ratio — so layout reviews can check each one; production shows
 * only the neutral block.
 */
export function T1ImagePlaceholder({
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
    <div aria-hidden className="t1-placeholder" data-image-placeholder="">
      <ImageIcon className="size-7 opacity-50" strokeWidth={1.5} />
      {label ? (
        <span className="t1-placeholder-label" dir="ltr">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A fixed-ratio frame with the image covering it. The frame reserves its
 * space before the file arrives (no layout shift); an unreleased theme
 * photograph shows the neutral placeholder in the same frame.
 */
export function T1Media({
  value,
  alt,
  sizes,
  className,
  children,
}: {
  readonly value: string | undefined;
  readonly alt: string;
  readonly sizes: string;
  /** The ratio per breakpoint, e.g. `aspect-[4/3] lg:aspect-[4/5]`. */
  readonly className?: string;
  readonly children?: ReactNode;
}): JSX.Element {
  return (
    <div className={cn('t1-media', className)}>
      <ThemeImage
        value={value}
        alt={alt}
        sizes={sizes}
        className="size-full object-cover"
        fallback={<T1ImagePlaceholder reference={value} />}
      />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Actions                                                              */
/* ------------------------------------------------------------------ */

export type T1ActionVariant =
  'primary' | 'secondary' | 'link' | 'ink' | 'inkSecondary';

const ACTION_CLASSES: Record<T1ActionVariant, string> = {
  primary: 't1-cta',
  secondary: 't1-btn-secondary',
  link: 't1-link',
  ink: 't1-ink-cta',
  inkSecondary: 't1-ink-secondary',
};

/** A path as a link when the runtime can navigate, else an inert button (previews). */
export function T1Link({
  href,
  linkRenderer,
  className,
  children,
}: {
  readonly href: string | undefined;
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly className?: string;
  readonly children: ReactNode;
}): JSX.Element {
  if (href && linkRenderer) {
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

/** A `WebsiteCta` as a Theme 1 action (nothing when it has no label). */
export function T1Action({
  cta,
  pages,
  linkRenderer,
  variant = 'primary',
  large = false,
  arrow = false,
  className,
}: {
  readonly cta: WebsiteCta | undefined;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly variant?: T1ActionVariant;
  readonly large?: boolean;
  readonly arrow?: boolean;
  readonly className?: string;
}): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  if (!cta) return null;
  const label = resolveLocalizedText(cta.label, locale);
  if (!label) return null;
  return (
    <T1Link
      href={linkRenderer ? resolveWebsiteCtaHref(cta, pages) : undefined}
      linkRenderer={linkRenderer}
      className={cn(ACTION_CLASSES[variant], large && 't1-btn-lg', className)}
    >
      {label}
      {arrow ? <T1Arrow /> : null}
    </T1Link>
  );
}

/** The arrow inside an action; flips and nudges with the reading direction. */
export function T1Arrow(): JSX.Element {
  return <ArrowRight className="t1-arrow size-4" strokeWidth={2} aria-hidden />;
}

/* ------------------------------------------------------------------ */
/* Brand shapes (§E.2 B) — decorative, brand-tinted, mirrored in RTL    */
/* ------------------------------------------------------------------ */

/** The organic shape behind the hero image (`brand-shape-hero`). */
export function BrandShapeHero({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 400 480"
      preserveAspectRatio="none"
      className={cn('t1-shape rtl:-scale-x-100', className)}
    >
      <path
        fill="currentColor"
        d="M268 18c62 18 118 74 126 146 9 78-24 124-30 196-6 70-50 116-126 118-86 2-148-40-194-106C-2 306-12 214 26 142 66 66 142 6 268 18Z"
      />
    </svg>
  );
}

/** The offset block behind feature images (`brand-shape-soft`). */
export function BrandShapeSoft({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 400 300"
      preserveAspectRatio="none"
      className={cn('t1-shape', className)}
    >
      <rect width="400" height="300" rx="28" fill="currentColor" />
    </svg>
  );
}

/** Inner-page heroes, Coming Soon and 404 (`brand-shape-page`). */
export function BrandShapePage({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 520 360"
      className={cn('t1-shape rtl:-scale-x-100', className)}
    >
      <path
        fill="currentColor"
        d="M372 12c84 10 140 70 146 146 6 80-44 150-120 180-82 32-176 28-250-10C76 296 10 236 2 168-6 94 56 34 136 16c76-18 160-12 236-4Z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* People and numbers                                                   */
/* ------------------------------------------------------------------ */

/** Initials on a brand-tinted disc (`initials-avatar`), for people without a photo. */
export function InitialsAvatar({
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
    <span
      aria-hidden
      className={cn(
        // The chip pair: opaque and contrast-checked by the brand mapping.
        'inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--website-chip-bg)] font-semibold text-[var(--website-chip-fg)]',
        className
      )}
    >
      {initials}
    </span>
  );
}

/** The locale's digits (Arabic-Indic in Arabic). */
export function formatT1Number(value: number, locale: 'en' | 'ar'): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
}

/** Whether the visitor asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
