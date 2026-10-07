/**
 * Riwaq FAQ — Admissions (plan §4 #11): the title and the follow-up action
 * in the start rail, the questions as ruled rows that open in place. On the
 * FAQs page the page header's filter narrows the list (shared filter).
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useFaqLibraryEntries } from '@/features/website/hooks';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolveWebsiteCtaHref } from '@/features/website/utils/link-resolution.utils';
import {
  matchesFaqFilter,
  useFaqFilter,
} from '@/features/website/modern-education/t1-faq-filter';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  RiwaqArrow,
  RiwaqBand,
  RiwaqHeading,
  RiwaqLink,
  formatRiwaqIndex,
} from '../riwaq-parts';
import '../riwaq-sections.css';

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
    <li className="rwq-item" data-open={open ? '' : undefined}>
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          className="rwq-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden className="rw-label rw-num rwq-no">
            {formatRiwaqIndex(index, locale)}
          </span>
          <span className="rwq-question">{item.question}</span>
          <span aria-hidden className="rwq-icon">
            <Plus className="size-5" strokeWidth={1.5} />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="rwq-answer"
      >
        <p className="rw-body whitespace-pre-line">{item.answer}</p>
      </div>
    </li>
  );
}

export function RiwaqFaq({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'faq'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const filter = useFaqFilter();
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
  const ctaLabel = config.cta ? resolveLocalizedText(config.cta.label, locale) : '';
  const ctaHref = linkRenderer ? resolveWebsiteCtaHref(config.cta, pages) : undefined;
  const teaser = config.maxItems !== undefined && config.maxItems > 0;
  // The FAQs page: the header's question filter narrows the list.
  const visible = teaser
    ? all.slice(0, config.maxItems)
    : all.filter(
        (item) =>
          matchesFaqFilter(item.question, filter) ||
          matchesFaqFilter(item.answer, filter)
      );

  return (
    <RiwaqBand labelledBy={headingId} colonnade={false}>
      <div className="rw-grid rwq">
        <div className="rwq-aside">
          <div className="rw-head-rail" />
          {title ? (
            <RiwaqHeading id={headingId}>{title}</RiwaqHeading>
          ) : (
            // Untitled (the FAQs page, under its header): a hidden h2 keeps
            // the outline h1 → h2 → question h3s and names the section.
            <h2 id={headingId} className="rw-sr-only">
              {t('website:riwaq.home.faq.listTitle')}
            </h2>
          )}
          {config.cta && ctaLabel ? (
            <RiwaqLink href={ctaHref} linkRenderer={linkRenderer} className="rw-btn rw-btn-line">
              {ctaLabel}
              <RiwaqArrow />
            </RiwaqLink>
          ) : null}
        </div>
        <div className="rwq-main">
          {teaser ? null : (
            <p role="status" aria-live="polite" className="rw-sr-only">
              {filter.trim()
                ? t('website:riwaq.home.faq.resultCount', { count: visible.length })
                : ''}
            </p>
          )}
          {visible.length > 0 ? (
            <ol className="rwq-list">
              {visible.map((item, index) => (
                <FaqQuestion key={item.id} item={item} index={index} />
              ))}
            </ol>
          ) : (
            <div data-faq-no-match="" className="rw-cell" data-tick="">
              <p className="rw-subtitle">{t('website:riwaq.home.faq.noMatchTitle')}</p>
              <p className="rw-body">{t('website:riwaq.home.faq.noMatchDescription')}</p>
            </div>
          )}
        </div>
      </div>
    </RiwaqBand>
  );
}
