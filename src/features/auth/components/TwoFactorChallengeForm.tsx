/**
 * Second-factor step of sign-in (Phase 10.3).
 *
 * Shown after a correct password when the account has 2FA enabled. At
 * this point the user is HALF authenticated: the client holds a challenge
 * id and no token, and nothing is accessible until this form succeeds.
 *
 * THE RECOVERY PATH IS VISIBLE, NOT BURIED. Someone reaching this screen
 * without their phone is locked out of their account, and hiding the way
 * back in behind a support ticket is how 2FA earns its reputation. It is
 * a secondary affordance, not a hidden one.
 *
 * Errors are deliberately generic, mirroring the backend: a wrong code, a
 * replayed code, an expired challenge and an exhausted attempt budget all
 * read the same, so the form never tells an attacker which it was. That
 * sentence is ONLY for the backend's wrong-code answer, though (B1, V05): a
 * server error or a dropped connection says what really happened, because
 * "that code didn't work" would send the person to retype a good code.
 *
 * Verify is never greyed out for an incomplete code (B1, V34): pressing it
 * says what is missing, under the field.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { ApiError } from '@api';
import { useAuthFailureText } from '../utils/auth-error-text';

/** The backend's one answer for every wrong, replayed or expired code. */
export const INVALID_TWO_FACTOR_CODE_KEY = 'errors.auth.invalidTwoFactorCode';
const TOTP_LENGTH = 6;
const RECOVERY_MIN_LENGTH = 8;

export interface TwoFactorChallengeFormProps {
  readonly onSubmit: (input: { token?: string; recoveryCode?: string }) => void;
  readonly onCancel: () => void;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
}

export function TwoFactorChallengeForm({
  onSubmit,
  onCancel,
  isLoading,
  error,
}: TwoFactorChallengeFormProps): JSX.Element {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'totp' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  // Shown after Verify is pressed with an incomplete code; cleared on typing.
  const [codeErrorKey, setCodeErrorKey] = useState<string | null>(null);
  const failureText = useAuthFailureText({
    // A 401 here is the challenge refusing the code, whatever its key.
    unauthorized: 'auth:twoFactor.invalidCode',
  });

  const isComplete =
    mode === 'totp'
      ? code.length === TOTP_LENGTH
      : code.trim().length >= RECOVERY_MIN_LENGTH;

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (isLoading) return;
    if (!isComplete) {
      setCodeErrorKey(
        mode === 'totp'
          ? 'auth:twoFactor.errors.codeIncomplete'
          : 'auth:twoFactor.errors.recoveryIncomplete'
      );
      document.getElementById('two-factor-code')?.focus();
      return;
    }
    setCodeErrorKey(null);
    onSubmit(mode === 'totp' ? { token: code } : { recoveryCode: code.trim() });
  };

  const switchMode = (next: 'totp' | 'recovery'): void => {
    setMode(next);
    setCode('');
    setCodeErrorKey(null);
  };

  const failureMessage = error
    ? error.messageKey === INVALID_TWO_FACTOR_CODE_KEY
      ? t('auth:twoFactor.invalidCode')
      : failureText(error)
    : null;

  // After any failure, focus returns to the code (the message above it is
  // announced), not to the page body.
  useEffect(() => {
    if (error && !isLoading)
      document.getElementById('two-factor-code')?.focus();
  }, [error, isLoading]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden
            />
            <div>
              <h2 className="font-medium">{t('auth:twoFactor.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {mode === 'totp'
                  ? t('auth:twoFactor.description')
                  : t('auth:twoFactor.recoveryDescription')}
              </p>
            </div>
          </div>

          {failureMessage ? (
            <p
              role="alert"
              className="text-sm text-destructive"
              data-testid="two-factor-error"
            >
              {failureMessage}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="two-factor-code">
              {mode === 'totp'
                ? t('auth:twoFactor.codeLabel')
                : t('auth:twoFactor.recoveryLabel')}
            </Label>
            <Input
              id="two-factor-code"
              // `one-time-code` lets iOS and Android offer the code from
              // the authenticator or SMS autofill.
              autoComplete={mode === 'totp' ? 'one-time-code' : 'off'}
              inputMode={mode === 'totp' ? 'numeric' : 'text'}
              autoFocus
              maxLength={mode === 'totp' ? 6 : 64}
              value={code}
              onChange={(event) => {
                setCodeErrorKey(null);
                setCode(
                  mode === 'totp'
                    ? event.target.value
                        .replace(/\D/g, '')
                        .slice(0, TOTP_LENGTH)
                    : event.target.value
                );
              }}
              placeholder={mode === 'totp' ? '000000' : ''}
              className={
                mode === 'totp'
                  ? 'text-center font-mono text-lg tracking-widest'
                  : 'font-mono'
              }
              aria-required
              aria-invalid={Boolean(codeErrorKey) || Boolean(error)}
              aria-describedby={
                codeErrorKey ? 'two-factor-code-error' : undefined
              }
            />
            {codeErrorKey ? (
              <p
                id="two-factor-code-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {t(codeErrorKey)}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading
              ? t('common:actions.saving')
              : t('auth:twoFactor.verify')}
          </Button>

          <div className="flex flex-col gap-2 text-center text-sm">
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => switchMode(mode === 'totp' ? 'recovery' : 'totp')}
            >
              <KeyRound className="me-1 inline size-3.5" aria-hidden />
              {mode === 'totp'
                ? t('auth:twoFactor.useRecoveryCode')
                : t('auth:twoFactor.useAuthenticator')}
            </button>
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={onCancel}
            >
              {t('auth:twoFactor.backToSignIn')}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
