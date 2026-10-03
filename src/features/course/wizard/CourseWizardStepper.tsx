/**
 * Course wizard stepper (W6).
 *
 * An ordered list of the eight steps inside a labelled `<nav>`. Each step
 * is a real `<button>` whose accessible name carries its number, label and
 * state ("3. Media, Completed"); the current one has `aria-current="step"`.
 * Keyboard: one tab stop (roving `tabindex`), Arrow keys move between
 * steps (mirrored for right-to-left on the horizontal phone layout), Home
 * and End jump to the ends, Enter/Space opens the step. A step that is
 * not available yet (everything after Basics, before the course exists)
 * stays focusable but `aria-disabled`, so it can be discovered and
 * explained instead of silently skipped.
 *
 * Layout: a vertical list with labels from `lg` up; below that, a single
 * row of numbered circles (each a ≥44px target at 390px) with the current
 * step's name written out above it.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@utils';
import {
  COURSE_WIZARD_STEPS,
  stepIndex,
  type CourseWizardStep,
  type CourseWizardStepStates,
} from './course-wizard.steps';

export interface CourseWizardStepperProps {
  readonly current: CourseWizardStep;
  readonly states: CourseWizardStepStates;
  readonly onSelect: (step: CourseWizardStep) => void;
  /** Steps that cannot be opened yet (before the course is created). */
  readonly lockedSteps?: readonly CourseWizardStep[];
}

export function CourseWizardStepper({
  current,
  states,
  onSelect,
  lockedSteps = [],
}: CourseWizardStepperProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const total = COURSE_WIZARD_STEPS.length;
  const currentIndex = stepIndex(current);
  const [focusIndex, setFocusIndex] = useState(currentIndex);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // The tab stop follows the current step when it changes.
  useEffect(() => setFocusIndex(currentIndex), [currentIndex]);

  const moveFocus = (index: number) => {
    const next = (index + total) % total;
    setFocusIndex(next);
    buttons.current[next]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = isRtl ? 'ArrowRight' : 'ArrowLeft';
    switch (event.key) {
      case forward:
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(focusIndex + 1);
        break;
      case backward:
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(focusIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(0);
        break;
      case 'End':
        event.preventDefault();
        moveFocus(total - 1);
        break;
      default:
        break;
    }
  };

  return (
    <nav aria-label={t('course:wizard.stepperLabel')}>
      <p className="mb-2 text-sm font-medium text-foreground lg:hidden">
        {t('course:wizard.stepOf', { current: currentIndex + 1, total })}
        {' · '}
        {t(`course:wizard.steps.${current}.label`)}
      </p>
      <ol className="grid grid-cols-8 gap-0.5 lg:grid-cols-1 lg:gap-1">
        {COURSE_WIZARD_STEPS.map((step, index) => {
          const isCurrent = step === current;
          const state = states[step];
          const locked = lockedSteps.includes(step);
          const statusKey = locked
            ? 'course:wizard.status.locked'
            : `course:wizard.status.${state}`;
          return (
            <li key={step} className="min-w-0">
              <button
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                type="button"
                data-step={step}
                data-state={state}
                // One clean name ("2. Details, Completed"); it contains the
                // visible label and status, so voice control still matches.
                aria-label={`${index + 1}. ${t(
                  `course:wizard.steps.${step}.label`
                )}, ${t(statusKey)}`}
                aria-current={isCurrent ? 'step' : undefined}
                aria-disabled={locked || undefined}
                tabIndex={index === focusIndex ? 0 : -1}
                onFocus={() => setFocusIndex(index)}
                onKeyDown={handleKeyDown}
                onClick={() => {
                  if (!locked && !isCurrent) onSelect(step);
                }}
                className={cn(
                  'group flex min-h-11 w-full items-center justify-center gap-3 rounded-md px-1 py-1.5 text-start text-sm transition-colors motion-reduce:transition-none lg:justify-start lg:px-2',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isCurrent
                    ? 'bg-primary/10 font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  locked && 'cursor-not-allowed opacity-60 hover:bg-transparent'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-pill border text-xs font-semibold',
                    state === 'complete'
                      ? 'border-success bg-success text-success-foreground'
                      : isCurrent
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground'
                  )}
                >
                  {state === 'complete' ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  aria-hidden
                  className="hidden lg:flex lg:min-w-0 lg:flex-col"
                >
                  <span className="truncate">
                    {t(`course:wizard.steps.${step}.label`)}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {t(statusKey)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
