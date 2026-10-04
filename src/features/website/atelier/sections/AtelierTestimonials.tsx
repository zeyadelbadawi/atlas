/**
 * Atelier testimonials (plan §5a): an ink chapter with one large pull
 * quote at a time in the display face, the attribution in small caps, and
 * previous / next buttons (wrapping around) with a running count
 * ("02 / 05"). No autoplay.
 * The quote region is a polite live region, so a change is announced; the
 * arrow keys page through it from the focused region, following the
 * reading direction.
 *
 * Library entries come first, then the section's own quotes; sample
 * (starter) testimonials never reach the public site and are labelled
 * "Sample" in previews.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTestimonialLibraryEntries } from '@/features/website/hooks';
import {
  ThemeImage,
  hasRenderableImage,
} from '@/features/website/theme-assets';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  AtelierChapter,
  AtelierMonogram,
  AtelierSectionHeader,
  formatAtelierIndex,
  formatAtelierNumber,
} from '../atelier-parts';
import '../atelier-sections.css';

interface QuoteItem {
  readonly id: string;
  readonly quote: string;
  readonly authorName: string;
  readonly authorRole: string;
  readonly avatar?: string;
  readonly rating?: number;
  readonly sample: boolean;
}

export function AtelierTestimonials({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'testimonials'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale, direction } = usePublicWebsiteLocale();
  const headingId = useId();
  const quoteId = useId();
  const [current, setCurrent] = useState(0);
  const isPublic = !!linkRenderer;
  // Server-resolved on the public site; the preview resolves them itself.
  const libraryItems: QuoteItem[] = useTestimonialLibraryEntries(
    config,
    academyId,
    !isPublic
  ).map((entry) => ({
    id: entry.id,
    quote: resolveLocalizedText(entry.quote, locale),
    authorName: entry.authorName,
    authorRole: resolveLocalizedText(entry.authorRole, locale),
    avatar: entry.avatar,
    sample: false,
  }));
  const inlineItems: QuoteItem[] = config.items
    .filter((item) => !(isPublic && item.sample))
    .map((item) => ({
      id: item.id,
      quote: resolveLocalizedText(item.quote, locale),
      authorName: item.authorName,
      authorRole: resolveLocalizedText(item.authorRole, locale),
      avatar: item.avatar,
      rating: item.rating,
      sample: item.sample === true,
    }));
  const items = [...libraryItems, ...inlineItems].filter((item) => item.quote);
  if (items.length === 0) return null;

  const title = resolveLocalizedText(config.title, locale);
  const total = items.length;
  const index = Math.min(current, total - 1);
  const item = items[index];
  const canPage = total > 1;
  // Paging wraps around, so a button never disables under the focus.
  const go = (delta: number) =>
    setCurrent((value) => (Math.min(value, total - 1) + delta + total) % total);
  // Arrows point the way the reading moves: reversed in Arabic.
  const PrevIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;
  const NextIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <AtelierChapter
      env="ink"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:atelier.home.testimonials.label')}
    >
      {title ? (
        <AtelierSectionHeader id={headingId} title={title} numbered={false} />
      ) : null}
      <div
        className="ath-quote-stage"
        role="group"
        aria-roledescription={t(
          'website:atelier.home.testimonials.roleDescription'
        )}
        aria-label={t('website:atelier.home.testimonials.label')}
        tabIndex={canPage ? 0 : undefined}
        onKeyDown={(event) => {
          if (!canPage) return;
          const back = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
          const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
          if (event.key === back) {
            event.preventDefault();
            go(-1);
          } else if (event.key === forward) {
            event.preventDefault();
            go(1);
          }
        }}
        data-atelier-quotes=""
      >
        <div id={quoteId} aria-live="polite" aria-atomic="true">
          {canPage ? (
            <p className="sr-only">
              {t('website:atelier.home.testimonials.position', {
                position: formatAtelierNumber(index + 1, locale),
                total: formatAtelierNumber(total, locale),
              })}
            </p>
          ) : null}
          <figure key={item.id} className="ath-quote">
            {item.sample ? (
              <p data-sample-badge="" className="ath-sample-badge">
                {t('website:renderer.testimonials.sampleBadge')}
              </p>
            ) : null}
            <blockquote className="at-serif ath-quote-text">
              <p>“{item.quote}”</p>
            </blockquote>
            <figcaption className="ath-quote-by">
              {hasRenderableImage(item.avatar) ? (
                <ThemeImage
                  value={item.avatar}
                  sizes="48px"
                  loading="lazy"
                  alt=""
                  className="ath-quote-avatar object-cover"
                />
              ) : (
                <AtelierMonogram
                  name={item.authorName}
                  className="ath-quote-avatar"
                />
              )}
              <span className="min-w-0">
                <span className="ath-quote-name" dir="auto">
                  {item.authorName}
                </span>
                {item.authorRole ? (
                  <span className="at-label block">{item.authorRole}</span>
                ) : null}
                {item.rating ? (
                  <span className="at-label block" data-atlas-numeric="true">
                    {t('website:atelier.home.testimonials.rating', {
                      rating: formatAtelierNumber(item.rating, locale),
                    })}
                  </span>
                ) : null}
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
      {canPage ? (
        <div className="ath-quote-controls">
          <p aria-hidden className="ath-quote-count" data-atlas-numeric="true">
            <span className="at-numeral">
              {formatAtelierIndex(index, locale)}
            </span>
            <span className="ath-quote-count-sep">/</span>
            <span>{formatAtelierIndex(total - 1, locale)}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="at-btn-ink-ghost ath-icon-btn"
              onClick={() => go(-1)}
              aria-controls={quoteId}
              aria-label={t('website:atelier.home.testimonials.previous')}
            >
              <PrevIcon className="size-5" strokeWidth={1.5} aria-hidden />
            </button>
            <button
              type="button"
              className="at-btn-ink-ghost ath-icon-btn"
              onClick={() => go(1)}
              aria-controls={quoteId}
              aria-label={t('website:atelier.home.testimonials.next')}
            >
              <NextIcon className="size-5" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </AtelierChapter>
  );
}
