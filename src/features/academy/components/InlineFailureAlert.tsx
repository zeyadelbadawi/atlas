/**
 * B4 (UX audit) — the one inline message a dialog shows when its action
 * failed for a reason no field can show: what did not happen (the title)
 * and the real reason. `SaveFailedAlert` with one addition: a feature's
 * own copy for a refusal the backend names (`specificKey`) wins over the
 * generic reason (see `memberAddSpecificKey`).
 */
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SaveFailedAlert } from '@forms';
import type { ApiError } from '@api';

export interface InlineFailureAlertProps {
  readonly error: ApiError;
  readonly titleKey: string;
  readonly specificKey?: string | null;
  readonly className?: string;
}

export function InlineFailureAlert({
  error,
  titleKey,
  specificKey,
  className,
}: InlineFailureAlertProps): JSX.Element {
  const { t } = useTranslation();
  if (!specificKey) {
    return (
      <SaveFailedAlert error={error} titleKey={titleKey} className={className} />
    );
  }
  return (
    <Alert
      variant="destructive"
      className={className}
      data-testid="save-failed"
    >
      <AlertCircle className="size-4" aria-hidden />
      <AlertTitle>{t(titleKey)}</AlertTitle>
      <AlertDescription>
        <p>{t(specificKey)}</p>
      </AlertDescription>
    </Alert>
  );
}
