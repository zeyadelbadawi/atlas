/**
 * FAQ Section.
 *
 * Reuses Atlas's existing accessible `Accordion` primitive — never a
 * hand-rolled disclosure widget.
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useWebsiteContainerClass, useWebsiteHeadingClass, useWebsiteSectionClass } from '../renderer/renderer-style.utils';
import type { FaqSectionConfig } from '@types';

export interface FaqSectionProps {
  readonly config: FaqSectionConfig;
}

export function FaqSection({ config }: FaqSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();

  return (
    <section className={`${container} ${section}`}>
      {config.title ? (
        <h2 className={`${heading} mb-8 text-center text-3xl text-foreground`}>{config.title}</h2>
      ) : null}
      <Accordion type="single" collapsible className="mx-auto max-w-2xl">
        {config.items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger className="text-start">{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
