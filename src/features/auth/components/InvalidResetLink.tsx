/**
 * B1 (UX audit, V10 / V37) — a password-reset (or account-setup) link that
 * cannot be used, as a proper page state: an icon, a heading that says what
 * happened, and the way on — a new link.
 *
 * Shown both when the link is refused up front (the token check) and when
 * it is refused on submit (expired while the person typed). Before, the
 * first was a bare red box with no heading and the second an "Unexpected
 * error — Try again" card plus a "session expired" toast, a dead end.
 *
 * The heading takes focus when this replaces the form, so the change is
 * announced instead of focus falling back to the page.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AUTH_ROUTES } from '@app/routes/route-paths';

export interface InvalidResetLinkProps {
  /** `setup`: an account-setup link ("set" a password, not "reset"). */
  readonly variant?: 'reset' | 'setup';
  /** Move focus to the heading on mount (when this replaces the form). */
  readonly autoFocus?: boolean;
}

export function InvalidResetLink({
  variant = 'reset',
  autoFocus = false,
}: InvalidResetLinkProps): JSX.Element {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copy = variant === 'setup' ? 'auth:setPassword' : 'auth:resetPassword';

  useEffect(() => {
    if (autoFocus) headingRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      className="w-full max-w-md space-y-8"
      data-testid="reset-link-invalid"
      data-variant={variant}
    >
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-pill bg-destructive-surface text-destructive">
          <Link2Off className="size-6" strokeWidth={2} aria-hidden />
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-6 font-display text-2xl font-semibold leading-snug tracking-tight text-foreground focus-visible:outline-none"
        >
          {t(`${copy}.errors.invalidTokenTitle`)}
        </h1>
        <p
          role="alert"
          className="mx-auto max-w-prose text-sm text-muted-foreground"
        >
          {t(`${copy}.errors.invalidToken`)}
        </p>
      </div>

      <div className="space-y-3">
        <Button asChild className="w-full">
          <Link to={AUTH_ROUTES.forgotPassword}>
            {t(`${copy}.requestNewLink`)}
          </Link>
        </Button>
        <p className="text-center text-sm">
          <Link
            to={AUTH_ROUTES.signIn}
            className="font-medium text-primary hover:underline"
          >
            {t('auth:forgotPassword.backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
