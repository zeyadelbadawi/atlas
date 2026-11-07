/**
 * Profile Security Section.
 *
 * Manage password and security settings. Prompt 13 wired password change
 * to the real, pre-existing `currentUserService.changePassword` (it used
 * to fake-save via `setTimeout`).
 *
 * Phase 10 replaced the display-only session block with the real
 * `ProfileSessionsCard`, backed by `GET /auth/sessions` and
 * `DELETE /auth/sessions/:id`.
 *
 * Phase 10.3 replaced the permanently-disabled Two-Factor control with
 * the real `TwoFactorCard`, backed by `/auth/2fa/*`.
 *
 * P66 added `TrustedDevicesCard` beside the sessions — the browsers
 * remembered at an email-code step, backed by `/auth/trusted-devices`.
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@app/providers';
import { useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
import { useServerValidation } from '@forms';
import { useChangePassword } from '../hooks';
import { fieldErrorText, hasViolationOn, useFocusFirstViolation } from '@forms';
import { RequiredMark, SaveFailedAlert } from '@forms';
import { ProfileSessionsCard } from './ProfileSessionsCard';
import { TrustedDevicesCard } from './TrustedDevicesCard';
import { TwoFactorCard } from './TwoFactorCard';
import { SignInMethodsCard } from './SignInMethodsCard';
import type { SignInMethodsScope } from './SignInMethodsCard';

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'profile:errors.currentPasswordRequired'),
    newPassword: z.string().min(8, 'profile:errors.passwordTooShort'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'profile:errors.passwordMismatch',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

/** The backend's 401 for a wrong current password (`UsersService.changePassword`). */
const INVALID_CURRENT_PASSWORD_KEY = 'errors.auth.invalidCurrentPassword';

/** API fields this form can show a violation beside, with their labels. */
const FIELD_LABELS = {
  currentPassword: 'profile:fields.currentPassword',
  newPassword: 'profile:fields.newPassword',
  confirmPassword: 'profile:fields.confirmNewPassword',
} as const;

export interface ProfileSecuritySectionProps {
  /** Google Identity — where "Connect Google" starts from (defaults to management). */
  readonly signInScope?: SignInMethodsScope;
}

export function ProfileSecuritySection({
  signInScope,
}: ProfileSecuritySectionProps = {}): JSX.Element {
  const { t } = useTranslation();
  const { notifySuccess } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const changePassword = useChangePassword();

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = form;

  // B0-SEC-11 — a refused new password (e.g. too common) is shown on the
  // field, not as a generic "something went wrong" card.
  const passwordError = changePassword.error;
  useServerValidation(form, passwordError, { labels: FIELD_LABELS });
  useFocusFirstViolation(form, passwordError, FIELD_LABELS);

  // B1 (V09) — a wrong current password is a 401 with no violation. It
  // belongs on the current-password field, in the backend's own words —
  // not an "Unexpected error" card under a "session expired" toast.
  const wrongCurrentPassword =
    passwordError?.messageKey === INVALID_CURRENT_PASSWORD_KEY;
  const { setError } = form;
  useEffect(() => {
    if (!wrongCurrentPassword) return;
    setError(
      'currentPassword',
      { type: 'server', message: 'errors:auth.invalidCurrentPassword' },
      { shouldFocus: true }
    );
  }, [passwordError, wrongCurrentPassword, setError]);

  // Anything no field can show: one inline message with the real reason.
  const saveFailure =
    passwordError &&
    !wrongCurrentPassword &&
    !hasViolationOn(passwordError, FIELD_LABELS)
      ? passwordError
      : null;

  const isLoading = changePassword.isPending;

  const onPasswordChanged = () => {
    notifySuccess(
      'profile:success.passwordChanged',
      'profile:success.passwordUpdated'
    );
    reset();
  };

  const handleFormSubmit = (data: PasswordFormData) => {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      { onSuccess: onPasswordChanged }
    );
  };

  // A typed password is not dropped silently: leaving asks first, as the
  // other forms do, and "Save and leave" runs the same change.
  useUnsavedChanges({
    isDirty,
    onSave: () =>
      saveViaForm({ handleSubmit }, async (data: PasswordFormData) => {
        try {
          await changePassword.mutateAsync({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          });
          onPasswordChanged();
          return true;
        } catch {
          return false;
        }
      }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('profile:sections.security.changePassword')}</CardTitle>
          <CardDescription>
            {t('profile:sections.security.passwordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  {t('profile:fields.currentPassword')}
                  <RequiredMark />
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder={t('profile:placeholders.currentPassword')}
                    disabled={isLoading}
                    {...register('currentPassword')}
                    aria-required
                    aria-invalid={!!errors.currentPassword}
                    aria-describedby={
                      errors.currentPassword
                        ? 'currentPassword-error'
                        : undefined
                    }
                    className="pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                    aria-label={
                      showCurrentPassword
                        ? t('common:actions.hidePassword')
                        : t('common:actions.showPassword')
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                {errors.currentPassword ? (
                  <p
                    id="currentPassword-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {fieldErrorText(
                      t,
                      errors.currentPassword.message ||
                        'profile:errors.currentPasswordRequired',
                      t('profile:fields.currentPassword')
                    )}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {t('profile:fields.newPassword')}
                  <RequiredMark />
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder={t('profile:placeholders.newPassword')}
                    disabled={isLoading}
                    {...register('newPassword')}
                    aria-required
                    aria-invalid={!!errors.newPassword}
                    aria-describedby={
                      errors.newPassword ? 'newPassword-error' : undefined
                    }
                    className="pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                    aria-label={
                      showNewPassword
                        ? t('common:actions.hidePassword')
                        : t('common:actions.showPassword')
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                {errors.newPassword ? (
                  <p
                    id="newPassword-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {fieldErrorText(
                      t,
                      errors.newPassword.message ||
                        'profile:errors.passwordTooShort',
                      t('profile:fields.newPassword')
                    )}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {t('profile:hints.passwordRequirements')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t('profile:fields.confirmNewPassword')}
                  <RequiredMark />
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('profile:placeholders.confirmPassword')}
                    disabled={isLoading}
                    {...register('confirmPassword')}
                    aria-required
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={
                      errors.confirmPassword
                        ? 'confirmPassword-error'
                        : undefined
                    }
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
                  <p
                    id="confirmPassword-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {fieldErrorText(
                      t,
                      errors.confirmPassword.message ||
                        'profile:errors.passwordMismatch',
                      t('profile:fields.confirmNewPassword')
                    )}
                  </p>
                ) : null}
              </div>
            </div>

            {saveFailure ? (
              <SaveFailedAlert
                error={saveFailure}
                titleKey="profile:errors.passwordNotChanged"
                onRetry={handleSubmit(handleFormSubmit)}
              />
            ) : null}

            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t('common:actions.saving')
                : t('profile:actions.changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <SignInMethodsCard scope={signInScope} />

      <TwoFactorCard />

      <ProfileSessionsCard />

      <TrustedDevicesCard />
    </div>
  );
}
