/**
 * Riwaq testimonials — On the record (plan §4 #10): on the deep ground,
 * joined to the figures, one statement at a time beside its attribution
 * stub; previous/next and "02 / 05"; no autoplay. Samples never show on the
 * public site; library entries are resolved by the server there.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTestimonialLibraryEntries } from '@/features/website/hooks';
import { ThemeImage, hasRenderableImage } from '@/features/website/theme-assets';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  RiwaqBand,
  RiwaqMonogram,
  RiwaqSectionHead,
  formatRiwaqIndex,
  formatRiwaqNumber,
} from '../riwaq-parts';
import '../riwaq-sections.css';

interface QuoteItem {
  readonly id: string;
  readonly quote: string;
  readonly authorName: string;
  readonly authorRole: string;
  readonly avatar?: string;
  readonly rating?: number;
  readonly sample: boolean;
}

export function RiwaqTestimonials({
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
    <RiwaqBand
      ground="deep"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:riwaq.home.testimonials.label')}
    >
      {title ? <RiwaqSectionHead id={headingId} title={title} /> : null}
      <div
        className="rw-grid rwt"
        role="group"
        aria-roledescription={t('website:riwaq.home.testimonials.roleDescription')}
        aria-label={t('website:riwaq.home.testimonials.label')}
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
        data-riwaq-quotes=""
      >
        <div id={quoteId} aria-live="polite" aria-atomic="true" className="rwt-stage">
          {canPage ? (
            <p className="rw-sr-only">
              {t('website:riwaq.home.testimonials.position', {
                position: formatRiwaqNumber(index + 1, locale),
                total: formatRiwaqNumber(total, locale),
              })}
            </p>
          ) : null}
          <figure key={item.id} className="rwt-quote">
            <blockquote className="rwt-text">
              <p>{item.quote}</p>
            </blockquote>
            <figcaption className="rwt-by">
              {hasRenderableImage(item.avatar) ? (
                <ThemeImage
                  value={item.avatar}
                  sizes="56px"
                  loading="lazy"
                  alt=""
                  className="rwt-avatar object-cover"
                />
              ) : (
                <RiwaqMonogram name={item.authorName} />
              )}
              <span className="min-w-0">
                <span className="rwt-name" dir="auto">
                  {item.authorName}
                </span>
                {item.authorRole ? (
                  <span className="rw-label rwt-role">{item.authorRole}</span>
                ) : null}
                {item.rating ? (
                  <span className="rw-label rw-num rwt-role">
                    {t('website:riwaq.home.testimonials.rating', {
                      rating: formatRiwaqNumber(item.rating, locale),
                    })}
                  </span>
                ) : null}
                {item.sample ? (
                  <span data-sample-badge="" className="rw-badge rwt-sample">
                    {t('website:renderer.testimonials.sampleBadge')}
                  </span>
                ) : null}
              </span>
            </figcaption>
          </figure>
        </div>
        {canPage ? (
          <div className="rwt-controls">
            <p aria-hidden className="rw-label rw-num rwt-count">
              <span className="rwt-count-now">{formatRiwaqIndex(index, locale)}</span>
              <span> / </span>
              <span>{formatRiwaqIndex(total - 1, locale)}</span>
            </p>
            <div className="rwt-buttons">
              <button
                type="button"
                className="rw-btn rw-btn-line rwt-icon"
                onClick={() => go(-1)}
                aria-controls={quoteId}
                aria-label={t('website:riwaq.home.testimonials.previous')}
              >
                <PrevIcon className="size-5" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="rw-btn rw-btn-line rwt-icon"
                onClick={() => go(1)}
                aria-controls={quoteId}
                aria-label={t('website:riwaq.home.testimonials.next')}
              >
                <NextIcon className="size-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </RiwaqBand>
  );
}
