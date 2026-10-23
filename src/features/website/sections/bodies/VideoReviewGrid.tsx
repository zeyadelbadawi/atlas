/**
 * CMS phase 3d (batch D) — the video reviews section's shared body
 * (`videoTestimonials`): a grid of click-to-play videos, each with the
 * person's name, their role ("Parent of a Grade 12 student") and an
 * optional short quote.
 *
 * - Every video is batch A's `VideoFacade` (reused, not copied): a poster
 *   in a reserved 16:9 frame, and the youtube-nocookie player only after
 *   the visitor presses play. The grid controls the facades so only one
 *   plays at a time: starting another returns the first to its poster.
 * - Starter reviews are samples: never on the public site (the API strips
 *   them; this is the second guard), labelled "Sample" in previews, where a
 *   review without its video yet shows a same-size placeholder.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { cn } from '@utils';
import { VideoFacade } from '../engage/VideoFacade';
import type { ResolvedVideoReview } from './journey-proof.logic';

/** Columns from phones up, by how many reviews there are. */
const COLUMNS: Record<number, string> = {
  1: 'mx-auto max-w-2xl',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
};

export interface VideoReviewGridClasses {
  readonly list?: string;
  readonly card?: string;
  /** The facade's frame (shape, border, radius; the 16:9 ratio is built in). */
  readonly frame?: string;
  /** The facade's play mark. */
  readonly play?: string;
  /** A preview's stand-in for a review without its video yet. */
  readonly placeholder?: string;
  readonly quote?: string;
  readonly name?: string;
  readonly role?: string;
  readonly sampleBadge?: string;
}

export function VideoReviewGrid({
  reviews,
  interactive,
  classes = {},
}: {
  readonly reviews: readonly ResolvedVideoReview[];
  /** The public site plays; previews show posters only. */
  readonly interactive: boolean;
  readonly classes?: VideoReviewGridClasses;
}): JSX.Element {
  const { t } = useTranslation();
  const [playingId, setPlayingId] = useState<string | null>(null);
  return (
    <ul
      role="list"
      data-video-reviews=""
      className={cn(
        'grid gap-6 lg:gap-8',
        COLUMNS[Math.min(reviews.length, 3)],
        classes.list
      )}
    >
      {reviews.map((review) => (
        <li key={review.id} className="min-w-0">
          <figure className={cn('flex h-full flex-col', classes.card)}>
            {review.videoId ? (
              <VideoFacade
                videoId={review.videoId}
                title={t('website:renderer.videoTestimonials.videoTitle', {
                  name: review.name,
                })}
                poster={review.poster}
                interactive={interactive}
                playing={playingId === review.id}
                onPlay={() => setPlayingId(review.id)}
                frameClassName={classes.frame}
                playClassName={classes.play}
                sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
              />
            ) : (
              <div
                data-video-placeholder=""
                className={cn(
                  'relative flex aspect-[16/9] flex-col items-center justify-center gap-3 overflow-hidden px-6 text-center text-sm',
                  classes.frame,
                  classes.placeholder
                )}
              >
                <Play aria-hidden className="size-8" strokeWidth={1.5} />
                {t('website:renderer.videoTestimonials.previewNoVideo')}
              </div>
            )}
            <figcaption className="mt-4 flex flex-1 flex-col gap-3">
              {review.sample ? (
                <span
                  data-sample-badge=""
                  className={cn('self-start', classes.sampleBadge)}
                >
                  {t('website:renderer.testimonials.sampleBadge')}
                </span>
              ) : null}
              {review.quote ? (
                <blockquote className={cn('break-words', classes.quote)}>
                  {/* `<q>`: the visitor's language's own quotation marks. */}
                  <p>
                    <q>{review.quote}</q>
                  </p>
                </blockquote>
              ) : null}
              <div className="mt-auto">
                {/* A name is one script; `<bdi>` keeps it whole in the other language's line. */}
                <p className={cn('break-words', classes.name)}>
                  <bdi>{review.name}</bdi>
                </p>
                {review.role ? (
                  <p className={cn('break-words', classes.role)}>
                    {review.role}
                  </p>
                ) : null}
              </div>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
