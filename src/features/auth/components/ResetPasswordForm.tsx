/**
 * Reset Password Form.
 *
 * Set new password with confirmation. Prompt 13 replacement for the
 * Prompt 3A scaffold — this used to fake-succeed via `setTimeout`. Now a
 * real mutation via `useConfirmPasswordReset`
 * (`authenticationService.confirmPasswordReset`).
 *
 * B1 (UX audit): a link refused on submit is not "Unexpected error — Try
 * again" (it can never succeed): the page swaps to "this link can't be
 * used — request a new one" (V10). Any other failure is ONE message with its
 * real reason (V20); an empty password says "required" (V22).
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@hooks';
import { useServerValidation } from '@forms';
import { AUTH_ROUTES } from '@app/routes/route-paths';
import type { ApiError } from '@api';
import { useConfirmPasswordReset } from '../hooks';
import {
  useAuthFailureText,
  useFieldErrorText,
  violationsAllOn,
} from '../utils/auth-error-text';
import { REQUIRED_LABEL_CLASS } from '../utils/required-label';
import { AuthFormAlert } from './AuthFormAlert';

/** The backend's answer for an unknown, used or expired reset/setup token. */
export const INVALID_RESET_TOKEN_KEY = 'errors.auth.invalidResetToken';

/** Whether a reset failure means the LINK is dead (a retry cannot help). */
export function isInvalidResetTokenError(
  error: Pick<ApiError, 'messageKey'> | null
): boolean {
  return error?.messageKey === INVALID_RESET_TOKEN_KEY;
}

/** The wire name of the new password is `newPassword`; the form calls it `password`. */
const FIELD_ALIASES = { newPassword: 'password' } as const;
const RESET_FIELDS: readonly string[] = [
  'newPassword',
  'password',
  'confirmPassword',
];

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'auth:resetPassword.errors.passwordRequired')
      .min(8, 'auth:resetPassword.errors.passwordTooShort'),
    confirmPassword: z
      .string()
      .min(1, 'auth:resetPassword.errors.confirmRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth:resetPassword.errors.passwordMismatch',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export interface ResetPasswordFormProps {
  readonly token: string;
  /**
   * P64 Phase 1 — overrides the default "navigate to Atlas's own sign-in"
   * behaviour, which does not exist inside an academy website's route
   * tree. Absent, behaviour is unchanged.
   */
  readonly onSuccess?: () => void;
  /**
   * `setup` — the account-setup link (`setup=1`): the person never had a
   * password, so the button and the confirmation say "set", not "reset".
   * Same token, same endpoint.
   */
  readonly variant?: 'reset' | 'setup';
  /**
   * Called when the server refuses the LINK on submit (expired or used while
   * the person typed), so the page can show its "request a new link" state.
   * Absent (an academy website, whose page owns its own links), the form
   * says so itself, in place of the generic failure.
   */
  readonly onInvalidToken?: () => void;
}

export function ResetPasswordForm({
  token,
  onSuccess,
  variant = 'reset',
  onInvalidToken,
}: ResetPasswordFormProps): JSX.Element {
  const copy = variant === 'setup' ? 'auth:setPassword' : 'auth:resetPassword';
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const confirmPasswordReset = useConfirmPasswordReset();
  const failureText = useAuthFailureText();
  const fieldErrorText = useFieldErrorText();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = form;

  const isLoading = confirmPasswordReset.isPending;

  // B0-SEC-11 — the server refuses some new passwords (e.g. too common).
  // Its `newPassword` violation belongs on this form's `password` field,
  // not in a generic "something went wrong" card.
  const resetError = confirmPasswordReset.error;
  useServerValidation(form, resetError, FIELD_ALIASES);
  const onFields = violationsAllOn(resetError, RESET_FIELDS);
  useEffect(() => {
    if (onFields) setFocus('password');
  }, [resetError, onFields, setFocus]);

  const tokenRefused = isInvalidResetTokenError(resetError);
  useEffect(() => {
    if (tokenRefused) onInvalidToken?.();
    // `resetError` identity: once per refusal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetError, tokenRefused]);

  const handleFormSubmit = (data: ResetPasswordFormData) => {
    confirmPasswordReset.mutate(
      { token, newPassword: data.password },
      {
        onSuccess: () => {
          toast({
            title: t(`${copy}.success.title`),
            description: t(`${copy}.success.description`),
          });
          if (onSuccess) {
            onSuccess();
          } else {
            navigate(AUTH_ROUTES.signIn);
          }
        },
      }
    );
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      <AuthFormAlert
        message={
          !resetError || onFields || (tokenRefused && onInvalidToken)
            ? null
            : tokenRefused
              ? t(`${copy}.errors.invalidToken`)
              : failureText(resetError)
        }
        focusKey={resetError}
        requestId={
          resetError?.kind === 'server' ? resetError.requestId : undefined
        }
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className={REQUIRED_LABEL_CLASS}>
            {t('auth:resetPassword.newPassword')}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth:resetPassword.passwordPlaceholder')}
              autoComplete="new-password"
              disabled={isLoading}
              {...register('password')}
              aria-required
              aria-invalid={!!errors.password}
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
              aria-label={
                showPassword
                  ? t('common:actions.hidePassword')
                  : t('common:actions.showPassword')
              }
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-sm text-destructive">
              {fieldErrorText(
                errors.password,
                'auth:resetPassword.errors.passwordTooShort'
              )}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t('auth:resetPassword.passwordHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className={REQUIRED_LABEL_CLASS}>
            {t('auth:resetPassword.confirmPassword')}
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('auth:resetPassword.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              disabled={isLoading}
              {...register('confirmPassword')}
              aria-required
              aria-invalid={!!errors.confirmPassword}
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
              aria-label={
                showConfirmPassword
                  ? t('common:actions.hidePassword')
                  : t('common:actions.showPassword')
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {fieldErrorText(
                errors.confirmPassword,
                'auth:resetPassword.errors.passwordMismatch'
              )}
            </p>
          ) : null}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? t('common:actions.loading') : t(`${copy}.submit`)}
      </Button>
    </form>
  );
}
