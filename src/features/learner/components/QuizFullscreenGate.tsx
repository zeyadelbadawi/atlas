/**
 * What a learner sees when a quiz requires full screen and the page is
 * not in it (P4) — see `fullscreenView` for the policy. The gate takes
 * the place of the questions; the header (timer, saved state) stays.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2, MonitorX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { FullscreenView } from '../hooks/useQuizFullscreen';

export interface QuizFullscreenGateProps {
  readonly view: Exclude<FullscreenView, 'none'>;
  /** A click handler — the full-screen request happens inside it. */
  readonly onEnter: () => void;
  readonly onContinueWithout: () => void;
}

export function QuizFullscreenGate({
  view,
  onEnter,
  onContinueWithout,
}: QuizFullscreenGateProps): JSX.Element {
  const { t } = useTranslation();
  const gateRef = useRef<HTMLElement>(null);
  const isGate = view !== 'unsupported';
  // The questions just disappeared: move keyboard and screen-reader focus
  // to the gate, and bring it into view.
  useEffect(() => {
    if (!isGate) return;
    gateRef.current?.focus({ preventScroll: true });
    gateRef.current?.scrollIntoView?.({ block: 'center' });
  }, [isGate]);

  if (view === 'unsupported') {
    return (
      <Alert data-testid="quiz-fullscreen-unsupported">
        <MonitorX className="size-4" aria-hidden />
        <AlertTitle>
          {t('learning:quiz.fullscreen.unsupportedTitle')}
        </AlertTitle>
        <AlertDescription>
          {t('learning:quiz.fullscreen.unsupportedBody')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section
      ref={gateRef}
      tabIndex={-1}
      role="region"
      aria-labelledby="quiz-fullscreen-gate-title"
      data-testid="quiz-fullscreen-gate"
      className="relative z-[1] space-y-4 rounded-lg border border-border bg-card p-6 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <h2
        id="quiz-fullscreen-gate-title"
        className="text-lg font-semibold text-foreground"
      >
        {t('learning:quiz.fullscreen.gateTitle')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('learning:quiz.fullscreen.gateBody')}
      </p>
      {view === 'gate-refused' ? (
        <p role="status" className="text-sm text-foreground">
          {t('learning:quiz.fullscreen.refused')}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={onEnter}>
          <Maximize2 className="size-4" aria-hidden />
          {t('learning:quiz.fullscreen.enter')}
        </Button>
        {view === 'gate-refused' ? (
          <Button type="button" variant="outline" onClick={onContinueWithout}>
            {t('learning:quiz.fullscreen.continueWithout')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
