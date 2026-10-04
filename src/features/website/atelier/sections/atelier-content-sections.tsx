/**
 * Atelier authored-content sections (plan §5a): the editorial lede
 * (`about`), the folio spread (`featureSplit`), the index (`features`),
 * the syllabus (`steps`), the closing ink chapter (`cta`) and the contact
 * sheet (`gallery`). Each composes as a page of a studio publication —
 * numbered chapters, hairlines and type — rather than cards.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { Reveal } from '@/features/website/primitives';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  AtelierAction,
  AtelierChapter,
  AtelierChapterMark,
  AtelierHeading,
  AtelierMedia,
  AtelierSectionHeader,
  formatAtelierIndex,
} from '../atelier-parts';
import { stagger } from './atelier-stagger';
import '../atelier-sections.css';

/* ------------------------------------------------------------------ */
/* About — the editorial lede                                           */
/* ------------------------------------------------------------------ */

/** Paragraphs are separated by a blank line; single breaks stay inside one. */
function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function AtelierAbout({
  config,
}: SectionRenderProps<'about'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const paragraphs = toParagraphs(resolveLocalizedText(config.body, locale));
  const hasImage = !!config.image;
  return (
    <AtelierChapter labelledBy={headingId} numbered>
      <AtelierChapterMark />
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 space-y-8 lg:col-span-8">
          <AtelierHeading id={headingId}>
            {resolveLocalizedText(config.title, locale)}
          </AtelierHeading>
          {paragraphs.length > 0 ? (
            <div className="ath-lede space-y-6">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className={cn(
                    'whitespace-pre-line',
                    index === 0 ? 'ath-lede-first at-serif' : 'at-lead'
                  )}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        {hasImage ? (
          <AtelierMedia
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 18rem, 14rem"
            shape="arch"
            className="ath-lede-plate aspect-[4/5] lg:col-span-3 lg:col-start-10"
          />
        ) : null}
      </div>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Feature split — the folio spread                                     */
/* ------------------------------------------------------------------ */

export function AtelierFeatureSplit({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'featureSplit'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const description = resolveLocalizedText(config.description, locale);
  const imageAlt = resolveLocalizedText(config.imageAlt, locale);
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
    <div className="min-w-0 space-y-10">
      <div className="space-y-6">
        <AtelierHeading id={headingId}>
          {resolveLocalizedText(config.title, locale)}
        </AtelierHeading>
        {description ? <p className="at-lead">{description}</p> : null}
      </div>
      {items.length > 0 ? (
        <ol
          className={cn(
            'ath-folio-list',
            !hasImage && 'md:grid md:grid-cols-2 md:gap-x-10'
          )}
        >
          {items.map((item, index) => (
            <li key={item.id}>
              <Reveal delayMs={stagger(index)} className="ath-folio-item">
                <span aria-hidden className="at-numeral ath-folio-no">
                  {formatAtelierIndex(index, locale)}
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="at-serif ath-item-title">{item.title}</h3>
                  {item.description ? (
                    <p className="ath-item-text">{item.description}</p>
                  ) : null}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      ) : null}
      <AtelierAction
        cta={config.cta}
        pages={pages}
        linkRenderer={linkRenderer}
        variant="link"
      />
    </div>
  );

  return (
    <AtelierChapter labelledBy={headingId} numbered>
      <AtelierChapterMark label={eyebrow || undefined} />
      {hasImage ? (
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
          {/* The plate bleeds to its page edge (logical start or end, so
              it mirrors in Arabic) with a caption line under it. */}
          <figure
            className={cn(
              'ath-folio-figure min-w-0 lg:col-span-6',
              imageEnd
                ? 'ath-bleed-end lg:order-last lg:col-start-7'
                : 'ath-bleed-start'
            )}
          >
            <AtelierMedia
              value={config.image}
              alt={imageAlt}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="at-drift aspect-[4/5]"
            />
            {imageAlt ? (
              <figcaption aria-hidden className="ath-caption">
                <span className="ath-caption-rule" />
                <span className="at-label">{imageAlt}</span>
              </figcaption>
            ) : null}
          </figure>
          <div
            className={cn(
              'min-w-0 lg:col-span-5',
              imageEnd ? 'lg:col-start-1' : 'lg:col-start-8'
            )}
          >
            {text}
          </div>
        </div>
      ) : (
        <div className="max-w-5xl">{text}</div>
      )}
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Features — an index, not cards                                       */
/* ------------------------------------------------------------------ */

export function AtelierFeatures({
  config,
}: SectionRenderProps<'features'>): JSX.Element | null {
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
  const strip = config.layout === 'strip';

  return (
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      numbered={!strip}
      className={strip ? 'ath-compact' : undefined}
    >
      {strip ? (
        // The compact band: a two-column hairline grid under a quiet label.
        title ? (
          <h2 id={headingId} className="at-label mb-8">
            {title}
          </h2>
        ) : null
      ) : (
        <AtelierSectionHeader
          id={headingId}
          title={title}
          description={description}
          layout="split"
        />
      )}
      <ol className={strip ? 'ath-index-grid' : 'ath-index'}>
        {items.map((item, index) => (
          <li key={item.id}>
            <Reveal delayMs={stagger(index)} className="ath-index-row">
              <span aria-hidden className="at-numeral ath-index-no">
                {formatAtelierIndex(index, locale)}
              </span>
              <h3 className="at-serif ath-index-title">{item.title}</h3>
              {item.description ? (
                <p className="ath-index-text">{item.description}</p>
              ) : null}
            </Reveal>
          </li>
        ))}
      </ol>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Steps — the syllabus                                                 */
/* ------------------------------------------------------------------ */

const TRACK_COLUMNS: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

export function AtelierSteps({
  config,
}: SectionRenderProps<'steps'>): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const title = resolveLocalizedText(config.title, locale);
  const items = config.items
    .map((item) => ({
      id: item.id,
      title: resolveLocalizedText(item.title, locale),
      description: resolveLocalizedText(item.description, locale),
    }))
    .filter((item) => item.title);
  if (items.length === 0) return null;

  return (
    <AtelierChapter
      env="deep"
      labelledBy={title ? headingId : undefined}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      {/* On desktop the thread turns sideways through each step's knot;
          on phones the steps hang from a vertical line. */}
      <ol
        className={cn(
          'ath-syllabus',
          TRACK_COLUMNS[items.length] ?? 'lg:grid-cols-3'
        )}
      >
        {items.map((item, index) => (
          <li key={item.id} className="ath-syllabus-step">
            <span aria-hidden className="ath-syllabus-knot" />
            <Reveal delayMs={stagger(index)} className="space-y-3">
              <span aria-hidden className="at-numeral ath-syllabus-no">
                {formatAtelierIndex(index, locale)}
              </span>
              <h3 className="at-serif ath-item-title">{item.title}</h3>
              {item.description ? (
                <p className="ath-item-text">{item.description}</p>
              ) : null}
            </Reveal>
          </li>
        ))}
      </ol>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* CTA — the closing ink chapter, where the thread ends                 */
/* ------------------------------------------------------------------ */

export function AtelierCta({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'cta'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const description = resolveLocalizedText(config.description, locale);
  const hasImage = !!config.image;

  return (
    <AtelierChapter
      env="ink"
      labelledBy={headingId}
      thread="end"
      className="ath-cta"
    >
      <div
        className={cn(
          'grid gap-12',
          hasImage && 'lg:grid-cols-12 lg:items-end lg:gap-10'
        )}
      >
        <div
          className={cn('ath-cta-text min-w-0', hasImage && 'lg:col-span-7')}
        >
          {/* The thread's last knot, filled: the path arrives here. */}
          <span aria-hidden className="at-knot ath-cta-knot" data-filled="" />
          <div className="space-y-8">
            <AtelierHeading id={headingId} size="display">
              {resolveLocalizedText(config.title, locale)}
            </AtelierHeading>
            {description ? <p className="at-lead">{description}</p> : null}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <AtelierAction
                cta={config.cta}
                pages={pages}
                linkRenderer={linkRenderer}
                variant="ink"
                large
              />
              <AtelierAction
                cta={config.secondaryCta}
                pages={pages}
                linkRenderer={linkRenderer}
                variant="inkGhost"
                large
                arrow={false}
              />
            </div>
          </div>
        </div>
        {hasImage ? (
          <AtelierMedia
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 36vw, 100vw"
            className="aspect-[4/3] md:aspect-[16/9] lg:col-span-5"
          />
        ) : null}
      </div>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery — the contact sheet                                          */
/* ------------------------------------------------------------------ */

/** The sheet's rhythm: spans and ratios repeat every five frames. */
const SHEET_PATTERN = [
  {
    cell: 'md:col-span-5',
    ratio: 'aspect-[4/5]',
    sizes: '(min-width: 768px) 40vw, 100vw',
  },
  {
    cell: 'md:col-span-7 md:mt-24',
    ratio: 'aspect-[3/2]',
    sizes: '(min-width: 768px) 55vw, 100vw',
  },
  {
    cell: 'md:col-span-4',
    ratio: 'aspect-[1/1]',
    sizes: '(min-width: 768px) 30vw, 100vw',
  },
  {
    cell: 'md:col-span-4 md:mt-12',
    ratio: 'aspect-[4/5]',
    sizes: '(min-width: 768px) 30vw, 100vw',
  },
  {
    cell: 'md:col-span-4',
    ratio: 'aspect-[3/2]',
    sizes: '(min-width: 768px) 30vw, 100vw',
  },
] as const;

export function AtelierGallery({
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
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:atelier.home.gallery.label')}
      numbered
    >
      <AtelierSectionHeader id={headingId} title={title} />
      <ul className="ath-sheet">
        {images.map((image, index) => {
          const frame = SHEET_PATTERN[index % SHEET_PATTERN.length];
          return (
            <li key={image.id} className={cn('min-w-0', frame.cell)}>
              <Reveal delayMs={stagger(index % SHEET_PATTERN.length)}>
                <figure className="space-y-3">
                  {/* The visible caption names the frame; the image's own
                      description is its alt (decorative when unset). */}
                  <AtelierMedia
                    value={image.value}
                    alt={image.alt}
                    sizes={frame.sizes}
                    className={frame.ratio}
                  />
                  <figcaption className="ath-sheet-caption">
                    <span aria-hidden className="at-numeral">
                      {formatAtelierIndex(index, locale)}
                    </span>
                    {image.caption ? (
                      <span className="min-w-0">{image.caption}</span>
                    ) : null}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </AtelierChapter>
  );
}
