/**
 * CMS phase 3d (batch D) — the timeline section's shared body: a learning
 * path ("Term 1 → Term 2 → Final revision") as an ordered list down a
 * spine. Different from `steps` (a short row of numbered columns): this
 * reads top to bottom, each milestone carries its period ("Sept–Oct") and
 * may carry an icon instead of its number.
 *
 * - Semantically an `<ol>`: the order is the content. Markers and the
 *   spine are decoration (`aria-hidden`); a milestone's title is an `h3`
 *   read before its period.
 * - `rail`: the spine runs down the reading side at every width.
 *   `alternate`: from `lg`, the spine is centred and milestones alternate
 *   sides, each hugging the spine; phones always get the rail.
 * - Logical properties only, so the spine sits on the right in Arabic.
 *   No motion.
 */
import type { ReactNode } from 'react';
import { cn } from '@utils';
import { resolveFeatureIcon } from '@/features/website/utils/feature-icons';
import type { PublicWebsiteLocale } from '@types';
import type { ResolvedMilestone } from './journey-proof.logic';

export interface TimelineListClasses {
  /** The list; may set `--tl-marker` (the marker's size, 2.75rem by default). */
  readonly list?: string;
  readonly item?: string;
  /** The spine segment from one marker to the next. */
  readonly line?: string;
  readonly marker?: string;
  /** The text block (a card in some themes). */
  readonly content?: string;
  readonly period?: string;
  readonly title?: string;
  readonly description?: string;
}

const numberFormatters = new Map<PublicWebsiteLocale, Intl.NumberFormat>();

function formatNumber(value: number, locale: PublicWebsiteLocale): string {
  let formatter = numberFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US');
    numberFormatters.set(locale, formatter);
  }
  return formatter.format(value);
}

export function TimelineList({
  milestones,
  locale,
  layout = 'rail',
  renderNumber,
  classes = {},
}: {
  readonly milestones: readonly ResolvedMilestone[];
  readonly locale: PublicWebsiteLocale;
  readonly layout?: 'rail' | 'alternate';
  /** The theme's own numeral for a milestone without an icon (1-based). */
  readonly renderNumber?: (value: number) => ReactNode;
  readonly classes?: TimelineListClasses;
}): JSX.Element {
  const alternate = layout === 'alternate';
  const last = milestones.length - 1;
  return (
    <ol
      data-timeline={layout}
      className={cn('relative [--tl-marker:2.75rem]', classes.list)}
    >
      {milestones.map((milestone, index) => {
        const Icon = milestone.icon
          ? resolveFeatureIcon(milestone.icon)
          : undefined;
        const side = index % 2 === 0 ? 'start' : 'end';
        return (
          <li
            key={milestone.id}
            data-side={alternate ? side : undefined}
            className={cn(
              'relative grid grid-cols-[var(--tl-marker)_minmax(0,1fr)] gap-x-4 pb-8 last:pb-0 sm:gap-x-6 sm:pb-10',
              alternate &&
                'lg:grid-cols-[minmax(0,1fr)_var(--tl-marker)_minmax(0,1fr)] lg:gap-x-10',
              classes.item
            )}
          >
            {index < last ? (
              <span
                aria-hidden
                data-timeline-line=""
                className={cn(
                  'absolute bottom-0 start-[calc(var(--tl-marker)/2_-_1px)] top-[var(--tl-marker)] w-0.5',
                  alternate && 'lg:start-[calc(50%_-_1px)]',
                  classes.line
                )}
              />
            ) : null}
            <span
              aria-hidden
              data-timeline-marker=""
              className={cn(
                'relative z-[1] flex size-[var(--tl-marker)] shrink-0 items-center justify-center',
                alternate && 'lg:col-start-2 lg:row-start-1',
                classes.marker
              )}
            >
              {Icon ? (
                <Icon className="size-[45%]" strokeWidth={1.75} />
              ) : renderNumber ? (
                renderNumber(index + 1)
              ) : (
                formatNumber(index + 1, locale)
              )}
            </span>
            <div
              className={cn(
                'flex min-w-0 flex-col items-start',
                alternate &&
                  (side === 'start'
                    ? 'lg:col-start-1 lg:row-start-1 lg:items-end lg:text-end'
                    : 'lg:col-start-3 lg:row-start-1'),
                classes.content
              )}
            >
              <h3 className={cn('break-words', classes.title)}>
                {milestone.title}
              </h3>
              {/* Shown above the title, read after it. */}
              {milestone.period ? (
                <p className={cn('order-first break-words', classes.period)}>
                  {milestone.period}
                </p>
              ) : null}
              {milestone.description ? (
                <p className={cn('mt-1.5 break-words', classes.description)}>
                  {milestone.description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
