/**
 * Error state.
 *
 * The single error presentation used across Atlas. Every error state explains
 * what happened, offers a retry, and — for failures the user cannot resolve —
 * a route to support. Technical detail is never exposed: only the request id,
 * which support can use for traceability.
 */
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { errorMessageKey, errorTitleKey } from '@services';
import type { ApiErrorKind } from '@types';
import { cn } from '@utils';

export interface ErrorStateProps {
  /** Error category. Determines the default title and description. */
  readonly kind?: ApiErrorKind;
  /** Overrides the title translation key. */
  readonly titleKey?: string;
  /** Overrides the description translation key. */
  readonly descriptionKey?: string;
  /** Interpolation values for the description (e.g. `{{sections}}`). */
  readonly values?: Record<string, unknown>;
  /** Reference shown so support can trace the failure. */
  readonly requestId?: string;
  /** Invoked by the retry action. Omit when the action cannot be retried. */
  readonly onRetry?: () => void;
  /** The retry action's label (defaults to "Try again"). */
  readonly retryLabelKey?: string;
  /** Invoked by the support action. */
  readonly onContactSupport?: () => void;
  /**
   * The title's heading level. `h3` inside a page; a full-page error that
   * IS the page (the public website's status page) passes `h1`, so the
   * document has its one top-level heading. Styling is identical.
   */
  readonly headingLevel?: 'h1' | 'h2' | 'h3';
  readonly className?: string;
}

export function ErrorState({
  kind = 'unknown',
  titleKey,
  descriptionKey,
  values,
  requestId,
  onRetry,
  retryLabelKey = 'common:actions.retry',
  onContactSupport,
  headingLevel: Heading = 'h3',
  className,
}: ErrorStateProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-10 text-center',
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-pill bg-destructive-surface text-destructive">
        <AlertTriangle className="size-6" strokeWidth={1.75} aria-hidden />
      </span>

      <div className="space-y-1.5">
        <Heading
          className={cn(
            'font-display text-base font-semibold text-foreground',
            // The global `h1` style adds tight tracking; an `h1` title here
            // must look exactly like the default `h3`.
            Heading === 'h1' && 'tracking-normal'
          )}
        >
          {t(titleKey ?? errorTitleKey(kind))}
        </Heading>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          {t(descriptionKey ?? errorMessageKey(kind), values)}
        </p>
      </div>

      {(onRetry || onContactSupport) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              {t(retryLabelKey)}
            </Button>
          ) : null}
          {onContactSupport ? (
            <Button type="button" variant="outline" onClick={onContactSupport}>
              {t('common:actions.contactSupport')}
            </Button>
          ) : null}
        </div>
      )}

      {requestId ? (
        <p className="font-mono text-xs text-muted-foreground">
          {t('errors:errorReference', { requestId })}
        </p>
      ) : null}
    </div>
  );
}
