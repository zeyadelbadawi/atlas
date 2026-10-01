/**
 * A text lesson: the body, and how far through it the learner is (§E.3).
 *
 * READING PROGRESS IS MEASURED, NOT CLAIMED. The bar tracks how much of
 * the body has actually scrolled past the viewport, because a text lesson
 * has no `timeupdate` to borrow and a progress bar that jumped to 100% on
 * open would be a lie told to the one learner who cannot see the page
 * length. It reads the window's own scroll position against this
 * element's box, so it is correct whether the body is short enough to fit
 * on screen (100% immediately, correctly) or forty screens long.
 *
 * The body is sanitised — see `lesson-html.utils.ts` for why that is a
 * security boundary and not a formatting step.
 *
 * `prose` comes from the typography plugin the project already loads, so
 * headings, lists, tables and code inside a lesson look like the rest of
 * Atlas without this file restyling HTML it did not author. `prose-invert`
 * is not applied: the player content area is the page surface, not a dark
 * one.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LearnerProgressBar } from './LearnerProgressBar';
import { sanitizeLessonHtml } from '../utils/lesson-html.utils';

export interface TextLessonViewProps {
  readonly bodyHtml: string | undefined;
  readonly title: string;
  /** Receives 0–100 as the learner reads, so the shell can record evidence. */
  readonly onReadingProgress?: (percentage: number) => void;
}

export function TextLessonView({
  bodyHtml,
  title,
  onReadingProgress,
}: TextLessonViewProps): JSX.Element {
  const { t } = useTranslation();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [percentage, setPercentage] = useState(0);

  const safeHtml = useMemo(() => sanitizeLessonHtml(bodyHtml), [bodyHtml]);

  const reportRef = useRef(onReadingProgress);
  reportRef.current = onReadingProgress;

  const measure = useCallback(() => {
    const element = bodyRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const viewport = window.innerHeight || 0;

    // Everything visible at once is read the moment it is shown; there is
    // no scrolling left to do and claiming 0% would be wrong.
    if (rect.height <= viewport) {
      setPercentage(100);
      reportRef.current?.(100);
      return;
    }

    const scrolled = Math.min(Math.max(viewport - rect.top, 0), rect.height);
    const next = Math.round((scrolled / rect.height) * 100);
    setPercentage(next);
    reportRef.current?.(next);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, safeHtml]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            {t('learning:player.text.readingProgress')}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('learning:learnerDashboard.progress.valueText', { percentage })}
          </span>
        </div>
        <LearnerProgressBar
          value={percentage}
          label={t('learning:player.text.readingProgressLabel', { title })}
        />
      </div>

      {safeHtml ? (
        <div
          ref={bodyRef}
          className="prose prose-sm max-w-none text-foreground dark:prose-invert"
          // Sanitised above. See `lesson-html.utils.ts` — the allowlist is
          // the security boundary, and it fails closed.
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : (
        <div ref={bodyRef}>
          <p className="text-sm text-muted-foreground">
            {t('learning:player.text.empty')}
          </p>
        </div>
      )}
    </div>
  );
}
