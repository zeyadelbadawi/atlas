/**
 * Atelier FAQ (plan §5a): two columns — the title and the link to the rest
 * on the start side (sticky on desktop), a hairline accordion of numbered
 * questions on the end side. Each question is a heading holding a button
 * (`aria-expanded`, `aria-controls`) that opens its answer region.
 *
 * With `maxItems` it is the Home teaser (the first N). Without it, it is
 * the full list, which the FAQs page hero's question filter narrows — the
 * same shared filter store Theme 1 uses.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useFaqLibraryEntries } from '../../hooks';
import { usePublicWebsiteLocale } from '../../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../../utils/localized-text.utils';
import { resolveWebsiteCtaHref } from '../../utils/link-resolution.utils';
import {
  matchesFaqFilter,
  useFaqFilter,
} from '../../modern-education/t1-faq-filter';
import type { SectionRenderProps } from '../../theme-packs/theme-pack.types';
import {
  AtelierChapter,
  AtelierHeading,
  AtelierLink,
  formatAtelierIndex,
} from '../atelier-parts';
import '../atelier-sections.css';

interface FaqEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

function FaqQuestion({
  item,
  index,
}: {
  readonly item: FaqEntry;
  readonly index: number;
}): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const panelId = useId();
  return (
    <li className="ath-faq-item" data-open={open ? '' : undefined}>
      <h3>
        <button
          id={buttonId}
          type="button"
          className="ath-faq-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden className="at-numeral ath-faq-no">
            {formatAtelierIndex(index, locale)}
          </span>
          <span className="ath-faq-question">{item.question}</span>
          <Plus aria-hidden className="ath-faq-icon" strokeWidth={1.25} />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="ath-faq-answer"
      >
        <p className="whitespace-pre-line">{item.answer}</p>
      </div>
    </li>
  );
}

export function AtelierFaq({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'faq'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const filter = useFaqFilter();
  // Server-resolved on the public site; the preview resolves them itself.
  const libraryItems: FaqEntry[] = useFaqLibraryEntries(
    config,
    academyId,
    !linkRenderer
  ).map((entry) => ({
    id: entry.id,
    question: resolveLocalizedText(entry.question, locale),
    answer: resolveLocalizedText(entry.answer, locale),
  }));
  const inlineItems: FaqEntry[] = config.items.map((item) => ({
    id: item.id,
    question: resolveLocalizedText(item.question, locale),
    answer: resolveLocalizedText(item.answer, locale),
  }));
  const all = [...libraryItems, ...inlineItems].filter((item) => item.question);
  if (all.length === 0) return null;

  const title = resolveLocalizedText(config.title, locale);
  const ctaLabel = config.cta
    ? resolveLocalizedText(config.cta.label, locale)
    : '';
  const ctaHref = linkRenderer
    ? resolveWebsiteCtaHref(config.cta, pages)
    : undefined;
  const more =
    config.cta && ctaLabel ? (
      <AtelierLink href={ctaHref} linkRenderer={linkRenderer} className="at-link">
        {ctaLabel}
      </AtelierLink>
    ) : null;

  const teaser = config.maxItems !== undefined && config.maxItems > 0;
  // The FAQs page: the hero's question filter narrows the list.
  const visible = teaser
    ? all.slice(0, config.maxItems)
    : all.filter(
        (item) =>
          matchesFaqFilter(item.question, filter) ||
          matchesFaqFilter(item.answer, filter)
      );

  return (
    <AtelierChapter labelledBy={headingId}>
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <div className="ath-faq-aside">
            <span aria-hidden className="at-knot" />
            <div className="space-y-6">
              {title ? (
                <AtelierHeading id={headingId}>{title}</AtelierHeading>
              ) : (
                // Untitled (the FAQs page, under its hero): a hidden h2
                // keeps the outline h1 → h2 → question h3s and names the
                // section.
                <h2 id={headingId} className="sr-only">
                  {t('website:atelier.home.faq.listTitle')}
                </h2>
              )}
              {more}
            </div>
          </div>
        </div>
        <div className="min-w-0 lg:col-span-8">
          {teaser ? null : (
            <p role="status" aria-live="polite" className="sr-only">
              {filter.trim()
                ? t('website:atelier.home.faq.resultCount', {
                    count: visible.length,
                  })
                : ''}
            </p>
          )}
          {visible.length > 0 ? (
            <ol className="ath-faq-list">
              {visible.map((item, index) => (
                <FaqQuestion key={item.id} item={item} index={index} />
              ))}
            </ol>
          ) : (
            <div data-faq-no-match="" className="ath-notice">
              <p className="at-serif ath-notice-title">
                {t('website:atelier.home.faq.noMatchTitle')}
              </p>
              <p className="at-lead">
                {t('website:atelier.home.faq.noMatchDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
    </AtelierChapter>
  );
}
