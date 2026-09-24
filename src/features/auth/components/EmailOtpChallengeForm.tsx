/**
 * Email one-time-code step of sign-in (P66).
 *
 * Shown after a correct password when the academy's or platform's policy
 * asks for a code from the account's inbox — on a new device, or always.
 * The user is HALF authenticated here, exactly as at the 2FA step: the
 * client holds a challenge id and no token, and nothing is accessible
 * until this form succeeds.
 *
 * Unlike the authenticator step, the backend is deliberately SPECIFIC
 * about failures, because every one of them has a different next step
 * for an honest user and none of them helps an attacker who already has
 * the password:
 *
 *  - `otpInvalid`            — try again; the attempts left are shown.
 *  - `otpExpired`            — the code is dead; the only way on is a
 *                              fresh one, so the resend control becomes
 *                              the primary action.
 *  - `otpAttemptsExceeded`   — the challenge is destroyed server-side;
 *                              the only way on is to sign in again.
 *  - `otpSuppressedAddress`  — the inbox cannot be reached (bounced or
 *                              complained); no amount of resending helps,
 *                              so the form offers a password reset and
 *                              support instead of a code field.
 *
 * DIGITS STAY LEFT-TO-RIGHT. The slot group carries `dir="ltr"` so an
 * Arabic reader types and reads the code the way it appears in the
 * email; everything around it follows the page direction.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import type { ApiError } from '@api';
import type { EmailOtpChallenge, EmailOtpResendResult } from '@types';

export const EMAIL_OTP_LENGTH = 6;

/** The `messageKey`s `/auth/otp/verify` and `/auth/otp/resend` can answer with. */
export const EMAIL_OTP_ERROR_KEYS = {
  invalid: 'errors.auth.otpInvalid',
  expired: 'errors.auth.otpExpired',
  attemptsExceeded: 'errors.auth.otpAttemptsExceeded',
  suppressedAddress: 'errors.auth.otpSuppressedAddress',
  resendCooldown: 'errors.auth.otpResendCooldown',
  resendExhausted: 'errors.auth.otpResendExhausted',
} as const;

export interface EmailOtpChallengeFormProps {
  readonly challenge: EmailOtpChallenge;
  readonly onSubmit: (input: {
    code: string;
    rememberDevice: boolean;
  }) => void | Promise<void>;
  /** Asks the backend for a fresh code; resolves to the next cooldown. */
  readonly onResend: () => Promise<EmailOtpResendResult>;
  readonly onCancel: () => void;
  readonly isLoading: boolean;
  /** The last verify failure, owned by the caller exactly as for 2FA. */
  readonly error: ApiError | null;
  /** Where "reset your password" goes on this surface. */
  readonly forgotPasswordHref: string;
  /** Optional — when this surface has somewhere to send people for help. */
  readonly supportHref?: string;
}

