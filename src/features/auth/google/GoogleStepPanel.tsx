/**
 * Google Identity — the one step a Google sign-in can need before a
 * session exists (`GoogleStep.googleStep`):
 *
 *  - `link_required`: the address belongs to an Atlas account that has not
 *    connected Google. An address match is a question, never an answer —
 *    the owner proves the account with its password, and only then is
 *    Google connected (and the person signed in).
 *  - `create_account`: no Atlas account uses this address. Nothing is
 *    created until the person confirms here, with the same fields (and
 *    terms) as the password sign-up of this surface.
 *  - `activate_invited`: an invited account whose address Google vouches
 *    for; one confirmation activates it.
 *
 * Each answer is the step endpoint's own: a session or a challenge goes to
 * `onResult`; a wrong password can be retried (the backend releases the
 * step); anything else ends the flow via `onFailure`.
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Info, Link2, UserPlus, MailCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';
import type { GoogleSignInResult, GoogleStep, SignInSurface } from '@types';
import { useSignupOptions } from '../hooks';
import { TrialPlanPicker } from '../components/TrialPlanPicker';
import { GoogleLogo } from './GoogleAuthButton';
import { GOOGLE_ERROR_KEYS, useGoogleErrorMessage } from './google-errors';

/** Mirrors the password sign-up's rules (`RegistrationForm`). */
const NAME_MIN = 2;
const ORGANIZATION_NAME_MIN = 2;
const ORGANIZATION_NAME_MAX = 120;

/** A failure the person can fix on this same step (the backend gave the step back). */
const RETRYABLE_KEYS: readonly string[] = [
  GOOGLE_ERROR_KEYS.invalidCredentials,
  'errors.auth.rateLimited',
];

export interface GoogleStepPanelProps {
  readonly step: GoogleStep;
  readonly surface: SignInSurface;
  readonly inviteToken?: string;
  readonly forgotPasswordHref: string;
  /** Management sign-up: where the terms/privacy words link to. */
  readonly legalLinks?: { readonly terms: string; readonly privacy: string };
  readonly onResult: (result: GoogleSignInResult) => void;
  readonly onFailure: (error: ApiError) => void;
  readonly onCancel: () => void;
}

export function GoogleStepPanel(props: GoogleStepPanelProps): JSX.Element {
  const { step } = props;
  return (
    <div className="space-y-6" data-testid={`google-step-${step.googleStep}`}>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <GoogleLogo className="size-5 shrink-0" />
        <span className="min-w-0 break-all font-medium" dir="ltr">
          {step.email}
        </span>
      </div>
      {step.googleStep === 'link_required' ? (
        <LinkStep {...props} />
      ) : step.googleStep === 'create_account' ? (
        <CreateStep {...props} />
      ) : (
        <ActivateStep {...props} />
      )}
    </div>
  );
}

/** Runs one step request; retryable failures stay on the step. */
function useStepSubmit(
  props: GoogleStepPanelProps,
  send: () => Promise<GoogleSignInResult>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      props.onResult(await send());
    } catch (caught) {
      const apiError = caught as ApiError;
      setIsSubmitting(false);
      // A 400 is a field the person can change (name, organization,
      // plan); the backend kept the step open for exactly these.
      if (
        RETRYABLE_KEYS.includes(apiError.messageKey) ||
        apiError.status === 400
      ) {
        setError(apiError);
        return;
      }
      props.onFailure(apiError);
    }
  };
  return { submit, isSubmitting, error };
}

function StepError({
  error,
}: {
  readonly error: ApiError | null;
}): JSX.Element | null {
  const messageFor = useGoogleErrorMessage();
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{messageFor(error)}</AlertDescription>
    </Alert>
  );
}

function StepActions({
  submitLabel,
  isSubmitting,
  onCancel,
}: {
  readonly submitLabel: string;
  readonly isSubmitting: boolean;
  readonly onCancel: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? t('common:actions.loading') : submitLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        {t('auth:google.steps.cancel')}
      </Button>
    </div>
  );
}

function LinkStep(props: GoogleStepPanelProps): JSX.Element {
  const { t } = useTranslation();
  const { step, inviteToken, forgotPasswordHref, onCancel } = props;
  const [password, setPassword] = useState('');
  const { submit, isSubmitting, error } = useStepSubmit(props, () =>
    authenticationService.googleLink({
      pending: step.pending,
      password,
      ...(inviteToken ? { inviteToken } : {}),
    })
  );
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (password.length === 0) return;
    void submit();
  };
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Link2 className="size-5 text-primary" aria-hidden />
          {t('auth:google.steps.link.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('auth:google.steps.link.description')}
        </p>
      </div>
      <StepError error={error} />
      <div className="space-y-2">
        <Label htmlFor="google-link-password">
          {t('auth:google.steps.link.passwordLabel')}
        </Label>
        <Input
          id="google-link-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          aria-invalid={!!error}
        />
        <Link
          to={forgotPasswordHref}
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          {t('auth:signIn.forgotPassword')}
        </Link>
      </div>
      <StepActions
        submitLabel={t('auth:google.steps.link.submit')}
        isSubmitting={isSubmitting || password.length === 0}
        onCancel={onCancel}
      />
    </form>
  );
}

