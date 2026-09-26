/**
 * Registration Form.
 *
 * New user registration form with validation. Prompt 13 replacement for
 * the Prompt 3A scaffold — this used to fake-succeed via `setTimeout`.
 * Now a real mutation via `useRegister` (`authenticationService.register`).
 *
 * NEW CUSTOMER ONBOARDING — ONE PAGE, ONE ACTION. On the management
 * surface (no `academyId`), the form asks `GET /public/signup-options`
 * whether sign-up also creates the organization. When it does, the SAME
 * page adds an organization name and, while trials are on, a trial plan
 * picker, and the single "Create account" button sends all of it in one
 * `POST /auth/register` — the backend creates the account, organization,
 * owner membership and trial in one transaction. There is no intermediate
 * step and no hop through organization-create or the Plans page.
 *
 * Everything else is unchanged by construction: the academy-host learner
 * sign-up never reads the options, and when the flag is off, the options
 * are still loading, or they failed to load, the form is exactly the
 * account-only form it was before.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trans, useTranslation } from 'react-i18next';
import { Eye, EyeOff, Info } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState } from '@components/feedback';
import { useToast } from '@hooks';
import { AUTH_ROUTES } from '@app/routes/route-paths';
import { useServerValidation } from '@forms';
import { toErrorsNamespaceKey } from '@utils';
import { INTENDED_PLAN_STORAGE_KEY } from '@features/home';
import { useRegister, useSignupOptions } from '../hooks';
import { AUTH_ERROR_KEYS } from '../utils/academy-surface.utils';
import { TrialPlanPicker } from './TrialPlanPicker';

/**
 * Registration failures that describe the ACADEMY's policy rather than
 * the submitted data — shown as a dedicated state with no retry, because
 * retrying the same submission cannot change the answer.
 */
const POLICY_ERROR_KEYS: readonly string[] = [
  AUTH_ERROR_KEYS.inviteRequired,
  AUTH_ERROR_KEYS.inviteInvalid,
  AUTH_ERROR_KEYS.academyContextRequired,
  AUTH_ERROR_KEYS.academyHostMismatch,
];

/**
 * Sign-up failures that mean "the options you were shown are stale" —
 * answered by re-reading them, not by an error screen. The first two
 * are about the plan choice and land on the picker; the last means the
 * organization mode itself was switched off, so the form falls back.
 */
const PLAN_REFRESH_ERROR_KEYS: readonly string[] = [
  AUTH_ERROR_KEYS.signupPlanUnavailable,
  AUTH_ERROR_KEYS.signupTrialsUnavailable,
];
const OPTIONS_REFRESH_ERROR_KEYS: readonly string[] = [
  ...PLAN_REFRESH_ERROR_KEYS,
  AUTH_ERROR_KEYS.organizationSignupDisabled,
];

/** Mirrors the backend's `organizationName` rule: trimmed, 2–120 characters. */
const ORGANIZATION_NAME_MIN = 2;
const ORGANIZATION_NAME_MAX = 120;

interface RegistrationMode {
  /** The page also creates an organization (`organizationSignup`). */
  readonly organization: boolean;
  /** A trial plan must be chosen (`trialsEnabled` with at least one plan). */
  readonly planRequired: boolean;
}

const ACCOUNT_ONLY_MODE: RegistrationMode = {
  organization: false,
  planRequired: false,
};

function buildRegistrationSchema(mode: RegistrationMode) {
  return z
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
      organizationName: z.string().optional(),
      planId: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'auth:register.errors.passwordMismatch',
      path: ['confirmPassword'],
    })
    .superRefine((data, context) => {
      if (!mode.organization) return;
      const organizationName = (data.organizationName ?? '').trim();
      if (organizationName.length < ORGANIZATION_NAME_MIN) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organizationName'],
          message: 'auth:register.organization.errors.nameTooShort',
        });
      } else if (organizationName.length > ORGANIZATION_NAME_MAX) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organizationName'],
          message: 'auth:register.organization.errors.nameTooLong',
        });
      }
      if (mode.planRequired && !data.planId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['planId'],
          message: 'auth:register.plan.required',
        });
      }
    });
}

