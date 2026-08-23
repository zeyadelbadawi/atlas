/**
 * Registration Form.
 *
 * New user registration form with validation. Prompt 13 replacement for
 * the Prompt 3A scaffold — this used to fake-succeed via `setTimeout`.
 * Now a real mutation via `useRegister` (`authenticationService.register`).
 */
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState } from '@components/feedback';
import { useToast } from '@hooks';
import { AUTH_ROUTES } from '@app/routes/route-paths';
import { useRegister } from '../hooks';

const registrationSchema = z
  .object({
    name: z.string().min(2, 'auth:register.errors.nameRequired'),
    email: z
      .string()
      .min(1, 'auth:register.errors.emailRequired')
      .email('auth:register.errors.invalidEmail'),
    password: z.string().min(8, 'auth:register.errors.passwordTooShort'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'auth:register.errors.termsRequired',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth:register.errors.passwordMismatch',
    path: ['confirmPassword'],
  });

type RegistrationFormData = z.infer<typeof registrationSchema>;

export function RegistrationForm(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const registerAccount = useRegister();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const isLoading = registerAccount.isPending;

  const handleFormSubmit = (data: RegistrationFormData) => {
    registerAccount.mutate(
      { name: data.name, email: data.email, password: data.password },
      {
        onSuccess: () => {
          toast({
            title: t('auth:register.success.title'),
            description: t('auth:register.success.description'),
          });
          navigate(AUTH_ROUTES.signIn);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {registerAccount.error ? (
        <ErrorState onRetry={handleSubmit(handleFormSubmit)} />
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('auth:register.name')}</Label>
          <Input
            id="name"
            type="text"
            placeholder={t('auth:register.namePlaceholder')}
            autoComplete="name"
            disabled={isLoading}
            {...register('name')}
            aria-invalid={!!errors.name}
          />
          {errors.name ? (
            <p className="text-sm text-destructive">
              {t(errors.name.message || 'auth:register.errors.nameRequired')}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('auth:register.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('auth:register.emailPlaceholder')}
            autoComplete="email"
            disabled={isLoading}
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">
              {t(errors.email.message || 'auth:register.errors.emailRequired')}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('auth:register.password')}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth:register.passwordPlaceholder')}
              autoComplete="new-password"
              disabled={isLoading}
              {...register('password')}
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
              {t(
                errors.password.message ||
                  'auth:register.errors.passwordTooShort'
              )}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t('auth:register.passwordHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            {t('auth:register.confirmPassword')}
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('auth:register.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              disabled={isLoading}
              {...register('confirmPassword')}
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
              {t(
                errors.confirmPassword.message ||
                  'auth:register.errors.passwordMismatch'
              )}
            </p>
          ) : null}
        </div>
        <div className="flex items-start gap-2">
          <Controller
            name="acceptTerms"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="acceptTerms"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isLoading}
                aria-invalid={!!errors.acceptTerms}
              />
            )}
          />

          <Label
            htmlFor="acceptTerms"
            className="text-sm font-normal leading-relaxed cursor-pointer"
          >
            {t('auth:register.acceptTerms')}
          </Label>
        </div>
        {errors.acceptTerms ? (
          <p className="text-sm text-destructive">
            {t(
              errors.acceptTerms.message || 'auth:register.errors.termsRequired'
            )}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? t('common:actions.loading') : t('auth:register.submit')}
      </Button>
    </form>
  );
}