/** Whole seconds from now until `iso`, never negative. */
function secondsUntil(iso: string | null, now: number): number {
  if (!iso) return 0;
  const target = Date.parse(iso);
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function readAttemptsRemaining(error: ApiError | null): number | null {
  const value = error?.details?.attemptsRemaining;
  return typeof value === 'number' ? value : null;
}

export function EmailOtpChallengeForm({
  challenge,
  onSubmit,
  onResend,
  onCancel,
  isLoading,
  error,
  forgotPasswordHref,
  supportHref,
}: EmailOtpChallengeFormProps): JSX.Element {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  // A resend does not tell the client the new code's expiry, only the
  // next cooldown — so after one the countdown is unknown and hidden
  // rather than shown wrong.
  const [expiresAt, setExpiresAt] = useState<string | null>(
    challenge.expiresAt
  );
  const [resendAvailableAt, setResendAvailableAt] = useState(
    challenge.resendAvailableAt
  );
  const [resendsRemaining, setResendsRemaining] = useState(
    challenge.resendsRemaining
  );
  const [isResending, setIsResending] = useState(false);
  const [resendErrorKey, setResendErrorKey] = useState<string | null>(null);
  const [resentNotice, setResentNotice] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const resendRef = useRef<HTMLButtonElement>(null);

  // One clock for both countdowns. Stops itself once nothing is counting.
  const expirySeconds = secondsUntil(expiresAt, now);
  const cooldownSeconds = secondsUntil(resendAvailableAt, now);
  const ticking = expirySeconds > 0 || cooldownSeconds > 0;
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);

  const messageKey = error?.messageKey;
  const isExhausted = messageKey === EMAIL_OTP_ERROR_KEYS.attemptsExceeded;
  const isSuppressed = messageKey === EMAIL_OTP_ERROR_KEYS.suppressedAddress;
  const isExpired =
    messageKey === EMAIL_OTP_ERROR_KEYS.expired ||
    (expiresAt !== null && expirySeconds === 0);
  const isInvalid = messageKey === EMAIL_OTP_ERROR_KEYS.invalid;
  const attemptsRemaining = isInvalid ? readAttemptsRemaining(error) : null;
  // Anything the backend said that is not one of the shapes above —
  // network, rate-limited, server — is shown by its own key.
  const isOtherError =
    Boolean(error) && !isInvalid && !isExpired && !isExhausted && !isSuppressed;

  // The code field is pointless in these states; what replaces it is the
  // only real next step.
  const terminal = isExhausted || isSuppressed;
  const canResend =
    !terminal &&
    !isResending &&
    !isLoading &&
    cooldownSeconds === 0 &&
    resendsRemaining > 0;
  const canSubmit =
    !terminal && !isExpired && !isLoading && code.length === EMAIL_OTP_LENGTH;

  // Focus follows the next step: the field on mount, the field again
  // after a wrong code (cleared, so a retry does not start mid-code),
  // the resend control once the code has expired.
  useEffect(() => {
    if (terminal) return;
    if (isExpired) {
      resendRef.current?.focus();
      return;
    }
    inputRef.current?.focus();
  }, [terminal, isExpired]);

  useEffect(() => {
    if (!isInvalid) return;
    setCode('');
    inputRef.current?.focus();
  }, [isInvalid, error]);

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!canSubmit) return;
    void onSubmit({ code, rememberDevice });
  };

  const handleResend = async (): Promise<void> => {
    if (!canResend) return;
    setIsResending(true);
    setResendErrorKey(null);
    setResentNotice(false);
    try {
      const result = await onResend();
      setResendAvailableAt(result.resendAvailableAt);
      setResendsRemaining(result.resendsRemaining);
      setExpiresAt(null);
      setCode('');
      setResentNotice(true);
      inputRef.current?.focus();
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError?.messageKey === EMAIL_OTP_ERROR_KEYS.resendExhausted) {
        setResendsRemaining(0);
      }
      setResendErrorKey(
        apiError?.messageKey === EMAIL_OTP_ERROR_KEYS.resendCooldown ||
          apiError?.messageKey === EMAIL_OTP_ERROR_KEYS.resendExhausted
          ? apiError.messageKey
          : 'errors.auth.otpResendFailed'
      );
    } finally {
      setIsResending(false);
    }
  };

  const errorsKey = (key: string): string =>
    key.startsWith('errors.') ? `errors:${key.slice('errors.'.length)}` : key;

  const renderTerminal = (): JSX.Element => (
    <div className="space-y-4">
      <p role="alert" className="text-sm text-destructive">
        {isExhausted
          ? t('auth:emailOtp.attemptsExceeded')
          : t('auth:emailOtp.suppressedAddress')}
      </p>
      {isSuppressed ? (
        <div className="flex flex-col gap-2 text-sm">
          <Button asChild variant="outline" className="w-full">
            <Link to={forgotPasswordHref}>
              {t('auth:emailOtp.resetPassword')}
            </Link>
          </Button>
          {supportHref ? (
            <a
              href={supportHref}
              className="text-center text-primary underline-offset-4 hover:underline"
            >
              {t('common:actions.contactSupport')}
            </a>
          ) : (
            <p className="text-center text-muted-foreground">
              {t('auth:emailOtp.contactSupportHint')}
            </p>
          )}
        </div>
      ) : null}
      <Button type="button" className="w-full" onClick={onCancel}>
        {t('auth:twoFactor.backToSignIn')}
      </Button>
    </div>
  );

  const renderCodeStep = (): JSX.Element => (
    <>
      {/* One live region for the verify outcome; the resend outcome has
          its own below, so a resend never overwrites an attempts count
          the user is still reading. */}
      {isInvalid ? (
        <p role="alert" className="text-sm text-destructive">
          {t('auth:emailOtp.invalidCode')}{' '}
          {attemptsRemaining !== null
            ? t('auth:emailOtp.attemptsRemaining', {
                count: attemptsRemaining,
              })
            : null}
        </p>
      ) : isExpired ? (
        <p role="alert" className="text-sm text-destructive">
          {t('auth:emailOtp.expired')}
        </p>
      ) : isOtherError && error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(errorsKey(error.messageKey))}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email-otp-code">{t('auth:emailOtp.codeLabel')}</Label>
        <InputOTP
          ref={inputRef}
          id="email-otp-code"
          name="code"
          maxLength={EMAIL_OTP_LENGTH}
          value={code}
          onChange={setCode}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={isLoading || isExpired}
          aria-invalid={isInvalid || isExpired}
          aria-describedby="email-otp-hint"
          // The library positions its real <input> over the slots; the
          // group is what the eye reads, so it is the LTR island.
          containerClassName="justify-center"
        >
          <InputOTPGroup dir="ltr">
            {Array.from({ length: EMAIL_OTP_LENGTH }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className={cn(
                  'h-12 w-11 text-lg font-medium sm:w-12',
                  (isInvalid || isExpired) && 'border-destructive'
                )}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <p
          id="email-otp-hint"
          className="text-center text-xs text-muted-foreground"
        >
          {expiresAt && expirySeconds > 0 ? (
            <span role="timer" aria-live="off">
              {t('auth:emailOtp.expiresIn', {
                time: formatClock(expirySeconds),
              })}
            </span>
          ) : expiresAt === null ? (
            t('auth:emailOtp.checkInbox')
          ) : null}
        </p>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="email-otp-remember"
          checked={rememberDevice}
          onCheckedChange={(checked) => setRememberDevice(checked === true)}
          disabled={isLoading}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label htmlFor="email-otp-remember" className="font-normal">
            {t('auth:emailOtp.rememberDevice')}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t('auth:emailOtp.rememberDeviceHint')}
          </p>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('auth:emailOtp.verifying')}
          </>
        ) : (
          t('auth:twoFactor.verify')
        )}
      </Button>

      <div className="space-y-2 text-center text-sm">
        <Button
          ref={resendRef}
          type="button"
          variant={isExpired ? 'default' : 'ghost'}
          size="sm"
          className={cn('w-full', !isExpired && 'text-primary')}
          onClick={() => void handleResend()}
          disabled={!canResend}
          aria-describedby="email-otp-resend-status"
        >
          <RefreshCw
            className={cn('me-2 size-3.5', isResending && 'animate-spin')}
            aria-hidden
          />
          {isResending
            ? t('auth:emailOtp.resending')
            : cooldownSeconds > 0
              ? t('auth:emailOtp.resendIn', {
                  time: formatClock(cooldownSeconds),
                })
              : t('auth:emailOtp.resend')}
        </Button>
        <p
          id="email-otp-resend-status"
          className="text-xs text-muted-foreground"
          aria-live="polite"
        >
          {resendErrorKey ? (
            <span role="alert" className="text-destructive">
              {t(errorsKey(resendErrorKey))}
            </span>
          ) : resentNotice ? (
            t('auth:emailOtp.resent')
          ) : resendsRemaining === 0 ? (
            t('auth:emailOtp.noResendsLeft')
          ) : (
            t('auth:emailOtp.resendsRemaining', { count: resendsRemaining })
          )}
        </p>
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:underline"
          onClick={onCancel}
        >
          {t('auth:twoFactor.backToSignIn')}
        </button>
      </div>
    </>
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="flex items-start gap-3">
            <MailCheck
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden
            />
            <div>
              <h2 className="font-medium">{t('auth:emailOtp.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('auth:emailOtp.description')}{' '}
                <span className="font-medium text-foreground" dir="ltr">
                  {challenge.maskedEmail}
                </span>
              </p>
            </div>
          </div>

          {terminal ? renderTerminal() : renderCodeStep()}
        </form>
      </CardContent>
    </Card>
  );
}
