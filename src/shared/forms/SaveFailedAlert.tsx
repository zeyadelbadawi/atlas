/**
 * B1 (UX audit) — the pieces of form feedback forms share:
 * the required marker (the same markup `FormField` renders, for fields that
 * keep their own ids) and the one inline message a failed save shows.
 */
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ApiError } from '@api';
import { useFailureReason } from './form-feedback';

/** "*" for the eye, "required" for assistive technology — as `FormField`. */
export function RequiredMark(): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <span aria-hidden className="ms-0.5 text-destructive">
        *
      </span>
      <span className="sr-only">{t('common:form.requiredFieldIndicator')}</span>
    </>
  );
}

export interface SaveFailedAlertProps {
  readonly error: ApiError;
  /** What did not happen, e.g. "Your changes weren't saved". */
  readonly titleKey: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

/**
 * The single message for a failure no field can show: says that nothing
 * was saved and the real reason, in the language on screen.
 */
export function SaveFailedAlert({
  error,
  titleKey,
  onRetry,
  className,
}: SaveFailedAlertProps): JSX.Element {
  const { t } = useTranslation();
  const reason = useFailureReason();
  return (
    <Alert
      variant="destructive"
      className={className}
      data-testid="save-failed"
    >
      <AlertCircle className="size-4" aria-hidden />
      <AlertTitle>{t(titleKey)}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{reason(error)}</p>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {t('common:actions.retry')}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
