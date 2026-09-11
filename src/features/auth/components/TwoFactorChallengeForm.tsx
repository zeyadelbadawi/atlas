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
 * read the same, so the form never tells an attacker which it was.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { ApiError } from '@api';

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

  const canSubmit =
    mode === 'totp' ? code.length === 6 : code.trim().length >= 8;

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!canSubmit || isLoading) return;
    onSubmit(mode === 'totp' ? { token: code } : { recoveryCode: code.trim() });
  };

  const switchMode = (next: 'totp' | 'recovery'): void => {
    setMode(next);
    setCode('');
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {t('auth:twoFactor.invalidCode')}
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
              onChange={(event) =>
                setCode(
                  mode === 'totp'
                    ? event.target.value.replace(/\D/g, '').slice(0, 6)
                    : event.target.value
                )
              }
              placeholder={mode === 'totp' ? '000000' : ''}
              className={
                mode === 'totp'
                  ? 'text-center font-mono text-lg tracking-widest'
                  : 'font-mono'
              }
              aria-invalid={Boolean(error)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit || isLoading}
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
