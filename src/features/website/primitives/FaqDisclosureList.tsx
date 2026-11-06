/**
 * A list of questions that open their answers in place (SEO/AEO/GEO pass,
 * Nov 2026) — the FAQ accordion of Theme 1 and the shared `FaqSection`.
 *
 * It replaces Radix's Accordion there for one reason: Radix renders a
 * closed panel's children not at all (`isOpen && children`, even with
 * `forceMount`), so every answer was missing from the server-rendered
 * page — search and answer engines read the questions and none of the
 * answers. Here every answer is in the HTML, in a `hidden` region until
 * its question is opened (as the Atelier, Manara and Riwaq FAQs already
 * do), and the markup and classes match what the Radix version produced:
 * an `h3` holding a `button` (`aria-expanded`, `aria-controls`,
 * `data-state`) and its `role="region"` panel. One answer open at a time,
 * and an open one closes again, as before.
 */
import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@utils';

export interface FaqDisclosureItem {
  readonly id: string;
  readonly question: ReactNode;
  readonly answer: ReactNode;
}

export interface FaqDisclosureListProps {
  readonly items: readonly FaqDisclosureItem[];
  readonly className?: string;
  readonly itemClassName?: string;
  readonly triggerClassName?: string;
  readonly contentClassName?: string;
}

export function FaqDisclosureList({
  items,
  className,
  itemClassName,
  triggerClassName,
  contentClassName,
}: FaqDisclosureListProps): JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();
  return (
    <div className={className}>
      {items.map((item, index) => {
        const open = openId === item.id;
        const state = open ? 'open' : 'closed';
        const buttonId = `${baseId}-q${index}`;
        const panelId = `${baseId}-a${index}`;
        return (
          <div
            key={item.id}
            data-state={state}
            className={cn('border-b', itemClassName)}
          >
            <h3 className="flex">
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                data-state={state}
                onClick={() => setOpenId(open ? null : item.id)}
                className={cn(
                  'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
                  triggerClassName
                )}
              >
                {item.question}
                <ChevronDown
                  aria-hidden
                  className="h-4 w-4 shrink-0 transition-transform duration-200"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              data-state={state}
              hidden={!open}
              className="overflow-hidden text-sm"
            >
              <div className={cn('pb-4 pt-0', contentClassName)}>
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
