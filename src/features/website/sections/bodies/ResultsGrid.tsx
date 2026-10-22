/**
 * CMS phase 3d — the results section's shared body (`results`): a card per
 * student with a photo (or their initials, like a testimonial without a
 * photo), the result set large, the name and the detail.
 *
 * - A top achiever carries a labelled badge — an icon AND text, never a
 *   colour alone.
 * - Sample (starter) results never reach the public site (the API strips
 *   them; this is the second guard) and are labelled "Sample" in previews.
 * - Photos load lazily into a fixed square, so nothing shifts.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { cn } from '@utils';
import {
  ThemeImage,
  hasRenderableImage,
} from '@/features/website/theme-assets';
import type { ResolvedResult } from './section-bodies.logic';

/** Columns from tablets up, by how many results there are (at most four). */
const WIDE_COLUMNS: Record<number, string> = {
  1: 'md:grid-cols-2',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-3 xl:grid-cols-4',
};

export interface ResultsGridClasses {
  readonly list?: string;
  readonly card?: string;
  /** The square the photo or initials sit in. */
  readonly media?: string;
  readonly result?: string;
  readonly name?: string;
  readonly detail?: string;
  readonly topBadge?: string;
  readonly sampleBadge?: string;
}

export function ResultsGrid({
  results,
  renderInitials,
  classes = {},
}: {
  readonly results: readonly ResolvedResult[];
  /** The theme's own initials plate for a student without a photo. */
  readonly renderInitials: (name: string) => ReactNode;
  readonly classes?: ResultsGridClasses;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <ul
      role="list"
      data-results-grid=""
      className={cn(
        'grid grid-cols-2 gap-3 sm:gap-5',
        // Never more columns than results, so a short list fills the row.
        WIDE_COLUMNS[Math.min(results.length, 4)],
        classes.list
      )}
    >
      {results.map((item) => (
        <li key={item.id} className="min-w-0">
          <article
            data-top={item.top ? '' : undefined}
            className={cn('flex h-full flex-col', classes.card)}
          >
            <div className={cn('mb-4 flex items-start justify-between gap-2')}>
              <div
                className={cn(
                  'size-16 shrink-0 overflow-hidden sm:size-20',
                  classes.media
                )}
              >
                {item.photo ? (
                  <ThemeImage
                    value={item.photo}
                    // The name is right below; an unset description keeps
                    // the photo decorative instead of repeating it.
                    alt={item.photoAlt}
                    sizes="80px"
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  renderInitials(item.studentName)
                )}
              </div>
              {item.sample ? (
                <span data-sample-badge="" className={classes.sampleBadge}>
                  {t('website:renderer.testimonials.sampleBadge')}
                </span>
              ) : null}
            </div>
            {item.top ? (
              <p
                data-top-badge=""
                className={cn(
                  'mb-2 inline-flex items-center gap-1.5 self-start',
                  classes.topBadge
                )}
              >
                <Trophy className="size-3.5 shrink-0" aria-hidden />
                {t('website:renderer.results.top')}
              </p>
            ) : null}
            <p
              className={cn('break-words', classes.result)}
              data-atlas-numeric="true"
            >
              {item.result}
            </p>
            {/* A name is one script; `<bdi>` keeps it whole inside the other
                language's line without moving it off the card's own side. */}
            <h3 className={cn('mt-2 break-words', classes.name)}>
              <bdi>{item.studentName}</bdi>
            </h3>
            {item.detail ? (
              <p className={cn('mt-1 break-words', classes.detail)}>
                {item.detail}
              </p>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}
