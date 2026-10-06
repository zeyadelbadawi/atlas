/**
 * Manara FAQ — Before you join (plan §3.10 #10): the title and the link to
 * the rest on the start side, a numbered bold accordion on the end side.
 * Each question is a heading holding a button (`aria-expanded`,
 * `aria-controls`) that opens its answer region.
 *
 * With `maxItems` it is the Home teaser (the first N). Without it, it is
 * the full list, which the FAQs page banner's question filter narrows —
 * the same shared filter store Theme 1 and Atelier use.
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
  ManaraArrow,
  ManaraBlock,
  ManaraHeading,
  ManaraLink,
  formatManaraIndex,
} from '../manara-parts';
import '../manara-sections.css';

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
    <li className="mnh-faq-item" data-open={open ? '' : undefined}>
      <h3>
        <button
          id={buttonId}
          type="button"
          className="mnh-faq-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span
            aria-hidden
            className="mn-font-display mnh-faq-no"
            data-atlas-numeric="true"
          >
            {formatManaraIndex(index, locale)}
          </span>
          <span className="mn-subtitle mnh-faq-question">{item.question}</span>
          <span aria-hidden className="mnh-faq-icon">
            <Plus className="size-5" strokeWidth={2.5} />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="mnh-faq-answer"
      >
        <p className="mn-body mn-muted whitespace-pre-line">{item.answer}</p>
      </div>
    </li>
  );
}

export function ManaraFaq({
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
      <ManaraLink
        href={ctaHref}
        linkRenderer={linkRenderer}
        className="mn-btn mn-btn-block"
      >
        {ctaLabel}
        <ManaraArrow />
      </ManaraLink>
    ) : null;

  const teaser = config.maxItems !== undefined && config.maxItems > 0;
  // The FAQs page: the banner's question filter narrows the list.
  const visible = teaser
    ? all.slice(0, config.maxItems)
    : all.filter(
        (item) =>
          matchesFaqFilter(item.question, filter) ||
          matchesFaqFilter(item.answer, filter)
      );

  return (
    <ManaraBlock env="soft" labelledBy={headingId} className="mnh-faq">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <div className="mnh-faq-aside">
            {title ? (
              <ManaraHeading id={headingId}>{title}</ManaraHeading>
            ) : (
              // Untitled (the FAQs page, under its banner): a hidden h2
              // keeps the outline h1 → h2 → question h3s and names the
              // section.
              <h2 id={headingId} className="mn-sr-only">
                {t('website:manara.home.faq.listTitle')}
              </h2>
            )}
            {more ? <div>{more}</div> : null}
          </div>
        </div>
        <div className="min-w-0 lg:col-span-8">
          {teaser ? null : (
            <p role="status" aria-live="polite" className="mn-sr-only">
              {filter.trim()
                ? t('website:manara.home.faq.resultCount', {
                    count: visible.length,
                  })
                : ''}
            </p>
          )}
          {visible.length > 0 ? (
            <ol className="mnh-faq-list">
              {visible.map((item, index) => (
                <FaqQuestion key={item.id} item={item} index={index} />
              ))}
            </ol>
          ) : (
            <div data-faq-no-match="" className="mnh-notice">
              <p className="mn-subtitle">
                {t('website:manara.home.faq.noMatchTitle')}
              </p>
              <p className="mn-body mn-muted">
                {t('website:manara.home.faq.noMatchDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
    </ManaraBlock>
  );
}
