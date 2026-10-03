/**
 * Academy Join Form — smart academy signup.
 *
 * The "you already have an Atlas account" step of an academy website's
 * sign-up page: the visitor proves the account with its own password and
 * the backend adds THIS academy to it (`POST /auth/academy-join`). Nothing
 * is created and nothing about the account changes.
 *
 * Nothing here tells a visitor whether an email has an account: the page
 * reaches this step either because the visitor chose it, or because the
 * sign-up they submitted was already answered with "this email is
 * registered" by `/auth/register`. The join itself answers an unknown email
 * and a wrong password identically, like a sign-in.
 *
 * Called directly rather than through a query-cache mutation, exactly like
 * `useSignIn`: a wrong password is answered here, inline, and must never
 * reach the app-wide error toast (which reads any 401 as "your session has
 * expired").
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, UserCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toErrorsNamespaceKey } from '@utils';
import { normalizeUnknownError } from '@api';
import type { ApiError } from '@api';
import { authenticationService } from '@services/identity';
import type { AcademyJoinResult } from '@types';
import { AUTH_ERROR_KEYS } from '../utils/academy-surface.utils';

const joinSchema = z.object({
  email: z
    .string()
    .min(1, 'auth:signIn.errors.emailRequired')
    .email('auth:signIn.errors.invalidEmail'),
  password: z.string().min(1, 'auth:signIn.errors.passwordRequired'),
});

type JoinFormData = z.infer<typeof joinSchema>;

/** Backend refusals worth their own copy; anything else is the generic one. */
const SPECIFIC_ERROR_KEYS: readonly string[] = [
  AUTH_ERROR_KEYS.academyAccessBlocked,
  AUTH_ERROR_KEYS.inviteRequired,
  AUTH_ERROR_KEYS.inviteInvalid,
  AUTH_ERROR_KEYS.academyHostMismatch,
  AUTH_ERROR_KEYS.academyContextRequired,
  'errors.auth.rateLimited',
];

export interface AcademyJoinCredentials {
  readonly email: string;
  readonly password: string;
}

export interface AcademyJoinFormProps {
  readonly academyId: string;
  /** This academy's name — public; the explanation names it. */
  readonly academyName: string;
  readonly inviteToken?: string;
  readonly defaultEmail?: string;
  /**
   * `existing_email`: the sign-up just told the visitor this email is
   * registered. `proactive`: they chose "join with my Atlas account".
   */
  readonly reason: 'existing_email' | 'proactive';
  /** The account joined (or already was a learner here). */
  readonly onJoined: (
    result: AcademyJoinResult | null,
    credentials: AcademyJoinCredentials
  ) => void;
  readonly onBack: () => void;
  /**
   * `existing_email` only: the email is shown locked (it is the one the
   * sign-up was answered for); this unlocks it by returning to the form.
   */
  readonly onChangeEmail?: (email: string) => void;
  readonly forgotPasswordHref?: string;
  readonly renderLink?: (props: {
    readonly href: string;
    readonly className: string;
    readonly children: string;
  }) => JSX.Element;
}

function joinErrorKey(error: ApiError): string {
  if (error.kind === 'unauthorized') {
    return 'auth:signIn.errors.invalidCredentials';
  }
  // W4 — the ACCOUNT's name is already a learner's name here; this form has
  // no name field, so the copy says where to change it.
  if (error.messageKey === 'errors.academy.learnerNameTaken') {
    return 'auth:academyJoin.errors.nameTaken';
  }
  if (error.messageKey && SPECIFIC_ERROR_KEYS.includes(error.messageKey)) {
    return toErrorsNamespaceKey(error.messageKey);
  }
  if (error.kind === 'rateLimited') return 'errors:auth.rateLimited';
  if (error.kind === 'forbidden') return 'auth:academyJoin.errors.refused';
  return 'auth:academyJoin.errors.generic';
}

