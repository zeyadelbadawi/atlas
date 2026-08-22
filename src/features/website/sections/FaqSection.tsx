/**
 * FAQ Section.
 *
 * Reuses Atlas's existing accessible `Accordion` primitive — never a
 * hand-rolled disclosure widget. Renders TWO sources of FAQ content,
 * additively and in this fixed order: library entries resolved live from
 * the Academy's reusable FAQ content (Prompt 10, `WebsiteFaqEntry`) come
 * first, followed by the page's own inline `items` (Prompt 9, unchanged).
 * A page saved before Prompt 10 has no `libraryEntryIds`, so it renders
 * exactly as it always has.
 */
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useWebsiteFaqEntries } from '../hooks';
import { useWebsiteContainerClass, useWebsiteHeadingClass, useWebsiteSectionClass } from '../renderer/renderer-style.utils';
import type { FaqSectionConfig, LanguageCode } from '@types';

export interface FaqSectionProps {
  readonly config: FaqSectionConfig;
  readonly academyId: string;
}

export function FaqSection({ config, academyId }: FaqSectionProps): JSX.Element {
  const { i18n } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const language = i18n.language as LanguageCode;

  const libraryEntryIds = config.libraryEntryIds ?? [];
  const { data } = useWebsiteFaqEntries(academyId, {
    query: { filters: { status: 'published' } },
    enabled: libraryEntryIds.length > 0,
  });

  const libraryItems = libraryEntryIds
    .map((id) => data?.items.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => !!entry && entry.visible)
    .map((entry) => ({
      id: entry.id,
      question: entry.question[language] || entry.question.en,
      answer: entry.answer[language] || entry.answer.en,
    }));

  const allItems = [...libraryItems, ...config.items];

  return (
    <section className={`${container} ${section}`}>
      {config.title ? (
        <h2 className={`${heading} mb-8 text-center text-3xl text-foreground`}>{config.title}</h2>
      ) : null}
      <Accordion type="single" collapsible className="mx-auto max-w-2xl">
        {allItems.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger className="text-start">{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
