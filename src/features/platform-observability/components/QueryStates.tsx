/**
 * Loading and error frames shared by the Observability pages.
 */
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { errorTitleKey } from '@services';
import { apiErrorMessage } from '@utils';
import type { ApiError } from '@api';

export function PageSkeleton({
  tiles = 3,
  cards = 6,
}: {
  readonly tiles?: number;
  readonly cards?: number;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">
        {t('platformObservability:states.loading')}
      </span>
      <Skeleton className="h-20 w-full" />
      {tiles > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: tiles }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} className="h-44" />
        ))}
      </div>
    </div>
  );
}

/**
 * A failed first load: the same frame as the shared `ErrorState`, but the
 * explanation is the API's own error copy (`apiErrorMessage`), so a 403
 * says "not allowed" rather than a generic failure.
 */
export function QueryError({
  error,
  onRetry,
  titleKey,
}: {
  readonly error: ApiError | null;
  readonly onRetry: () => void;
  readonly titleKey?: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-10 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-pill bg-destructive-surface text-destructive">
        <AlertTriangle className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-display text-base font-semibold text-foreground">
          {t(titleKey ?? errorTitleKey(error?.kind ?? 'unknown'))}
        </h2>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          {apiErrorMessage(t, i18n, error)}
        </p>
      </div>
      <Button type="button" onClick={onRetry}>
        {t('common:actions.retry')}
      </Button>
      {error?.requestId ? (
        <p className="font-mono text-xs text-muted-foreground">
          {t('errors:errorReference', { requestId: error.requestId })}
        </p>
      ) : null}
    </div>
  );
}