export function AcademyJoinForm({
  academyId,
  academyName,
  inviteToken,
  defaultEmail,
  reason,
  onJoined,
  onBack,
  onChangeEmail,
  forgotPasswordHref,
  renderLink,
}: AcademyJoinFormProps): JSX.Element {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // The email the sign-up was answered for stays locked — a different
  // address is a different question, answered by the sign-up form again.
  const emailLocked = reason === 'existing_email' && !!defaultEmail;

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema),
    defaultValues: { email: defaultEmail ?? '', password: '' },
  });

  const onSubmit = async (data: JoinFormData) => {
    const credentials = { email: data.email.trim(), password: data.password };
    setError(null);
    setIsLoading(true);
    try {
      const result = await authenticationService.joinAcademy({
        ...credentials,
        academyId,
        inviteToken,
      });
      setIsLoading(false);
      onJoined(result, credentials);
    } catch (caught) {
      setIsLoading(false);
      const failure = normalizeUnknownError(caught);
      // Only reachable with the right password: the account is already a
      // learner here, so there is nothing to join — just sign in.
      if (failure.messageKey === AUTH_ERROR_KEYS.alreadyLearnerHere) {
        onJoined(null, credentials);
        return;
      }
      setError(failure);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      aria-labelledby="academy-join-title"
      noValidate
    >
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
        <UserCheck
          className="mt-0.5 size-5 shrink-0 text-[var(--website-primary-solid,currentColor)]"
          aria-hidden
        />
        <div className="space-y-1 text-sm">
          <p id="academy-join-title" className="font-medium text-foreground">
            {t(
              reason === 'existing_email'
                ? 'auth:academyJoin.existingTitle'
                : 'auth:academyJoin.proactiveTitle'
            )}
          </p>
          {reason === 'existing_email' ? (
            <p className="text-muted-foreground">
              {t('auth:academyJoin.existingWhy', { academyName })}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            {t(
              reason === 'existing_email'
                ? 'auth:academyJoin.existingDescription'
                : 'auth:academyJoin.proactiveDescription',
              { academyName }
            )}
          </p>
          <p className="text-muted-foreground">
            {t('auth:academyJoin.passwordPrompt')}
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{t(joinErrorKey(error))}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="academy-join-email">{t('auth:signIn.email')}</Label>
          {emailLocked ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {/* The address reads left-to-right in every locale, so its
                  box (icon + padding) is LTR too — otherwise, on an RTL
                  page, the icon and the padding land on opposite sides. */}
              <div className="relative min-w-0 flex-1" dir="ltr">
                <Lock
                  className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="academy-join-email"
                  type="email"
                  dir="ltr"
                  readOnly
                  aria-readonly="true"
                  className="bg-muted ps-9"
                  {...register('email')}
                />
              </div>
              {onChangeEmail ? (
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => onChangeEmail(getValues('email'))}
                  disabled={isLoading}
                >
                  {t('auth:academyJoin.changeEmail')}
                </button>
              ) : null}
            </div>
          ) : (
            <Input
              id="academy-join-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              disabled={isLoading}
              {...register('email')}
              aria-invalid={!!errors.email}
              aria-describedby={
                errors.email ? 'academy-join-email-error' : undefined
              }
            />
          )}
          {errors.email ? (
            <p
              id="academy-join-email-error"
              className="text-sm text-destructive"
            >
              {t(errors.email.message || 'auth:signIn.errors.emailRequired')}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="academy-join-password">
            {t('auth:academyJoin.passwordLabel')}
          </Label>
          <div className="relative">
            <Input
              id="academy-join-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus={!!defaultEmail}
              disabled={isLoading}
              {...register('password')}
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? 'academy-join-password-error' : undefined
              }
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
            <p
              id="academy-join-password-error"
              className="text-sm text-destructive"
            >
              {t(
                errors.password.message || 'auth:signIn.errors.passwordRequired'
              )}
            </p>
          ) : null}
          {forgotPasswordHref && renderLink ? (
            <p className="text-sm text-muted-foreground">
              {t('auth:academyJoin.forgotPassword')}{' '}
              {renderLink({
                href: forgotPasswordHref,
                className: 'font-medium text-primary hover:underline',
                children: t('auth:academyJoin.resetPassword'),
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading
            ? t('common:actions.loading')
            : t('auth:academyJoin.submit')}
        </Button>
        {emailLocked ? null : (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBack}
            disabled={isLoading}
          >
            {t('auth:academyJoin.back')}
          </Button>
        )}
      </div>
    </form>
  );
}
