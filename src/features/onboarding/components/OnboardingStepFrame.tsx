/**
 * One setup screen: a heading, a short explanation, the step's content,
 * and a quiet footer (Back, Skip where allowed, Continue when the step
 * lets you move on).
 *
 * ONE PRIMARY ACTION PER SCREEN. The step's own content owns it (Create
 * academy, Publish website, Start free trial…); the footer's actions are
 * secondary so they never compete with it.
 *
 * FOCUS FOLLOWS THE STEP. The heading takes focus whenever the step
 * changes, so keyboard and screen-reader users land on the new screen's
 * title instead of wherever the previous screen's button was.
 */
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, MIRROR_IN_RTL } from '@utils';
import type { OnboardingScreenKey } from '@types';

export interface OnboardingStepFrameProps {
  readonly stepKey: OnboardingScreenKey;
  readonly title: string;
  readonly description?: string;
  /** A small line above the title (e.g. "Required · Step 2 of 5"). */
  readonly eyebrow?: string;
  readonly children: ReactNode;
  readonly onBack?: () => void;
  /** Present only on the steps where skipping is allowed. */
  readonly onSkip?: () => void;
  /** Present when the step may be left forward (typically once complete). */
  readonly onContinue?: () => void;
  /** Whether Continue is this screen's primary action (nothing else is). */
  readonly continueIsPrimary?: boolean;
}

export function OnboardingStepFrame({
  stepKey,
  title,
  description,
  eyebrow,
  children,
  onBack,
  onSkip,
  onContinue,
  continueIsPrimary = false,
}: OnboardingStepFrameProps): JSX.Element {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepKey]);

  const hasFooter = !!(onBack || onSkip || onContinue);

  return (
    <section
      aria-labelledby="onboarding-step-heading"
      className="flex flex-col gap-8"
      data-testid={`onboarding-step-${stepKey}`}
    >
      <header className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1
          id="onboarding-step-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl font-semibold tracking-tight text-foreground outline-none sm:text-3xl"
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-prose text-base text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>

      <div>{children}</div>

      {hasFooter ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <div>
            {onBack ? (
              <Button type="button" variant="ghost" onClick={onBack}>
                <ArrowLeft
                  className={cn('size-4', MIRROR_IN_RTL)}
                  aria-hidden
                />
                {t('onboarding:actions.back')}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onSkip ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                data-testid="onboarding-skip"
              >
                {t('onboarding:actions.skip')}
              </Button>
            ) : null}
            {onContinue ? (
              <Button
                type="button"
                variant={continueIsPrimary ? 'default' : 'outline'}
                onClick={onContinue}
              >
                {t('onboarding:actions.continue')}
                <ArrowRight
                  className={cn('size-4', MIRROR_IN_RTL)}
                  aria-hidden
                />
              </Button>
            ) : null}
          </div>
        </footer>
      ) : null}
    </section>
  );
}