type RegistrationFormData = z.infer<ReturnType<typeof buildRegistrationSchema>>;

/**
 * The plan key the visitor arrived intending to try: `?plan=` first, then
 * the marketing site's `sessionStorage` hand-off. Storage can throw
 * (private mode, blocked site data), which simply means "no intent".
 */
function readIntendedPlanKey(queryPlanKey: string | null): string | null {
  if (queryPlanKey) return queryPlanKey;
  try {
    return window.sessionStorage.getItem(INTENDED_PLAN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearIntendedPlanKey(): void {
  try {
    window.sessionStorage.removeItem(INTENDED_PLAN_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

export interface RegistrationFormProps {
  /**
   * Phase 1 (Extended Scope, Decision 11, dependency D) — supplied only
   * by an Academy's own public website Sign Up page (`PublicWebsiteSignUpPage`),
   * so the resulting account is registered into that specific Academy.
   * Absent for the internal app's own `RegistrationPage` — unchanged,
   * pre-existing self-service Organization-Owner onboarding behavior.
   */
  readonly academyId?: string;
  /**
   * Phase 1 (Extended Scope, dependency C) — overrides the default
   * "navigate to the internal app's Sign In route" behavior, which does
   * not exist inside the public-website route tree. Absent, behavior is
   * unchanged.
   */
  readonly onSuccess?: () => void;
  /**
   * P64 Phase 1 — the invitation token from the sign-up link (`?invite=`).
   * Sent as-is; the backend decides whether this academy's registration
   * policy needs one and whether it is still valid.
   */
  readonly inviteToken?: string;
  /**
   * P64 Phase 1 — where the terms/privacy words in the consent label
   * link to. Absent (an academy website with no legal pages of its own),
   * the label is plain text.
   */
  readonly legalLinks?: {
    readonly terms: string;
    readonly privacy: string;
  };
}

export function RegistrationForm({
  academyId,
  onSuccess,
  inviteToken,
  legalLinks,
}: RegistrationFormProps = {}): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const registerAccount = useRegister();

  /*
    New Customer Onboarding — only the management sign-up asks. An
    academy's own learner sign-up (`academyId` present) never reads the
    options, so it can never grow organization fields.
  */
  const isManagementSurface = !academyId;
  const signupOptionsQuery = useSignupOptions({ enabled: isManagementSurface });
  const signupOptions = isManagementSurface
    ? signupOptionsQuery.data
    : undefined;
  const trialPlans = useMemo(
    () =>
      signupOptions?.organizationSignup && signupOptions.trialsEnabled
        ? signupOptions.trialPlans
        : [],
    [signupOptions]
  );
  const mode: RegistrationMode = signupOptions?.organizationSignup
    ? { organization: true, planRequired: trialPlans.length > 0 }
    : ACCOUNT_ONLY_MODE;

  // The resolver reads the CURRENT mode on every validation, so the rules
  // follow the options (which can change after a stale-options refusal)
  // without re-creating the form and losing what was typed.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const resolver: Resolver<RegistrationFormData> = (values, context, options) =>
    zodResolver(buildRegistrationSchema(modeRef.current))(
      values,
      context,
      options
    );

  const form = useForm<RegistrationFormData>({
    resolver,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      organizationName: '',
      planId: undefined,
    },
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = form;

  // Why the picker is showing a notice: the plan the visitor chose was
  // refused by the server and has been cleared.
  const [planNoticeKey, setPlanNoticeKey] = useState<string>();
  // The organization mode itself was switched off mid-form.
  const [optionsChanged, setOptionsChanged] = useState(false);

  /*
    Pre-selects the plan the visitor arrived for (`?plan=` or the
    marketing hand-off), once, as soon as the options are known. A key
    that is not among the eligible trial plans is ignored rather than
    guessed at. The `sessionStorage` intent is consumed either way, so it
    never leaks into a later, unrelated sign-up.
  */
  const [intendedPlanKey] = useState(() =>
    isManagementSurface ? readIntendedPlanKey(searchParams.get('plan')) : null
  );
  const preselectionDoneRef = useRef(false);
  useEffect(() => {
    if (!isManagementSurface || preselectionDoneRef.current) return;
    if (!signupOptionsQuery.isSuccess && !signupOptionsQuery.isError) return;
    preselectionDoneRef.current = true;
    clearIntendedPlanKey();
    if (!intendedPlanKey) return;
    const intended = trialPlans.find((plan) => plan.key === intendedPlanKey);
    if (intended) setValue('planId', intended.id);
  }, [
    isManagementSurface,
    signupOptionsQuery.isSuccess,
    signupOptionsQuery.isError,
    intendedPlanKey,
    trialPlans,
    setValue,
  ]);

  // Maps a validation (400) failure's per-field violations onto this
  // form — e.g. a stricter server-side password rule than this schema's
  // client-side one — instead of only the generic `ErrorState` below.
  useServerValidation(form, registerAccount.error);

  const failure = registerAccount.error;
  const failureKey = failure?.messageKey;
  const isEmailNotAcceptable = failureKey === AUTH_ERROR_KEYS.emailNotAcceptable;
  // Answered by re-reading the options (see `OPTIONS_REFRESH_ERROR_KEYS`),
  // never by the generic error card.
  const isStaleOptionsFailure =
    !!failureKey && OPTIONS_REFRESH_ERROR_KEYS.includes(failureKey);
  const policyFailureKey =
    failureKey && POLICY_ERROR_KEYS.includes(failureKey) ? failureKey : null;

  // `errors.auth.emailNotAcceptable` is about THIS field, so it is shown on
  // the email input like any other field violation — never as a generic
  // "check the highlighted fields" alert with nothing highlighted. The
  // backend sends it as a bare message key without a `violations` entry,
  // which is why `useServerValidation` above cannot place it.
  const { setError } = form;
  useEffect(() => {
    if (!isEmailNotAcceptable) return;
    setError('email', {
      type: 'server',
      message: toErrorsNamespaceKey(AUTH_ERROR_KEYS.emailNotAcceptable),
    });
  }, [isEmailNotAcceptable, setError]);

  const isLoading = registerAccount.isPending;

  const handleFormSubmit = (data: RegistrationFormData) => {
    setPlanNoticeKey(undefined);
    setOptionsChanged(false);
    // Read at submit time so a refusal-driven refetch is honoured.
    const submitMode = modeRef.current;
    const organizationName = submitMode.organization
      ? (data.organizationName ?? '').trim()
      : undefined;
    const planId =
      submitMode.organization && submitMode.planRequired
        ? data.planId
        : undefined;

    registerAccount.mutate(
      {
        name: data.name,
        email: data.email,
        password: data.password,
        academyId,
        inviteToken,
        ...(organizationName ? { organizationName } : {}),
        ...(planId ? { planId } : {}),
      },
      {
        onSuccess: () => {
          toast({
            title: t('auth:register.success.title'),
            description: t('auth:register.success.description'),
          });
          if (onSuccess) {
            onSuccess();
          } else {
            // The sign-in page greets the new owner and pre-fills the
            // address they just used — one less thing to type.
            navigate(AUTH_ROUTES.signIn, {
              state: { registered: true, email: data.email },
            });
          }
        },
        onError: (error) => {
          const key = error.messageKey;
          if (!key || !OPTIONS_REFRESH_ERROR_KEYS.includes(key)) return;
          // The options the visitor saw are stale: re-read them, and drop
          // a plan choice the server has just refused.
          void signupOptionsQuery.refetch();
          if (PLAN_REFRESH_ERROR_KEYS.includes(key)) {
            setValue('planId', undefined);
            setPlanNoticeKey(
              key === AUTH_ERROR_KEYS.signupTrialsUnavailable
                ? 'auth:register.plan.trialsUnavailable'
                : 'auth:register.plan.unavailable'
            );
          } else {
            setOptionsChanged(true);
          }
        },
      }
    );
  };

  const selectedPlanId = form.watch('planId');

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {optionsChanged ? (
        <Alert data-testid="signup-options-changed">
          <Info className="size-4" aria-hidden />
          <AlertDescription>
            {t('auth:register.organization.signupChanged')}
          </AlertDescription>
        </Alert>
      ) : null}
      {policyFailureKey ? (
        // The academy's registration policy said no — an invite is
        // required, the invite is invalid, or the request was not for
        // this host. No retry: the same submission cannot succeed.
        <ErrorState
          kind={failure?.kind ?? 'forbidden'}
          titleKey={`auth:register.policy.${
            policyFailureKey === AUTH_ERROR_KEYS.inviteRequired
              ? 'inviteRequiredTitle'
              : policyFailureKey === AUTH_ERROR_KEYS.inviteInvalid
                ? 'inviteInvalidTitle'
                : 'unavailableTitle'
          }`}
          descriptionKey={toErrorsNamespaceKey(policyFailureKey)}
          requestId={failure?.requestId}
        />
      ) : registerAccount.error &&
        !isEmailNotAcceptable &&
        !isStaleOptionsFailure &&
        // A validation error with real field violations is shown inline,
        // on the field that caused it, via `useServerValidation` above —
        // this block is for every other failure.
        !(
          registerAccount.error.kind === 'validation' &&
          registerAccount.error.violations &&
          registerAccount.error.violations.length > 0
        ) ? (
        registerAccount.error.kind === 'conflict' ? (
          <div className="space-y-2">
            <ErrorState
              kind="conflict"
              descriptionKey="auth:register.errors.emailTaken"
              onRetry={handleSubmit(handleFormSubmit)}
            />
            {/* The fix for "this email already has an account" is to
                sign in with it, so that is offered right here. Not on
                an academy website, whose sign-in lives elsewhere. */}
            {isManagementSurface ? (
              <p className="text-center text-sm">
                <Link
                  to={AUTH_ROUTES.signIn}
                  state={{ email: form.getValues('email') }}
                  className="font-medium text-primary hover:underline"
                >
                  {t('auth:register.errors.signInInstead')}
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <ErrorState
            kind={registerAccount.error.kind}
            onRetry={handleSubmit(handleFormSubmit)}
          />
        )
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
        {mode.organization ? (
          <div
            className="space-y-5 border-t border-border pt-5"
            data-testid="organization-signup-fields"
          >
            <div className="space-y-2">
              <Label htmlFor="organizationName">
                {t('auth:register.organization.nameLabel')}
              </Label>
              <Input
                id="organizationName"
                type="text"
                placeholder={t('auth:register.organization.namePlaceholder')}
                autoComplete="organization"
                maxLength={ORGANIZATION_NAME_MAX}
                disabled={isLoading}
                {...register('organizationName')}
                aria-invalid={!!errors.organizationName}
              />
              {errors.organizationName ? (
                <p className="text-sm text-destructive">
                  {t(
                    errors.organizationName.message ||
                      'auth:register.organization.errors.nameTooShort'
                  )}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('auth:register.organization.nameHint')}
                </p>
              )}
            </div>

            {mode.planRequired ? (
              <TrialPlanPicker
                plans={trialPlans}
                value={selectedPlanId}
                onChange={(planId) => {
                  setPlanNoticeKey(undefined);
                  setValue('planId', planId, { shouldValidate: true });
                }}
                disabled={isLoading}
                errorKey={errors.planId?.message}
                noticeKey={planNoticeKey}
              />
            ) : (
              // Trials are off (or no plan is trialable right now): the
              // account and organization are still created here, and the
              // plan is chosen on the first setup screen.
              <p
                className="flex items-start gap-2 text-sm text-muted-foreground"
                data-testid="choose-plan-later"
              >
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t(planNoticeKey ?? 'auth:register.plan.chooseLater')}
              </p>
            )}
          </div>
        ) : null}

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
            {legalLinks ? (
              <Trans
                i18nKey="auth:register.acceptTermsLinked"
                components={{
                  terms: (
                    <Link
                      to={legalLinks.terms}
                      className="font-medium text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  privacy: (
                    <Link
                      to={legalLinks.privacy}
                      className="font-medium text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              />
            ) : (
              t('auth:register.acceptTerms')
            )}
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
