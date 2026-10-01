/**
 * The unified player shell (§E.2).
 *
 * ONE SHELL FOR ALL FOUR ACTIVITY TYPES. A lesson, a quiz, an assignment
 * and a live session all render inside this: same course title, same back
 * link, same overall progress, same curriculum, same activity header,
 * same single action bar. Finding F3's exact words were "the player is
 * not a player, it is three pages" — three screens that each looked
 * different, numbered their items differently, and had their own idea of
 * what came next. The fix is not three nicer pages; it is one shell and
 * one ordered sequence behind it.
 *
 * THE SIX LEARNER QUESTIONS, answered on every screen (§E.2): where am I
 * (course title + breadcrumb back link), how far through am I (the
 * progress bar, with its real percentage), what is this (the activity
 * header's type, number, title and duration), what else is there (the
 * curriculum), what do I do now (the action bar), and how do I get out
 * (the back link, which goes to the course outline rather than into
 * browser history).
 *
 * THE CURRICULUM IS A RAIL ON DESKTOP AND A DRAWER BELOW IT, and the
 * drawer opens from the READING side: `start` in both languages, which
 * `Sheet`'s `side` prop cannot express, so the side is chosen from the
 * surface's own direction. A drawer that always flew in from the left
 * would cross the whole screen in Arabic to reach a trigger on the right.
 *
 * NO `<main>` HERE. `WebsiteChrome` already owns the document's one
 * `<main>`; a second would be invalid and would leave "skip to main
 * content" landing on whichever the browser picked.
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronLeft, ListTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  MIRROR_IN_RTL,
  cn,
  formatNumber,
  isolateNumericExpression,
} from '@utils';
import type { CourseSequenceItem, LanguageCode } from '@types';
import { LearnerProgressBar } from './LearnerProgressBar';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { CurriculumSidebar } from './CurriculumSidebar';
import {
  formatSequenceOrdinal,
  sequenceStateIcon,
  sequenceStateLabelKey,
  sequenceTypeIcon,
  sequenceTypeLabelKey,
} from '../utils/sequence.utils';

/**
 * `1:05:20` / `12:30` — never "3720 seconds".
 *
 * Digits come from `formatNumber`, so Arabic gets the same Arabic-Indic
 * numerals the rest of the product uses rather than a second, locally
 * chosen locale. The result is isolated because `12:30` is two
 * left-to-right runs around a bidi-NEUTRAL colon — the exact shape that
 * renders as `30:12` inside an Arabic paragraph (`bidi.utils.ts`
 * documents the failure at length; `16:9` becoming `9:16` is the same
 * bug with a worse consequence).
 */
export function formatDuration(
  seconds: number | null,
  language: LanguageCode
): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0)
    return null;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;

  const parts = hours > 0 ? [hours, minutes, remaining] : [minutes, remaining];
  const expression = parts
    .map((part, index) =>
      index === 0
        ? formatNumber(part, language)
        : formatNumber(part, language, {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })
    )
    .join(':');

  return isolateNumericExpression(expression);
}

export interface PlayerShellProps {
  readonly courseTitle: string;
  /** Where the back link goes — the course outline, never browser history. */
  readonly backHref: string;
  readonly completedCount: number;
  readonly totalCount: number;
  readonly items: readonly CourseSequenceItem[];
  readonly currentItem: CourseSequenceItem | undefined;
  readonly hrefFor: (item: CourseSequenceItem) => string | undefined;
  /** The activity's own title, used when the sequence has no item for it (a preview). */
  readonly fallbackTitle?: string;
  readonly fallbackDurationSeconds?: number | null;
  /** Rendered to the right of the activity header — the protection badge. */
  readonly headerAside?: ReactNode;
  readonly children: ReactNode;
  /** The single action bar. Always last in reading order. */
  readonly actionBar?: ReactNode;
}

export function PlayerShell({
  courseTitle,
  backHref,
  completedCount,
  totalCount,
  items,
  currentItem,
  hrefFor,
  fallbackTitle,
  fallbackDurationSeconds,
  headerAside,
  children,
  actionBar,
}: PlayerShellProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { isRtl } = useLearnerSurface();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const language = i18n.language as LanguageCode;

  const percentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const title = currentItem?.title ?? fallbackTitle ?? '';
  const duration = formatDuration(
    currentItem?.durationSeconds ?? fallbackDurationSeconds ?? null,
    language
  );
  const StateIcon = currentItem ? sequenceStateIcon(currentItem.state) : null;
  const TypeIcon = currentItem ? sequenceTypeIcon(currentItem.type) : null;

  const curriculum = (
    <CurriculumSidebar
      items={items}
      currentItemId={currentItem?.id}
      hrefFor={hrefFor}
      language={language}
      onNavigate={() => setDrawerOpen(false)}
    />
  );

  return (
    <div className="mx-auto w-full max-w-content px-4 py-4 sm:px-6 lg:px-8">
      {/* Where am I, and how do I get out. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ms-2">
          <Link to={backHref}>
            <ChevronLeft className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
            <span dir="auto" className="max-w-[16rem] truncate">
              {courseTitle}
            </span>
          </Link>
        </Button>

        {/* Below the rail breakpoint the curriculum lives in a drawer. */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">
              <ListTree className="size-4" aria-hidden />
              {t('learning:player.curriculum.open')}
            </Button>
          </SheetTrigger>
          <SheetContent
            side={isRtl ? 'right' : 'left'}
            className="w-80 max-w-[85vw] overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>{t('learning:player.curriculum.label')}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{curriculum}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* How far through am I. One progress bar for the whole course, and
          it counts every activity type — not just lessons, which is the
          number the retired bar showed while three assignments were still
          outstanding. */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {t('learning:player.progress.summary', {
              completed: completedCount,
              total: totalCount,
            })}
          </span>
          <span className="tabular-nums">
            {t('learning:learnerDashboard.progress.valueText', { percentage })}
          </span>
        </div>
        <LearnerProgressBar
          value={percentage}
          label={t('learning:player.progress.label', { course: courseTitle })}
        />
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        <div className="min-w-0 space-y-5">
          {/* What is this. */}
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {currentItem ? (
                  <span className="tabular-nums">
                    {formatSequenceOrdinal(currentItem, language)}
                  </span>
                ) : null}
                {TypeIcon && currentItem ? (
                  <span className="inline-flex items-center gap-1">
                    <TypeIcon className="size-3.5" aria-hidden />
                    {t(sequenceTypeLabelKey(currentItem.type))}
                  </span>
                ) : null}
                {duration ? (
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden>·</span>
                    <span className="sr-only">
                      {t('learning:player.durationLabel')}
                    </span>
                    <span className="tabular-nums">{duration}</span>
                  </span>
                ) : null}
                {StateIcon && currentItem ? (
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden>·</span>
                    <StateIcon className="size-3.5" aria-hidden />
                    {t(sequenceStateLabelKey(currentItem.state))}
                  </span>
                ) : null}
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-foreground">
                {title}
              </h1>
            </div>

            {headerAside}
          </header>

          {children}

          {actionBar}
        </div>

        <aside className="mt-8 hidden lg:mt-0 lg:block">
          <div className="sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {curriculum}
          </div>
        </aside>
      </div>
    </div>
  );
}
