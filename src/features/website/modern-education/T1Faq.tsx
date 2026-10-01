/**
 * Theme 1 FAQ (plan §C.1 #10). With `maxItems` it's the Home teaser: a
 * split with the heading and a link to the rest on one side and the first
 * questions on the other. Without it, it's the full list, which the FAQs
 * page hero's question filter narrows (§C.5).
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useWebsiteFaqEntries } from '../hooks';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { resolveWebsiteCtaHref } from '../utils/link-resolution.utils';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import { T1Arrow, T1Heading, T1Link, T1Section } from './t1-parts';
import { matchesFaqFilter, useFaqFilter } from './t1-faq-filter';

interface FaqEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

function FaqList({
  items,
}: {
  readonly items: readonly FaqEntry[];
}): JSX.Element {
  return (
    <Accordion type="single" collapsible className="space-y-3">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className="t1-card border px-5 md:px-6"
        >
          <AccordionTrigger className="t1-faq-trigger min-h-14 gap-4 py-5 text-start text-base font-semibold text-[var(--website-foreground)] hover:no-underline md:text-lg [&>svg]:size-5 [&>svg]:text-[var(--website-link)] motion-reduce:[&>svg]:transition-none">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-base leading-relaxed text-[var(--website-foreground-muted)]">
            <p className="whitespace-pre-line">{item.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function T1Faq({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'faq'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const filter = useFaqFilter();
  const libraryIds = config.libraryEntryIds ?? [];
  const { data } = useWebsiteFaqEntries(academyId, {
    query: { filters: { status: 'published' } },
    enabled: libraryIds.length > 0,
  });
  const libraryItems: FaqEntry[] = libraryIds
    .map((id) => data?.items.find((entry) => entry.id === id))
    .filter(
      (entry): entry is NonNullable<typeof entry> => !!entry && entry.visible
    )
    .map((entry) => ({
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
      <T1Link href={ctaHref} linkRenderer={linkRenderer} className="t1-link">
        {ctaLabel}
        <T1Arrow />
      </T1Link>
    ) : null;

  if (config.maxItems !== undefined && config.maxItems > 0) {
    return (
      <T1Section labelledBy={title ? headingId : undefined}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div className="space-y-4">
            {title ? <T1Heading id={headingId}>{title}</T1Heading> : null}
            {more}
          </div>
          <FaqList items={all.slice(0, config.maxItems)} />
        </div>
      </T1Section>
    );
  }

  // The FAQs page: the hero's question filter narrows the list (Phase 6).
  const visible = all.filter(
    (item) =>
      matchesFaqFilter(item.question, filter) ||
      matchesFaqFilter(item.answer, filter)
  );
  return (
    <T1Section labelledBy={headingId}>
      <div className="mx-auto max-w-3xl">
        {title ? (
          <T1Heading id={headingId} className="mb-10 text-center md:mb-12">
            {title}
          </T1Heading>
        ) : (
          // Untitled (the FAQs page, under its hero): a hidden h2 keeps the
          // outline h1 → h2 → question h3s and names the section.
          <h2 id={headingId} className="sr-only">
            {t('website:theme1.faq.listTitle')}
          </h2>
        )}
        <p role="status" aria-live="polite" className="sr-only">
          {filter.trim()
            ? t('website:theme1.faq.resultCount', { count: visible.length })
            : ''}
        </p>
        {visible.length > 0 ? (
          <FaqList items={visible} />
        ) : (
          <div
            data-faq-no-match=""
            className="t1-card flex flex-col items-center gap-3 px-6 py-12 text-center"
          >
            <SearchX
              className="size-8 text-[var(--website-foreground-muted)]"
              aria-hidden
            />
            <p className="font-semibold text-[var(--website-foreground)]">
              {t('website:theme1.faq.noMatchTitle')}
            </p>
            <p className="text-sm text-[var(--website-foreground-muted)]">
              {t('website:theme1.faq.noMatchDescription')}
            </p>
          </div>
        )}
        {more ? <div className="mt-8 flex justify-center">{more}</div> : null}
      </div>
    </T1Section>
  );
}
