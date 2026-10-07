/**
 * Riwaq authored-content sections (plan §4): the statement (`about`),
 * Outcomes (`features`), Course of study (`steps`), the learning experience
 * (`featureSplit`), the colonnade gallery (`gallery`) and Enrol (`cta`).
 * Each sits on the page grid between the column lines: ruled cells,
 * windows and numbered rows — never rounded cards.
 */
import { useId, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { useWebsiteIdentity } from '@/features/website/renderer/WebsiteIdentityContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolveFeatureIcon } from '@/features/website/utils/feature-icons';
import { Reveal } from '@/features/website/primitives';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  RiwaqAction,
  RiwaqBand,
  RiwaqCrest,
  RiwaqHeading,
  RiwaqSectionHead,
  RiwaqWindow,
  formatRiwaqIndex,
  riwaqStagger,
  toParagraphs,
} from '../riwaq-parts';
import '../riwaq-sections.css';

/* ------------------------------------------------------------------ */
/* About — the statement                                                */
/* ------------------------------------------------------------------ */

export function RiwaqAbout({
  config,
}: SectionRenderProps<'about'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const title = resolveLocalizedText(config.title, locale);
  const paragraphs = toParagraphs(resolveLocalizedText(config.body, locale));
  const hasImage = !!config.image;
  return (
    <RiwaqBand labelledBy={title ? headingId : undefined}>
      <div className="rw-grid rws-split" data-image={hasImage ? 'end' : undefined}>
        <div className="rws-split-copy">
          {title ? <RiwaqHeading id={headingId}>{title}</RiwaqHeading> : null}
          {paragraphs.length > 0 ? (
            <div className="rws-prose">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className={cn(
                    'whitespace-pre-line',
                    index === 0 ? 'rw-lead rws-prose-lead' : 'rw-body'
                  )}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        {hasImage ? (
          <RiwaqWindow
            shutter
            develop
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 34vw, 100vw"
            className="rws-split-media aspect-[4/5]"
          />
        ) : null}
      </div>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Features — Outcomes, a ledger of capability cells                    */
/* ------------------------------------------------------------------ */

export function RiwaqFeatures({
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
  if (items.length === 0 && !title) return null;
  return (
    <RiwaqBand labelledBy={title ? headingId : undefined}>
      <RiwaqSectionHead id={headingId} title={title} description={description} />
      {items.length > 0 ? (
        <ul
          className="rw-ledger rws-outcomes"
          data-layout={config.layout === 'strip' ? 'strip' : undefined}
        >
          {items.map((item, index) => {
            const Icon = resolveFeatureIcon(item.icon);
            return (
              <li key={item.id} className="rws-outcome">
                <Reveal delayMs={riwaqStagger(index)} className="rws-outcome-body">
                  <span className="rws-outcome-top">
                    <span aria-hidden className="rws-outcome-icon">
                      <Icon className="size-5" strokeWidth={1.5} />
                    </span>
                    <span aria-hidden className="rw-label rw-num">
                      {formatRiwaqIndex(index, locale)}
                    </span>
                  </span>
                  <h3 className="rw-subtitle rws-outcome-title">{item.title}</h3>
                  {item.description ? (
                    <p className="rw-body rws-outcome-text">{item.description}</p>
                  ) : null}
                </Reveal>
              </li>
            );
          })}
        </ul>
      ) : null}
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Steps — Course of study, a timeline whose rail fills on scroll        */
/* ------------------------------------------------------------------ */

export function RiwaqSteps({
  config,
}: SectionRenderProps<'steps'>): JSX.Element | null {
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
    <RiwaqBand labelledBy={title ? headingId : undefined} className="rws-steps">
      <div className="rw-grid" data-image={hasImage ? '' : undefined}>
        <div aria-hidden className="rw-head-rail rws-steps-rail" />
        <div className="rws-steps-head">
          {title ? <RiwaqHeading id={headingId}>{title}</RiwaqHeading> : null}
          {description ? <p className="rw-lead">{description}</p> : null}
        </div>
        {hasImage ? (
          <RiwaqWindow
            shutter
            develop
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 30vw, 100vw"
            className="rws-steps-plate aspect-[3/2]"
          />
        ) : null}
        <div
          className="rws-timeline"
          style={{ '--rws-count': items.length } as CSSProperties}
        >
          <span aria-hidden className="rws-timeline-rail">
            <span className="rws-timeline-fill" />
          </span>
          <ol className="rws-timeline-list">
          {items.map((item, index) => (
            <li key={item.id} className="rws-timeline-step">
              <Reveal delayMs={riwaqStagger(index)}>
                <span aria-hidden className="rws-timeline-node" />
                <span className="rw-label rw-num rws-timeline-no">
                  {formatRiwaqIndex(index, locale)}
                </span>
                <h3 className="rw-subtitle rws-timeline-title">{item.title}</h3>
                {item.description ? (
                  <p className="rw-body rws-timeline-text">{item.description}</p>
                ) : null}
              </Reveal>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Feature split — the learning experience                              */
/* ------------------------------------------------------------------ */

export function RiwaqFeatureSplit({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'featureSplit'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const description = resolveLocalizedText(config.description, locale);
  const hasImage = !!config.image;
  const items = config.items
    .map((item) => ({
      id: item.id,
      title: resolveLocalizedText(item.title, locale),
      description: resolveLocalizedText(item.description, locale),
    }))
    .filter((item) => item.title);
  return (
    <RiwaqBand labelledBy={headingId}>
      <div
        className="rw-grid rws-split"
        data-image={hasImage ? (config.imagePosition === 'end' ? 'end' : 'start') : undefined}
      >
        {hasImage ? (
          <RiwaqWindow
            shutter
            develop
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 38vw, 100vw"
            className="rws-split-media aspect-[4/5]"
          />
        ) : null}
        <div className="rws-split-copy">
          {eyebrow ? (
            <p className="rw-label" data-mark="">
              {eyebrow}
            </p>
          ) : null}
          <RiwaqHeading id={headingId}>
            {resolveLocalizedText(config.title, locale)}
          </RiwaqHeading>
          {description ? <p className="rw-lead">{description}</p> : null}
          {items.length > 0 ? (
            <ol className="rws-points">
              {items.map((item, index) => (
                <li key={item.id} className="rws-point">
                  <span aria-hidden className="rw-label rw-num rws-point-no">
                    {formatRiwaqIndex(index, locale)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="rws-point-title">{item.title}</h3>
                    {item.description ? (
                      <p className="rw-body rws-point-text">{item.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          <RiwaqAction cta={config.cta} pages={pages} linkRenderer={linkRenderer} />
        </div>
      </div>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery — photographs in the bays of the colonnade                   */
/* ------------------------------------------------------------------ */

export function RiwaqGallery({
  config,
}: SectionRenderProps<'gallery'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const images = config.images.filter((image) => !!image.image);
  if (images.length === 0) return null;
  const title = resolveLocalizedText(config.title, locale);
  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:riwaq.home.gallery.label')}
    >
      <RiwaqSectionHead id={headingId} title={title} />
      <ul className="rws-bays" data-count={Math.min(images.length, 5)}>
        {images.map((image, index) => {
          const caption = resolveLocalizedText(image.caption, locale);
          return (
            <li key={image.id} className="rws-bay">
              <figure className="m-0">
                <RiwaqWindow
                  shutter
                  develop
                  value={image.image}
                  alt={resolveLocalizedText(image.imageAlt, locale)}
                  sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
                  className="rws-bay-window"
                />
                {caption ? (
                  <figcaption className="rw-label rws-bay-caption">
                    <span aria-hidden className="rw-num">
                      {formatRiwaqIndex(index, locale)}
                    </span>
                    {caption}
                  </figcaption>
                ) : null}
              </figure>
            </li>
          );
        })}
      </ul>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* CTA — Enrol, on the deep ground with the turning crest               */
/* ------------------------------------------------------------------ */

export function RiwaqCta({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'cta'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const { name } = useWebsiteIdentity();
  const headingId = useId();
  const description = resolveLocalizedText(config.description, locale);
  const hasImage = !!config.image;
  return (
    <RiwaqBand ground="deep" labelledBy={headingId} className="rws-enrol">
      <div className="rw-grid rws-enrol-grid" data-image={hasImage ? '' : undefined}>
        <div className="rws-enrol-copy">
          {name ? (
            <RiwaqCrest
              name={name}
              turn
              size="clamp(7rem, 5rem + 6vw, 10rem)"
              className="rws-enrol-crest"
            />
          ) : null}
          <RiwaqHeading id={headingId} className="rws-enrol-title">
            {resolveLocalizedText(config.title, locale)}
          </RiwaqHeading>
          {description ? <p className="rw-lead">{description}</p> : null}
          <div className="rws-actions">
            <RiwaqAction cta={config.cta} pages={pages} linkRenderer={linkRenderer} large />
            <RiwaqAction
              cta={config.secondaryCta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant="line"
              large
              arrow={false}
            />
          </div>
        </div>
        {hasImage ? (
          <RiwaqWindow
            shutter
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="rws-enrol-media aspect-[4/3] lg:aspect-[16/9]"
          />
        ) : null}
      </div>
    </RiwaqBand>
  );
}
