/**
 * Theme 1 authored-content sections on Home (plan §C.1 #2, #5, #6, #11):
 * the highlights band, the image-and-benefits split, "How it works" and
 * the final ink CTA band. It also has the v1 `about` text block, which
 * existing Theme 1 academies have on Home (Decision 3).
 */
import { useId } from 'react';
import { cn } from '@utils';
import { resolveFeatureIcon } from '../utils/feature-icons';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { Reveal } from '../primitives';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import {
  BrandShapeSoft,
  T1Action,
  T1Heading,
  T1Media,
  T1Section,
  T1SectionHeader,
  formatT1Number,
} from './t1-parts';

/** §G: a group rises with a 50ms stagger, capped at 400ms in total. */
const stagger = (index: number) => Math.min(index * 50, 400);

/* ------------------------------------------------------------------ */
/* Highlights band (features, layout strip) and feature cards           */
/* ------------------------------------------------------------------ */

export function T1Features({
  config,
}: SectionRenderProps<'features'>): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);
  const items = config.items
    .map((item) => ({
      id: item.id,
      Icon: resolveFeatureIcon(item.icon),
      title: resolveLocalizedText(item.title, locale),
      description: resolveLocalizedText(item.description, locale),
    }))
    .filter((item) => item.title);
  if (items.length === 0) return null;

  // The compact band under the hero: icon + title + one line, no cards.
  if (config.layout === 'strip') {
    return (
      <T1Section
        tone="soft"
        labelledBy={title ? headingId : undefined}
        className="!py-12 md:!py-14"
      >
        {title ? (
          <h2 id={headingId} className="sr-only">
            {title}
          </h2>
        ) : null}
        <ul
          className={cn(
            'grid gap-x-8 gap-y-8 sm:grid-cols-2',
            items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
          )}
        >
          {items.map((item, index) => (
            <li key={item.id}>
              <Reveal
                delayMs={stagger(index)}
                className="flex items-start gap-4"
              >
                <span className="t1-icon-tile">
                  <item.Icon
                    className="size-6"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-[var(--website-foreground)]">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-1 break-words text-sm leading-relaxed text-[var(--website-foreground-muted)]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </T1Section>
    );
  }

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader id={headingId} title={title} description={description} />
      <ul
        className={cn(
          'grid gap-6 sm:grid-cols-2',
          items.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        )}
      >
        {items.map((item, index) => (
          <li key={item.id}>
            <Reveal delayMs={stagger(index)} className="h-full">
              <div className="t1-card h-full p-7">
                <span className="t1-icon-tile">
                  <item.Icon
                    className="size-6"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <h3 className="mt-5 break-words text-lg font-semibold text-[var(--website-foreground)]">
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="mt-2 break-words leading-relaxed text-[var(--website-foreground-muted)]">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Why us — image + numbered benefits (featureSplit)                    */
/* ------------------------------------------------------------------ */

export function T1FeatureSplit({
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
    <div className="min-w-0 space-y-8">
      <div className="space-y-4">
        {eyebrow ? <p className="t1-eyebrow">{eyebrow}</p> : null}
        <T1Heading id={headingId}>
          {resolveLocalizedText(config.title, locale)}
        </T1Heading>
        {description ? <p className="t1-lead">{description}</p> : null}
      </div>
      {items.length > 0 ? (
        <ol
          className={cn(
            'grid gap-6',
            !hasImage && 'md:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {items.map((item, index) => (
            <li key={item.id}>
              <Reveal delayMs={stagger(index)} className="flex gap-4">
                <span className="t1-number" aria-hidden>
                  {formatT1Number(index + 1, locale)}
                </span>
                <div className="min-w-0 pt-2">
                  <h3 className="break-words font-semibold text-[var(--website-foreground)]">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-1 break-words leading-relaxed text-[var(--website-foreground-muted)]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      ) : null}
      <T1Action
        cta={config.cta}
        pages={pages}
        linkRenderer={linkRenderer}
        variant="link"
        arrow
      />
    </div>
  );

  if (!hasImage) {
    return <T1Section labelledBy={headingId}>{text}</T1Section>;
  }

  return (
    <T1Section labelledBy={headingId}>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div
          className={cn(
            'relative mx-auto w-full max-w-2xl pb-5 lg:max-w-none',
            imageEnd && 'lg:order-last'
          )}
        >
          {/* The brand block sits offset behind the photograph, toward the
              page edge (logical start or end, so it mirrors in Arabic). */}
          <BrandShapeSoft
            className={cn(
              'top-5 hidden h-[calc(100%-1.25rem)] w-full sm:block',
              imageEnd ? 'start-5' : 'end-5'
            )}
          />
          <T1Media
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 600px, (min-width: 672px) 672px, 100vw"
            className={cn(
              'aspect-[4/3] sm:w-[calc(100%-1.25rem)]',
              imageEnd && 'sm:ms-5'
            )}
          />
        </div>
        {text}
      </div>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works (steps)                                                  */
/* ------------------------------------------------------------------ */

const STEP_COLUMNS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

export function T1Steps({
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
  // Five or six steps wrap into rows, where one connector can't follow the order.
  const connected = items.length >= 2 && items.length <= 4;

  return (
    <T1Section tone="soft" labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <ol
        className={cn(
          'grid gap-8 md:gap-6',
          connected
            ? STEP_COLUMNS[items.length]
            : 'md:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {items.map((item, index) => (
          <li key={item.id} className={connected ? 't1-step' : 'relative'}>
            <Reveal
              delayMs={stagger(index)}
              className="flex gap-5 md:flex-col md:gap-5"
            >
              <span className="t1-number relative z-[1]" aria-hidden>
                {formatT1Number(index + 1, locale)}
              </span>
              <div className="min-w-0 md:pe-6">
                <h3 className="break-words text-lg font-semibold text-[var(--website-foreground)]">
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="mt-1.5 break-words leading-relaxed text-[var(--website-foreground-muted)]">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA — the ink band                                              */
/* ------------------------------------------------------------------ */

export function T1Cta({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'cta'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const description = resolveLocalizedText(config.description, locale);
  const hasImage = !!config.image;

  const actions = (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 pt-2',
        !hasImage && 'justify-center'
      )}
    >
      <T1Action
        cta={config.cta}
        pages={pages}
        linkRenderer={linkRenderer}
        variant="ink"
        arrow
      />
      <T1Action
        cta={config.secondaryCta}
        pages={pages}
        linkRenderer={linkRenderer}
        variant="inkSecondary"
      />
    </div>
  );

  const text = (
    <div
      className={cn(
        'min-w-0 space-y-5',
        hasImage ? 'md:py-[var(--t1-rhythm)]' : 'mx-auto max-w-3xl text-center'
      )}
    >
      <T1Heading
        id={headingId}
        className="!text-[var(--website-ink-foreground)]"
      >
        {resolveLocalizedText(config.title, locale)}
      </T1Heading>
      {description ? (
        <p
          className={cn(
            't1-lead !text-[var(--website-ink-muted)]',
            !hasImage && 'mx-auto'
          )}
        >
          {description}
        </p>
      ) : null}
      {actions}
    </div>
  );

  if (!hasImage) {
    return (
      <T1Section tone="ink" labelledBy={headingId}>
        {text}
      </T1Section>
    );
  }

  // With a photograph: it stands on the band's lower edge at the logical
  // end (left in Arabic), from phones of 480px up. Under 480px the band is
  // text only, so the action stays in view.
  return (
    <T1Section
      tone="ink"
      labelledBy={headingId}
      className="md:!py-0 min-[480px]:!pb-0"
    >
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_16rem] md:items-end md:gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-20">
        {text}
        <T1Media
          value={config.image}
          alt={resolveLocalizedText(config.imageAlt, locale)}
          sizes="(min-width: 1024px) 320px, (min-width: 768px) 256px, 240px"
          className="mx-auto hidden aspect-[3/4] w-60 !rounded-b-none min-[480px]:block md:mx-0 md:mt-12 md:w-full"
        />
      </div>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* About (the v1 text block on existing Homes)                           */
/* ------------------------------------------------------------------ */

export function T1About({ config }: SectionRenderProps<'about'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const hasImage = !!config.image;
  return (
    <T1Section labelledBy={headingId}>
      <div
        className={cn(
          'grid items-center gap-12',
          hasImage ? 'lg:grid-cols-2 lg:gap-20' : 'max-w-3xl'
        )}
      >
        <div className="min-w-0 space-y-5">
          <T1Heading id={headingId}>
            {resolveLocalizedText(config.title, locale)}
          </T1Heading>
          <p className="t1-lead whitespace-pre-line">
            {resolveLocalizedText(config.body, locale)}
          </p>
        </div>
        {hasImage ? (
          <T1Media
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 600px, 100vw"
            className="aspect-[4/3]"
          />
        ) : null}
      </div>
    </T1Section>
  );
}
