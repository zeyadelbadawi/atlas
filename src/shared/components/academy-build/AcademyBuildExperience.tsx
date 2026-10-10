/**
 * Academy build experience — the screen shown while a new academy is
 * being built during onboarding.
 *
 * It runs for the request's build window (`academy-build-timer.ts`: a
 * random 45–75 s, or longer if provisioning itself takes longer) and walks
 * through the stages of the build with a progress ring, a checklist and
 * short lines about what the academy will be able to do. It only calls
 * `onComplete` once BOTH the window has passed AND the server says the
 * academy is ready; until then the last stage holds at "final checks".
 *
 * Presentation only. Failures are not hidden: the caller swaps this view
 * for the failure panel the moment the request fails. With reduced motion
 * the same content shows without movement.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@utils';
import {
  readAcademyBuild,
  startAcademyBuild,
} from './academy-build-timer';
import {
  ACADEMY_BUILD_STAGES,
  BUILD_HIGHLIGHT_KEYS as HIGHLIGHT_KEYS,
  buildProgressAt,
} from './academy-build-progress';

const TICK_MS = 250;
const HIGHLIGHT_MS = 7_000;
/** Pause on the completed state before handing back to the step. */
const SETTLE_MS = 1_200;

export interface AcademyBuildExperienceProps {
  readonly requestId: string;
  readonly academyName: string;
  /** The server reports the academy as ready. */
  readonly serverReady: boolean;
  /** Called once, when the window has passed and the server is ready. */
  readonly onComplete: () => void;
  /** Real-state notices (stalled, reconnecting) shown under the build. */
  readonly children?: React.ReactNode;
}

export function AcademyBuildExperience({
  requestId,
  academyName,
  serverReady,
  onComplete,
  children,
}: AcademyBuildExperienceProps): JSX.Element {
  const { t } = useTranslation();
  const timer = useMemo(
    () => readAcademyBuild(requestId) ?? startAcademyBuild(requestId),
    [requestId]
  );
  const [now, setNow] = useState(() => Date.now());
  const [highlight, setHighlight] = useState(0);
  const completed = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const id = window.setInterval(
      () => setHighlight((i) => (i + 1) % HIGHLIGHT_KEYS.length),
      HIGHLIGHT_MS
    );
    return () => window.clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - timer.startedAt);
  const windowOver = elapsed >= timer.durationMs;
  const done = windowOver && serverReady;
  const { stageIndex, percent } = buildProgressAt(elapsed, timer.durationMs);
  const shownPercent = done ? 100 : percent;

  useEffect(() => {
    if (!done || completed.current) return;
    completed.current = true;
    const id = window.setTimeout(onComplete, SETTLE_MS);
    return () => window.clearTimeout(id);
    // `onComplete` is a fresh closure each render; completion happens once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const activeStage = ACADEMY_BUILD_STAGES[stageIndex];
  const statusLine = done
    ? t('onboarding:build.doneLine', { name: academyName })
    : windowOver
      ? t('onboarding:build.finalChecks')
      : t(`onboarding:build.stages.${activeStage.key}.active`);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8"
      data-testid="academy-build"
      aria-labelledby="academy-build-title"
    >
      {/* Soft animated glow behind the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 start-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl motion-safe:animate-pulse rtl:translate-x-1/2"
      />

      <div className="relative flex flex-col items-center text-center">
        <div
          className="relative size-36"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shownPercent}
          aria-label={t('onboarding:build.progressLabel')}
        >
          <svg
            viewBox="0 0 120 120"
            className="size-full -rotate-90"
            aria-hidden
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="8"
              className="stroke-muted"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={cn(
                'transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none',
                done ? 'stroke-success' : 'stroke-primary'
              )}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - shownPercent / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {done ? (
              <Check
                className="size-10 text-success motion-safe:animate-in motion-safe:zoom-in-50"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : (
              <span
                className="font-display text-3xl font-semibold tabular-nums text-foreground"
                data-ltr-content
                dir="ltr"
              >
                {shownPercent}%
              </span>
            )}
          </div>
        </div>

        <h2
          id="academy-build-title"
          className="mt-5 font-display text-xl font-semibold text-foreground sm:text-2xl"
        >
          {done
            ? t('onboarding:build.doneTitle', { name: academyName })
            : t('onboarding:build.title', { name: academyName })}
        </h2>
        <p
          className="mt-2 min-h-[1.5rem] text-sm text-muted-foreground"
          aria-live="polite"
          data-testid="academy-build-status"
        >
          {statusLine}
        </p>
      </div>

      <ol className="relative mt-8 grid gap-2 sm:grid-cols-2">
        {ACADEMY_BUILD_STAGES.map((stage, index) => {
          const state =
            done || index < stageIndex || (windowOver && index <= stageIndex)
              ? 'done'
              : index === stageIndex
                ? 'active'
                : 'pending';
          const Icon = stage.icon;
          return (
            <li
              key={stage.key}
              data-state={state}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-500 motion-reduce:transition-none',
                state === 'active' &&
                  'border-primary/40 bg-primary/5 text-foreground',
                state === 'done' &&
                  'border-border bg-background/40 text-foreground',
                state === 'pending' && 'border-border/60 text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-500',
                  state === 'done' && 'bg-success/15 text-success',
                  state === 'active' && 'bg-primary/15 text-primary',
                  state === 'pending' && 'bg-muted text-muted-foreground'
                )}
                aria-hidden
              >
                {state === 'done' ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : state === 'active' ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {t(`onboarding:build.stages.${stage.key}.label`)}
              </span>
              <span className="sr-only">
                {t(`onboarding:build.state.${state}`)}
              </span>
            </li>
          );
        })}
      </ol>

      {!done ? (
        <div
          className="relative mt-6 rounded-lg bg-muted/50 px-4 py-3 text-sm text-foreground"
          data-testid="academy-build-highlight"
        >
          <span className="me-1.5 font-medium text-primary">
            {t('onboarding:build.highlightLead')}
          </span>
          <span
            key={HIGHLIGHT_KEYS[highlight]}
            className="motion-safe:animate-in motion-safe:fade-in"
          >
            {t(`onboarding:build.highlights.${HIGHLIGHT_KEYS[highlight]}`)}
          </span>
        </div>
      ) : null}

      {!done ? (
        <p className="relative mt-4 text-center text-xs text-muted-foreground">
          {t('onboarding:build.stayHere')}
        </p>
      ) : null}

      {children ? <div className="relative mt-4">{children}</div> : null}
    </section>
  );
}
