/**
 * "Send a new link" — the verify-email pages' recovery action for a
 * SIGNED-IN reader whose link is missing, invalid or expired.
 *
 * Shared by the management host's `VerifyEmailPage` and the academy
 * website's `PublicWebsiteVerifyEmailPage`; each passes its own
 * translation prefix so the copy stays in its own namespace. The backend
 * decides where the new link points (an academy session gets its
 * academy's verify page), and answers `202` even for an already-verified
 * account, so "sent" is the only success there is to show. That message
 * replaces the button, so focus moves to it (announced, and not dropped
 * to the document body).
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useResendEmailVerification } from '../hooks/useResendEmailVerification';

export interface VerifyEmailResendProps {
  /** e.g. `auth:verifyEmail.resend` — must define `action`, `sending`, `sent`, `rateLimited`, `failed`. */
  readonly keyPrefix: string;
}

export function VerifyEmailResend({
  keyPrefix,
}: VerifyEmailResendProps): JSX.Element {
  const { t } = useTranslation();
  const resend = useResendEmailVerification();
  const sentRef = useRef<HTMLParagraphElement>(null);
  const wasSent = useRef(resend.isSuccess);

  useEffect(() => {
    if (resend.isSuccess && !wasSent.current)
      sentRef.current?.focus({ preventScroll: true });
    wasSent.current = resend.isSuccess;
  }, [resend.isSuccess]);

  if (resend.isSuccess) {
    return (
      <p
        ref={sentRef}
        tabIndex={-1}
        className="text-center text-sm text-muted-foreground focus-visible:outline-none"
        role="status"
        data-testid="verify-email-resend-sent"
      >
        {t(`${keyPrefix}.sent`)}
      </p>
    );
  }

  const errorKey = resend.isError
    ? resend.error?.kind === 'rateLimited'
      ? 'rateLimited'
      : 'failed'
    : null;

  return (
    <div
      className="flex flex-col items-center gap-2"
      data-testid="verify-email-resend"
    >
      <Button
        type="button"
        onClick={() => resend.mutate()}
        disabled={resend.isPending}
      >
        {resend.isPending
          ? t(`${keyPrefix}.sending`)
          : t(`${keyPrefix}.action`)}
      </Button>
      {errorKey ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {t(`${keyPrefix}.${errorKey}`)}
        </p>
      ) : null}
    </div>
  );
}
