/**
 * B1 (UX audit) — the ONE message an auth form shows when a request fails.
 *
 * Before, a failure produced a generic "Unexpected error — Try again" card
 * and, from the app-wide reporter, a toast with the real reason: two
 * messages, the visible one false. Now the form shows the real reason here,
 * the mutation is marked `inlineErrors` so no toast repeats it, and focus
 * moves to the message so a keyboard or screen-reader user lands on it
 * instead of the page body. The submit button stays the way to retry.
 */
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@utils';

export interface AuthFormAlertProps {
  /** The message; nothing renders without one. */
  readonly message: string | null;
  /**
   * Changes on every new failure (pass the error object), so a second
   * identical failure still moves focus here.
   */
  readonly focusKey?: unknown;
  /** Whether to take focus when shown. Default `true`. */
  readonly autoFocus?: boolean;
  /** Support reference for a failure on our side. */
  readonly requestId?: string;
  /** A next step under the message (e.g. a link). */
  readonly children?: ReactNode;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

export function AuthFormAlert({
  message,
  focusKey,
  autoFocus = true,
  requestId,
  children,
  className,
  'data-testid': testId = 'auth-form-alert',
}: AuthFormAlertProps): JSX.Element | null {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message || !autoFocus) return;
    ref.current?.focus({ preventScroll: false });
    // Focus once per failure, not on every render of the same one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, message === null]);

  if (!message) return null;

  return (
    <Alert
      ref={ref}
      tabIndex={-1}
      variant="destructive"
      data-testid={testId}
      className={cn(
        'outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
        className
      )}
    >
      <AlertCircle className="size-4" aria-hidden />
      <AlertDescription className="space-y-1">
        <p>{message}</p>
        {requestId ? (
          <p className="font-mono text-xs text-muted-foreground">
            {t('errors:errorReference', { requestId })}
          </p>
        ) : null}
        {children}
      </AlertDescription>
    </Alert>
  );
}
