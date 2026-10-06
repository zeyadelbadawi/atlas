/**
 * Manara testimonials — Students say (plan §3.10 #8): a night block with
 * one large quote at a time under a huge decorative quote glyph, the
 * attribution as pills, and previous / next buttons (wrapping around) with
 * a running count ("02 / 05"). No autoplay.
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
  ManaraBlock,
  ManaraMonogram,
  ManaraPill,
  ManaraSectionHeader,
  formatManaraIndex,
  formatManaraNumber,
} from '../manara-parts';
import '../manara-sections.css';

interface QuoteItem {
  readonly id: string;
  readonly quote: string;
  readonly authorName: string;
  readonly authorRole: string;
  readonly avatar?: string;
  readonly rating?: number;
  readonly sample: boolean;
}

export function ManaraTestimonials({
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
    <ManaraBlock
      env="night"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:manara.home.testimonials.label')}
      className="mnh-quotes"
    >
      {title ? <ManaraSectionHeader id={headingId} title={title} /> : null}
      <div
        className="mnh-quote-stage"
        role="group"
        aria-roledescription={t(
          'website:manara.home.testimonials.roleDescription'
        )}
        aria-label={t('website:manara.home.testimonials.label')}
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
        data-manara-quotes=""
      >
        <span aria-hidden className="mnh-quote-glyph">
          “
        </span>
        <div id={quoteId} aria-live="polite" aria-atomic="true">
          {canPage ? (
            <p className="mn-sr-only">
              {t('website:manara.home.testimonials.position', {
                position: formatManaraNumber(index + 1, locale),
                total: formatManaraNumber(total, locale),
              })}
            </p>
          ) : null}
          <figure key={item.id} className="mnh-quote">
            {item.sample ? (
              <p data-sample-badge="" className="mnh-sample-badge">
                {t('website:renderer.testimonials.sampleBadge')}
              </p>
            ) : null}
            <blockquote className="mnh-quote-text">
              <p>{item.quote}</p>
            </blockquote>
            <figcaption className="mnh-quote-by">
              {hasRenderableImage(item.avatar) ? (
                <ThemeImage
                  value={item.avatar}
                  sizes="56px"
                  loading="lazy"
                  alt=""
                  className="mnh-quote-avatar object-cover"
                />
              ) : (
                <ManaraMonogram
                  name={item.authorName}
                  className="mnh-quote-avatar"
                />
              )}
              <span className="mnh-quote-pills">
                <ManaraPill tone="accent" className="mnh-quote-name">
                  <span dir="auto">{item.authorName}</span>
                </ManaraPill>
                {item.authorRole ? (
                  <ManaraPill>{item.authorRole}</ManaraPill>
                ) : null}
                {item.rating ? (
                  <ManaraPill>
                    <span data-atlas-numeric="true">
                      {t('website:manara.home.testimonials.rating', {
                        rating: formatManaraNumber(item.rating, locale),
                      })}
                    </span>
                  </ManaraPill>
                ) : null}
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
      {canPage ? (
        <div className="mnh-quote-controls">
          <p
            aria-hidden
            className="mnh-quote-count mn-font-display"
            data-atlas-numeric="true"
          >
            <span className="mnh-quote-count-now">
              {formatManaraIndex(index, locale)}
            </span>
            <span className="mnh-quote-count-sep">/</span>
            <span>{formatManaraIndex(total - 1, locale)}</span>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="mn-btn mn-btn-outline mnh-icon-btn"
              onClick={() => go(-1)}
              aria-controls={quoteId}
              aria-label={t('website:manara.home.testimonials.previous')}
            >
              <PrevIcon className="size-5" strokeWidth={2.25} aria-hidden />
            </button>
            <button
              type="button"
              className="mn-btn mn-btn-outline mnh-icon-btn"
              onClick={() => go(1)}
              aria-controls={quoteId}
              aria-label={t('website:manara.home.testimonials.next')}
            >
              <NextIcon className="size-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </ManaraBlock>
  );
}