function ActivateStep(props: GoogleStepPanelProps): JSX.Element {
  const { t } = useTranslation();
  const { step, inviteToken, onCancel } = props;
  const { submit, isSubmitting, error } = useStepSubmit(props, () =>
    authenticationService.googleActivate({
      pending: step.pending,
      ...(inviteToken ? { inviteToken } : {}),
    })
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <MailCheck className="size-5 text-primary" aria-hidden />
          {t('auth:google.steps.activate.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('auth:google.steps.activate.description')}
        </p>
      </div>
      <StepError error={error} />
      <StepActions
        submitLabel={t('auth:google.steps.activate.submit')}
        isSubmitting={isSubmitting}
        onCancel={onCancel}
      />
    </form>
  );
}

function CreateStep(props: GoogleStepPanelProps): JSX.Element {
  const { t } = useTranslation();
  const { step, surface, inviteToken, legalLinks, onCancel } = props;
  const isManagement = surface === 'management';
  const signupOptionsQuery = useSignupOptions({ enabled: isManagement });
  const signupOptions = isManagement ? signupOptionsQuery.data : undefined;
  const organizationMode = signupOptions?.organizationSignup === true;
  const trialPlans =
    organizationMode && signupOptions?.trialsEnabled
      ? signupOptions.trialPlans
      : [];
  const planRequired = trialPlans.length > 0;

  const [name, setName] = useState(step.name ?? '');
  const [organizationName, setOrganizationName] = useState('');
  const [planId, setPlanId] = useState<string>();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const trimmedOrganization = organizationName.trim();
  const { submit, isSubmitting, error } = useStepSubmit(props, () =>
    authenticationService.googleCreateAccount({
      pending: step.pending,
      name: name.trim(),
      ...(inviteToken ? { inviteToken } : {}),
      ...(organizationMode ? { organizationName: trimmedOrganization } : {}),
      ...(organizationMode && planRequired && planId ? { planId } : {}),
    })
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < NAME_MIN)
      next.name = 'auth:register.errors.nameRequired';
    if (organizationMode) {
      if (trimmedOrganization.length < ORGANIZATION_NAME_MIN) {
        next.organizationName =
          'auth:register.organization.errors.nameTooShort';
      } else if (trimmedOrganization.length > ORGANIZATION_NAME_MAX) {
        next.organizationName = 'auth:register.organization.errors.nameTooLong';
      }
      if (planRequired && !planId) next.planId = 'auth:register.plan.required';
    }
    if (!acceptTerms) next.acceptTerms = 'auth:register.errors.termsRequired';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    void submit();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <UserPlus className="size-5 text-primary" aria-hidden />
          {t('auth:google.steps.create.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('auth:google.steps.create.description')}
        </p>
      </div>
      <StepError error={error} />
      <div className="space-y-2">
        <Label htmlFor="google-create-name">{t('auth:register.name')}</Label>
        <Input
          id="google-create-name"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSubmitting}
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name ? (
          <p className="text-sm text-destructive">{t(fieldErrors.name)}</p>
        ) : null}
      </div>

      {organizationMode ? (
        <div className="space-y-5 border-t border-border pt-5">
          <div className="space-y-2">
            <Label htmlFor="google-create-organization">
              {t('auth:register.organization.nameLabel')}
            </Label>
            <Input
              id="google-create-organization"
              type="text"
              autoComplete="organization"
              placeholder={t('auth:register.organization.namePlaceholder')}
              maxLength={ORGANIZATION_NAME_MAX}
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.organizationName}
            />
            {fieldErrors.organizationName ? (
              <p className="text-sm text-destructive">
                {t(fieldErrors.organizationName)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('auth:register.organization.nameHint')}
              </p>
            )}
          </div>
          {planRequired ? (
            <TrialPlanPicker
              plans={trialPlans}
              value={planId}
              onChange={setPlanId}
              disabled={isSubmitting}
              errorKey={fieldErrors.planId}
            />
          ) : (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t('auth:register.plan.chooseLater')}
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <Checkbox
            id="google-create-terms"
            checked={acceptTerms}
            onCheckedChange={(value) => setAcceptTerms(value === true)}
            disabled={isSubmitting}
            aria-invalid={!!fieldErrors.acceptTerms}
          />
          <Label
            htmlFor="google-create-terms"
            className="cursor-pointer text-sm font-normal leading-relaxed"
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
        {fieldErrors.acceptTerms ? (
          <p className="text-sm text-destructive">
            {t(fieldErrors.acceptTerms)}
          </p>
        ) : null}
      </div>

      <StepActions
        submitLabel={t('auth:google.steps.create.submit')}
        isSubmitting={isSubmitting}
        onCancel={onCancel}
      />
    </form>
  );
}
