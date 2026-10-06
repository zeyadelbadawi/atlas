/**
 * Manara authored-content sections (plan §3.10): the lead statement
 * (`about`), How we teach (`featureSplit`), What's included (`features`),
 * Start in three steps (`steps`), Enrolment is open (`cta`) and the slanted
 * mosaic (`gallery`). Each is a block on one ground — dyed tiles, slanted
 * plates, big numerals — never a hairline or a chapter.
 */
import { useId, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolveFeatureIcon } from '@/features/website/utils/feature-icons';
import { Reveal } from '@/features/website/primitives';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  ManaraAction,
  ManaraBlock,
  ManaraHeading,
  ManaraMedia,
  ManaraPill,
  ManaraSectionHeader,
  formatManaraIndex,
} from '../manara-parts';
import { stagger, toParagraphs } from './manara-section-helpers';
import '../manara-sections.css';

/* ------------------------------------------------------------------ */
/* About — the lead statement                                           */
/* ------------------------------------------------------------------ */

export function ManaraAbout({
  config,
}: SectionRenderProps<'about'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const paragraphs = toParagraphs(resolveLocalizedText(config.body, locale));
  const hasImage = !!config.image;
  return (
    <ManaraBlock labelledBy={headingId}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div
          className={cn(
            'mnh-about min-w-0',
            hasImage ? 'lg:col-span-7' : 'lg:col-span-9'
          )}
        >
          <ManaraHeading id={headingId}>
            {resolveLocalizedText(config.title, locale)}
          </ManaraHeading>
          {paragraphs.length > 0 ? (
            <div className="mnh-about-body">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className={cn(
                    'whitespace-pre-line',
                    index === 0 ? 'mn-lead mnh-about-lead' : 'mn-body mn-muted'
                  )}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        {hasImage ? (
          <ManaraMedia
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 30vw, 100vw"
            shape="slant"
            className="mnh-about-plate aspect-[4/5] lg:col-span-4 lg:col-start-9"
          />
        ) : null}
      </div>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Feature split — How we teach                                         */
/* ------------------------------------------------------------------ */

export function ManaraFeatureSplit({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'featureSplit'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const description = resolveLocalizedText(config.description, locale);
  const hasImage = !!config.image;
  const imageEnd = config.imagePosition === 'end';
  const items = config.items
    .map((item) => ({
      id: item.id,
      title: resolveLocalizedText(item.title, locale),
      description: resolveLocalizedText(item.description, locale),
    }))
    .filter((item) => item.title);

  const text = (
    <div className="mnh-split-copy min-w-0">
      {eyebrow ? (
        <div className="mnh-eyebrow">
          <span aria-hidden className="mn-rule" />
          <p className="mn-label">{eyebrow}</p>
        </div>
      ) : null}
      <ManaraHeading id={headingId}>
        {resolveLocalizedText(config.title, locale)}
      </ManaraHeading>
      {description ? <p className="mn-lead mn-muted">{description}</p> : null}
      {items.length > 0 ? (
        <ol
          className={cn(
            'mnh-points',
            !hasImage && 'md:grid-cols-2 md:gap-x-10'
          )}
        >
          {items.map((item, index) => (
            <li key={item.id}>
              <Reveal delayMs={stagger(index)} className="mnh-point">
                <span aria-hidden className="mn-numeral mnh-point-no">
                  {formatManaraIndex(index, locale)}
                </span>
                <div className="min-w-0">
                  <h3 className="mn-subtitle mnh-item-title">{item.title}</h3>
                  {item.description ? (
                    <p className="mn-body mn-muted mnh-item-text">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      ) : null}
      <ManaraAction
        cta={config.cta}
        pages={pages}
        linkRenderer={linkRenderer}
        variant="block"
      />
    </div>
  );

  return (
    <ManaraBlock labelledBy={headingId}>
      {hasImage ? (
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-10">
          <ManaraMedia
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 40vw, 100vw"
            shape="slant"
            className={cn(
              'mnh-split-plate aspect-[4/5] lg:col-span-5',
              imageEnd && 'lg:order-last lg:col-start-8'
            )}
          />
          <div
            className={cn(
              'min-w-0 lg:col-span-6',
              imageEnd ? 'lg:col-start-1' : 'lg:col-start-7'
            )}
          >
            {text}
          </div>
        </div>
      ) : (
        <div className="max-w-5xl">{text}</div>
      )}
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Features — What's included                                           */
/* ------------------------------------------------------------------ */

export function ManaraFeatures({
  config,
}: SectionRenderProps<'features'>): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);
  const items = config.items
    .map((item) => ({
      id: item.id,
      icon: item.icon,
      title: resolveLocalizedText(item.title, locale),
      description: resolveLocalizedText(item.description, locale),
    }))
    .filter((item) => item.title);
  if (items.length === 0) return null;
  const strip = config.layout === 'strip';
  // Cards: two or three columns so no row is left with one orphan tile;
  // the strip: one row of up to four.
  const columns = strip
    ? Math.min(items.length, 4)
    : items.length % 3 === 0
      ? 3
      : 2;

  return (
    <ManaraBlock
      labelledBy={title ? headingId : undefined}
      tight={strip}
      className={cn(strip && 'mnh-included-strip')}
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={description}
        layout="split"
        className={cn(strip && '!mb-8')}
      />
      <ul
        className="mnh-included"
        data-strip={strip ? '' : undefined}
        style={{ '--mnh-cols': columns } as CSSProperties}
      >
        {items.map((item, index) => {
          const Icon = resolveFeatureIcon(item.icon);
          return (
            <li key={item.id} className="min-w-0">
              <Reveal delayMs={stagger(index)} className="h-full">
                <div className="mn-card mnh-feature">
                  <span aria-hidden className="mnh-feature-icon">
                    <Icon className="size-6" strokeWidth={2} />
                  </span>
                  <h3 className="mn-subtitle mnh-item-title">{item.title}</h3>
                  {item.description ? (
                    <p className="mn-body mn-muted mnh-item-text">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Steps — Start in three steps                                         */
/* ------------------------------------------------------------------ */

export function ManaraSteps({
  config,
}: SectionRenderProps<'steps'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);
  const items = config.items
    .map((item) => ({
      id: item.id,
      title: resolveLocalizedText(item.title, locale),
      description: resolveLocalizedText(item.description, locale),
    }))
    .filter((item) => item.title);
  if (items.length === 0) return null;
  const hasImage = !!config.image;

  return (
    <ManaraBlock env="soft" labelledBy={title ? headingId : undefined}>
      {hasImage ? (
        // With a plate: the title and lead on the start side, the slanted
        // plate on the end side, above the track.
        <header className="mb-10 grid gap-8 md:mb-14 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="min-w-0 space-y-5 lg:col-span-7">
            {title ? (
              <ManaraHeading id={headingId}>{title}</ManaraHeading>
            ) : null}
            {description ? (
              <p className="mn-lead mn-muted">{description}</p>
            ) : null}
          </div>
          <ManaraMedia
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 34vw, 100vw"
            shape="slant"
            className="mnh-steps-plate aspect-[3/2] lg:col-span-5 lg:col-start-8"
          />
        </header>
      ) : (
        <ManaraSectionHeader
          id={headingId}
          title={title}
          description={description}
          layout="split"
        />
      )}
      {/* Desktop: a horizontal track, the beam running through the big
          outlined numerals; phones: the steps stack along a vertical rule. */}
      <ol
        className="mnh-steps"
        style={{ '--mnh-steps': items.length } as CSSProperties}
      >
        <span aria-hidden className="mn-rule mnh-steps-beam" />
        {items.map((item, index) => (
          <li key={item.id} className="mnh-step">
            <Reveal delayMs={stagger(index)} className="mnh-step-body">
              <span
                aria-hidden
                className="mn-numeral mnh-step-no"
                data-atlas-numeric="true"
              >
                {formatManaraIndex(index, locale)}
              </span>
              <span className="mn-sr-only">
                {t('website:manara.home.steps.stepLabel', {
                  number: formatManaraIndex(index, locale),
                })}
              </span>
              <h3 className="mn-subtitle mnh-item-title">{item.title}</h3>
              {item.description ? (
                <p className="mn-body mn-muted mnh-item-text">
                  {item.description}
                </p>
              ) : null}
            </Reveal>
          </li>
        ))}
      </ol>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* CTA — Enrolment is open                                              */
/* ------------------------------------------------------------------ */

export function ManaraCta({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'cta'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const description = resolveLocalizedText(config.description, locale);
  const hasImage = !!config.image;

  return (
    <ManaraBlock
      env="block"
      labelledBy={headingId}
      beam="start"
      seamTop
      className="mnh-cta"
    >
      <div
        className={cn(
          'grid gap-10',
          hasImage && 'lg:grid-cols-12 lg:items-center lg:gap-10'
        )}
      >
        <div
          className={cn('mnh-cta-copy min-w-0', hasImage && 'lg:col-span-7')}
        >
          <ManaraHeading id={headingId} size="display">
            {resolveLocalizedText(config.title, locale)}
          </ManaraHeading>
          {description ? (
            <p className="mn-lead mn-muted">{description}</p>
          ) : null}
          <div className="mnh-cta-actions">
            <ManaraAction
              cta={config.cta}
              pages={pages}
              linkRenderer={linkRenderer}
              large
            />
            <ManaraAction
              cta={config.secondaryCta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant="outline"
              large
              arrow={false}
            />
          </div>
        </div>
        {hasImage ? (
          <ManaraMedia
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 40vw, 100vw"
            shape="slant"
            className="mnh-cta-plate aspect-[4/3] md:aspect-[16/9] lg:col-span-5"
          />
        ) : null}
      </div>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery — the slanted mosaic                                         */
/* ------------------------------------------------------------------ */

/** The mosaic's rhythm: spans and ratios repeat every five tiles (manifest §3.13). */
const MOSAIC_PATTERN = [
  {
    cell: 'md:col-span-5',
    ratio: 'aspect-[4/5]',
    sizes: '(min-width: 768px) 40vw, 100vw',
  },
  {
    cell: 'md:col-span-7',
    ratio: 'aspect-[3/2]',
    sizes: '(min-width: 768px) 55vw, 100vw',
  },
  {
    cell: 'md:col-span-4',
    ratio: 'aspect-[1/1]',
    sizes: '(min-width: 768px) 30vw, 100vw',
  },
  {
    cell: 'md:col-span-4',
    ratio: 'aspect-[4/5]',
    sizes: '(min-width: 768px) 30vw, 100vw',
  },
  {
    cell: 'md:col-span-4',
    ratio: 'aspect-[3/2]',
    sizes: '(min-width: 768px) 30vw, 100vw',
  },
] as const;

export function ManaraGallery({
  config,
}: SectionRenderProps<'gallery'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const images = config.images
    .map((image) => ({
      id: image.id,
      value: image.image,
      caption: resolveLocalizedText(image.caption, locale),
      alt: resolveLocalizedText(image.imageAlt, locale),
    }))
    .filter((image) => image.value);
  if (images.length === 0) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:manara.home.gallery.label')}
    >
      <ManaraSectionHeader id={headingId} title={title} />
      <ul className="mnh-gallery">
        {images.map((image, index) => {
          const frame = MOSAIC_PATTERN[index % MOSAIC_PATTERN.length];
          return (
            <li key={image.id} className={cn('min-w-0', frame.cell)}>
              <Reveal delayMs={stagger(index % MOSAIC_PATTERN.length)}>
                <figure className="mnh-gallery-tile">
                  {/* The visible caption names the tile; the image's own
                      description is its alt (decorative when unset). */}
                  <ManaraMedia
                    value={image.value}
                    alt={image.alt}
                    sizes={frame.sizes}
                    shape="slant"
                    className={frame.ratio}
                  />
                  <figcaption className="mnh-gallery-caption">
                    <ManaraPill tone="block" className="mnh-gallery-no">
                      {formatManaraIndex(index, locale)}
                    </ManaraPill>
                    {image.caption ? (
                      <span className="min-w-0 mn-body">{image.caption}</span>
                    ) : null}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </ManaraBlock>
  );
}
