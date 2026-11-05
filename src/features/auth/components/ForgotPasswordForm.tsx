/**
 * Forgot Password Form.
 *
 * Request password reset link via email. Prompt 13 replacement for the
 * Prompt 3A scaffold — this used to fake-succeed via `setTimeout`. Now a
 * real mutation via `useRequestPasswordReset`
 * (`authenticationService.requestPasswordReset`).
 *
 * B1 (UX audit): a failure shows ONE message, the real reason, here (the
 * mutation is `inlineErrors`, so no toast repeats it); a 400 that names the
 * email marks the field (V20, V21). The confirmation reads at full contrast
 * in light and dark (V04).
 */
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { useServerValidation } from '@forms';
import { useRequestPasswordReset } from '../hooks';
import {
  useAuthFailureText,
  useFieldErrorText,
  violationsAllOn,
} from '../utils/auth-error-text';
import { REQUIRED_LABEL_CLASS } from '../utils/required-label';
import { AuthFormAlert } from './AuthFormAlert';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'auth:forgotPassword.errors.emailRequired')
    .email('auth:forgotPassword.errors.invalidEmail'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const FORGOT_FIELDS: readonly string[] = ['email'];

export function ForgotPasswordForm(): JSX.Element {
  const { t } = useTranslation();
  const requestPasswordReset = useRequestPasswordReset();
  const failureText = useAuthFailureText();
  const fieldErrorText = useFieldErrorText();
  const successRef = useRef<HTMLDivElement>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = form;

  const failure = requestPasswordReset.error;
  useServerValidation(form, failure);
  const onField = violationsAllOn(failure, FORGOT_FIELDS);
  useEffect(() => {
    if (onField) setFocus('email');
  }, [failure, onField, setFocus]);

  const isLoading = requestPasswordReset.isPending;
  const isSuccess = requestPasswordReset.isSuccess;

  // The form is replaced by the confirmation: focus follows, so it is read.
  useEffect(() => {
    if (isSuccess) successRef.current?.focus();
  }, [isSuccess]);

  const handleFormSubmit = (data: ForgotPasswordFormData) => {
    requestPasswordReset.mutate({ email: data.email });
  };

  if (isSuccess) {
    return (
      <Alert
        ref={successRef}
        tabIndex={-1}
        role="status"
        data-testid="forgot-password-success"
        // Semantic success tokens: body text in `foreground` on the success
        // surface (well above 4.5:1 in both themes), the icon and border
        // carry the green.
        className="border-success/50 bg-success-surface text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>svg]:text-success"
      >
        <CheckCircle2 className="size-4" aria-hidden />
        <AlertTitle>{t('auth:forgotPassword.success.title')}</AlertTitle>
        <AlertDescription>
          {t('auth:forgotPassword.success.description')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      <AuthFormAlert
        message={failure && !onField ? failureText(failure) : null}
        focusKey={failure}
        requestId={failure?.kind === 'server' ? failure.requestId : undefined}
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className={REQUIRED_LABEL_CLASS}>
            {t('auth:forgotPassword.email')}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t('auth:forgotPassword.emailPlaceholder')}
            autoComplete="email"
            disabled={isLoading}
            {...register('email')}
            aria-required
            aria-invalid={!!errors.email}
            aria-describedby={
              errors.email ? 'email-error email-hint' : 'email-hint'
            }
          />
          {errors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              {fieldErrorText(
                errors.email,
                'auth:forgotPassword.errors.emailRequired'
              )}
            </p>
          ) : null}
          <p id="email-hint" className="text-sm text-muted-foreground">
            {t('auth:forgotPassword.emailHint')}
          </p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading
          ? t('common:actions.loading')
          : t('auth:forgotPassword.submit')}
      </Button>
    </form>
  );
}
