/**
 * Sign In Form.
 *
 * Email and password authentication form with validation.
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AUTH_ROUTES } from '@app/routes/route-paths';
import { useServerValidation } from '@forms';
import type { ApiError } from '@api';
import {
  useAuthFailureText,
  useFieldErrorText,
  violationsAllOn,
} from '../utils/auth-error-text';
import { REQUIRED_LABEL_CLASS } from '../utils/required-label';
import { AuthFormAlert } from './AuthFormAlert';

const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'auth:signIn.errors.emailRequired')
    .email('auth:signIn.errors.invalidEmail'),
  password: z.string().min(1, 'auth:signIn.errors.passwordRequired'),
});

type SignInFormData = z.infer<typeof signInSchema>;

const SIGN_IN_FIELDS: readonly string[] = ['email', 'password'];

export interface SignInFormProps {
  /**
   * B0-CPY-04 — no "Remember me": the server ignored it (session lifetime
   * is fixed by the session caps). The real control is "Remember this
   * device" on the emailed-code step.
   */
  readonly onSubmit: (email: string, password: string) => Promise<void>;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  /**
   * P64 Phase 1 — where "Forgot password?" goes. Defaults to Atlas's own
   * `/auth/forgot-password`; an academy website passes its own on-site
   * `/forgot-password` (locale-prefixed), since the `/auth/*` tree is not
   * mounted on an academy host at all.
   */
  readonly forgotPasswordHref?: string;
  /**
   * New Customer Onboarding — pre-fills the email field, e.g. with the
   * address an account was just created with. Absent, the field starts
   * empty as before.
   */
  readonly defaultEmail?: string;
}

export function SignInForm({
  onSubmit,
  isLoading,
  error,
  forgotPasswordHref = AUTH_ROUTES.forgotPassword,
  defaultEmail,
}: SignInFormProps): JSX.Element {
  const { t } = useTranslation();
  // B1 (V01) — only a 401 means the credentials were wrong. A server
  // error, a dropped connection or a rate limit says what really happened.
  const failureText = useAuthFailureText({
    unauthorized: 'auth:signIn.errors.invalidCredentials',
  });
  const fieldErrorText = useFieldErrorText();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: defaultEmail ?? '',
      password: '',
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  // B1 (V21) — a 400 that names a field marks that field.
  useServerValidation(form, error);
  const onFields = violationsAllOn(error, SIGN_IN_FIELDS);
  const { setFocus } = form;
  useEffect(() => {
    const first = onFields ? error?.violations?.[0]?.field : undefined;
    if (first) setFocus(first as keyof SignInFormData);
  }, [error, onFields, setFocus]);

  const handleFormSubmit = async (data: SignInFormData) => {
    await onSubmit(data.email, data.password);
  };

  return (
    // `noValidate`: the app's own messages, in the page's language — never
    // the browser's English bubble on top of them (B1, V19).
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* A failure the fields cannot show (anything but a 400 on email or
          password) — its real reason, focused so it is read first. */}
      <AuthFormAlert
        message={error && !onFields ? failureText(error) : null}
        focusKey={error}
        requestId={error?.kind === 'server' ? error.requestId : undefined}
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className={REQUIRED_LABEL_CLASS}>
            {t('auth:signIn.email')}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t('auth:signIn.emailPlaceholder')}
            autoComplete="email"
            disabled={isLoading}
            {...register('email')}
            aria-required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              {fieldErrorText(errors.email, 'auth:signIn.errors.emailRequired')}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={REQUIRED_LABEL_CLASS}>
            {t('auth:signIn.password')}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth:signIn.passwordPlaceholder')}
              autoComplete="current-password"
              disabled={isLoading}
              {...register('password')}
              aria-required
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
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
            <p id="password-error" className="text-sm text-destructive">
              {fieldErrorText(
                errors.password,
                'auth:signIn.errors.passwordRequired'
              )}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end">
          <Link
            to={forgotPasswordHref}
            className="text-sm font-medium text-primary hover:underline"
            tabIndex={isLoading ? -1 : 0}
          >
            {t('auth:signIn.forgotPassword')}
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? t('common:actions.loading') : t('auth:signIn.submit')}
      </Button>
    </form>
  );
}
