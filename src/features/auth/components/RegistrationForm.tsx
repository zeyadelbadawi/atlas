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
 *
 * B1 (UX audit): the browser's own validation bubble is off (`noValidate`),
 * so every message is the app's, in the page's language (V19); each rule
 * says what is really wrong — "too short", not "required" (V22, V42);
 * required fields are marked (V23); two or more problems are listed in a
 * summary at the top, and after a server error focus moves to the message
 * or the field it is about (V24). "This phone number is already in use" is
 * a phone-field error, never the "email already exists" card (V03).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import type { RegistrationResult } from '@types';
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
import {
  FormErrorSummary,
  isFieldViolationError,
  PHONE_TAKEN_ERROR_KEY,
  useNameConflictError,
  useServerValidation,
} from '@forms';
import { cn, toErrorsNamespaceKey } from '@utils';
import { INTENDED_PLAN_STORAGE_KEY } from '@features/home';
import { useRegister, useSignupOptions } from '../hooks';
import { AUTH_ERROR_KEYS } from '../utils/academy-surface.utils';
import { TrialPlanPicker } from './TrialPlanPicker';
import { AuthFormAlert } from './AuthFormAlert';
import {
  useAuthFailureText,
  useFieldErrorText,
} from '../utils/auth-error-text';
import {
  REQUIRED_LABEL_CLASS,
  REQUIRED_PHONE_LABEL_CLASS,
} from '../utils/required-label';
import {
  PhoneField,
  defaultPhoneCountry,
  refinePhone,
} from '@components/phone';
import { isFeatureEnabled } from '@config/feature-flags.config';
import { getLandingAttribution } from '@utils/landing-attribution.utils';
import {
  HEARD_FROM_OTHER_MAX,
  heardFromPayload,
  shuffledHeardFromOptions,
} from '@utils/acquisition-channel.utils';

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

/**
 * The 409s that mean "this email already has an account" — answered with
 * the way to sign in. Any OTHER conflict is not about the email and must
 * not say it is.
 */
const EMAIL_EXISTS_ERROR_KEYS: readonly string[] = [
  AUTH_ERROR_KEYS.emailAlreadyRegistered,
  AUTH_ERROR_KEYS.alreadyLearnerHere,
];

/** Mirrors the backend's `name` and `email` rules (`register.dto.ts`). */
const NAME_MIN = 2;
export const NAME_MAX = 100;
const EMAIL_MAX = 254;
/** The name counter appears once the limit is close. */
const NAME_COUNTER_FROM = 80;

/** Field labels, for the error summary. */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'auth:register.name',
  email: 'auth:register.email',
  phoneNumber: 'auth:register.phone',
  phoneCountry: 'auth:register.phone',
  password: 'auth:register.password',
  confirmPassword: 'auth:register.confirmPassword',
  acceptTerms: 'auth:register.termsLabel',
  organizationName: 'auth:register.organization.nameLabel',
  planId: 'auth:register.plan.title',
  heardFromOther: 'auth:register.heardFrom.otherLabel',
};

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
      // Each rule in the order a person meets it: empty → too short → too
      // long → format. The first one that fails is the one shown.
      name: z
        .string()
        .trim()
        .min(1, 'auth:register.errors.nameRequired')
        .min(NAME_MIN, 'auth:register.errors.nameTooShort')
        .max(NAME_MAX, 'auth:register.errors.nameTooLong'),
      email: z
        .string()
        .trim()
        .min(1, 'auth:register.errors.emailRequired')
        .max(EMAIL_MAX, 'auth:register.errors.emailTooLong')
        .email('auth:register.errors.invalidEmail'),
      password: z
        .string()
        .min(1, 'auth:register.errors.passwordRequired')
        .min(8, 'auth:register.errors.passwordTooShort'),
      confirmPassword: z
        .string()
        .min(1, 'auth:register.errors.confirmPasswordRequired'),
      acceptTerms: z.boolean().refine((val) => val === true, {
        message: 'auth:register.errors.termsRequired',
      }),
      organizationName: z.string().optional(),
      planId: z.string().optional(),
      // Phone number (docs/USER_PHONE.md) — required on this page for both
      // the management and the academy-learner sign-up. The API accepts a
      // registration without one (older pages, Google sign-up); this page
      // always sends both fields and the server re-validates them.
      phoneCountry: z.string(),
      phoneNumber: z.string(),
      // G1 — optional, never required (organization sign-up only).
      heardFrom: z.string().optional(),
      heardFromOther: z
        .string()
        .max(HEARD_FROM_OTHER_MAX, 'auth:register.heardFrom.otherTooLong')
        .optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'auth:register.errors.passwordMismatch',
      path: ['confirmPassword'],
    })
    .superRefine((data, context) =>
      refinePhone(data, context, { required: true })
    )
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
  readonly onSuccess?: (
    result: RegistrationResult,
    credentials: { readonly email: string; readonly password: string }
  ) => void;
  /**
   * Smart academy signup — on an academy website, called instead of showing
   * an error when the submitted email turns out to belong to an existing
   * Atlas account whose password was not the one typed here, so the page
   * can offer "enter your Atlas password to continue". The answer comes
   * from this (rate-limited) sign-up itself, never from a lookup.
   */
  readonly onExistingAccount?: (email: string, name: string) => void;
  /** Pre-fills name and email, e.g. after "Change email" on the join step. */
  readonly defaultName?: string;
  readonly defaultEmail?: string;
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
  /**
   * Atlas sign-up — receives the organization name, the chosen plan and the
   * plan the visitor arrived for whenever they change, so "Continue with
   * Google" can carry them to the Google create step.
   */
  readonly onSignupDraftChange?: (draft: {
    readonly organizationName?: string;
    readonly planId?: string;
    readonly planKey?: string;
  }) => void;
}

export function RegistrationForm({
  academyId,
  onSuccess,
  onExistingAccount,
  defaultName,
  defaultEmail,
  inviteToken,
  legalLinks,
  onSignupDraftChange,
}: RegistrationFormProps = {}): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const registerAccount = useRegister();
  const failureText = useAuthFailureText();
  const fieldErrorText = useFieldErrorText();
  // Where focus goes after a server failure that no field can show.
  const failureRef = useRef<HTMLDivElement>(null);

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
      name: defaultName ?? '',
      email: defaultEmail ?? '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      organizationName: '',
      planId: undefined,
      phoneCountry: defaultPhoneCountry(),
      phoneNumber: '',
      heardFrom: '',
      heardFromOther: '',
    },
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    formState: { errors },
  } = form;
  const nameLength = (form.watch('name') ?? '').length;

  // Why the picker is showing a notice: the plan the visitor chose was
  // refused by the server and has been cleared.
  const [planNoticeKey, setPlanNoticeKey] = useState<string>();
  // The organization mode itself was switched off mid-form.
  const [optionsChanged, setOptionsChanged] = useState(false);
  // B0-IAM-08 — the owner's WhatsApp opt-in: UNTICKED unless ticked, and
  // offered only on the organization owner sign-up while the flag is on.
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const whatsappConsentOffered = isFeatureEnabled('ownerWhatsappConsent');
  // G1 — "How did you first hear about us?": the answers in a random order
  // (Other last), fixed for this visit so the list does not jump around.
  const [heardFromOrder] = useState(() => shuffledHeardFromOptions());
  const heardFromValue = form.watch('heardFrom');

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

  /*
    Atlas sign-up — keeps the page's "Continue with Google" up to date with
    what is typed and chosen here (plus the plan the visitor arrived for,
    whose storage hand-off is consumed above), so the Google create step
    can start from it instead of from nothing.
  */
  const organizationNameValue = form.watch('organizationName');
  const planIdValue = form.watch('planId');
  useEffect(() => {
    if (!isManagementSurface || !onSignupDraftChange) return;
    const organizationName = (organizationNameValue ?? '').trim();
    onSignupDraftChange({
      ...(organizationName ? { organizationName } : {}),
      ...(planIdValue ? { planId: planIdValue } : {}),
      ...(intendedPlanKey ? { planKey: intendedPlanKey } : {}),
    });
  }, [
    isManagementSurface,
    onSignupDraftChange,
    organizationNameValue,
    planIdValue,
    intendedPlanKey,
  ]);

  // Maps a validation (400) failure's per-field violations onto this
  // form — e.g. a stricter server-side password rule than this schema's
  // client-side one — instead of only the generic `ErrorState` below.
  useServerValidation(form, registerAccount.error);
  // W4 — a taken organization name (management signup) is shown on its own
  // input, like `emailNotAcceptable`. A learner name is answered here only
  // for an EXISTING account that proved its password (academy join); a new
  // account is never refused for its name (security review finding 2) — the
  // profile asks it for a different one once signed in and verified.
  const nameConflict = useNameConflictError(form, registerAccount.error);

  const failure = registerAccount.error;
  const failureKey = failure?.messageKey;
  const isEmailNotAcceptable =
    failureKey === AUTH_ERROR_KEYS.emailNotAcceptable;
  // B1 (V03) — "this phone number is already in use" (409) belongs on the
  // phone field. Placed here as well as by `useServerValidation`, because a
  // 409's violations may not reach the client.
  const isPhoneTaken = failureKey === PHONE_TAKEN_ERROR_KEY;
  const isEmailExists =
    failure?.kind === 'conflict' &&
    !!failureKey &&
    EMAIL_EXISTS_ERROR_KEYS.includes(failureKey);
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
  }, [isEmailNotAcceptable, failure, setError]);
  useEffect(() => {
    if (!isPhoneTaken) return;
    setError('phoneNumber', {
      type: 'server',
      // `PhoneField` shows a server message as it is: finished text.
      message: t('validation:phoneTaken'),
    });
  }, [isPhoneTaken, failure, setError, t]);

  // A failure with field violations is shown on those fields.
  const hasFieldViolations =
    isFieldViolationError(failure) &&
    !!failure?.violations &&
    failure.violations.length > 0;
  const failureOnField =
    isEmailNotAcceptable ||
    isPhoneTaken ||
    !!nameConflict ||
    hasFieldViolations;

  /*
    B1 (V24) — after a server failure, focus goes where the answer is: the
    field it is about, or the message above the form. (Two or more field
    errors raise the error summary, which then takes focus itself.)
  */
  useEffect(() => {
    if (!failure) return;
    if (isPhoneTaken) {
      document.getElementById('phoneNumber')?.focus();
      return;
    }
    if (isEmailNotAcceptable) {
      setFocus('email');
      return;
    }
    if (failureOnField) {
      const first = failure.violations?.[0]?.field;
      if (first && first in form.getValues()) {
        if (first === 'phoneNumber' || first === 'phoneCountry') {
          document.getElementById('phoneNumber')?.focus();
        } else {
          setFocus(first as keyof RegistrationFormData);
        }
      }
      return;
    }
    failureRef.current?.focus();
    // Once per failure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failure]);

  const isLoading = registerAccount.isPending;

  /**
   * B0-IAM-08 / B0-ANL-04 / G1 — only on the ORGANIZATION OWNER sign-up
   * (never a learner's): the WhatsApp opt-in when ticked, the in-memory
   * landing attribution (both flag-gated), and the voluntary "How did you
   * first hear about us?" answer whenever one was given.
   */
  const organizationLeadFields = (
    isOrganizationSignup: boolean,
    data: RegistrationFormData
  ) => {
    if (!isOrganizationSignup || academyId) return {};
    const attribution = getLandingAttribution();
    return {
      ...(whatsappConsentOffered && whatsappConsent
        ? { whatsappConsent: true }
        : {}),
      ...(attribution ? { attribution } : {}),
      ...heardFromPayload(data.heardFrom, data.heardFromOther),
    };
  };

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
        // As typed, with the chosen country; the server normalises.
        phoneNumber: data.phoneNumber,
        phoneCountry: data.phoneCountry,
        ...(organizationName ? { organizationName } : {}),
        ...(planId ? { planId } : {}),
        ...organizationLeadFields(Boolean(organizationName), data),
      },
      {
        onSuccess: (result) => {
          // Launch Stabilization A4 — an academy sign-up with an email that
          // already had an Atlas account added this academy to that account
          // (its own password proven); nothing new was created.
          const existing = result.account === 'existing';
          toast({
            title: t(
              existing
                ? 'auth:register.success.existingAccountTitle'
                : 'auth:register.success.title'
            ),
            description: t(
              existing
                ? 'auth:register.success.existingAccountDescription'
                : 'auth:register.success.description'
            ),
          });
          if (onSuccess) {
            onSuccess(result, { email: data.email, password: data.password });
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
          if (
            !isManagementSurface &&
            onExistingAccount &&
            key === AUTH_ERROR_KEYS.emailAlreadyRegistered
          ) {
            onExistingAccount(data.email.trim(), data.name);
            return;
          }
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
    // `noValidate`: the app's messages, in the page's language — never the
    // browser's English bubble covering them (B1, V19).
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* B1 (V24) — two or more problems, or one no field can show. */}
      <FormErrorSummary form={form} fieldLabels={FIELD_LABELS} />
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
        <div ref={failureRef} tabIndex={-1} className="outline-none">
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
        </div>
      ) : failure && !failureOnField && !isStaleOptionsFailure ? (
        isEmailExists ||
        (failure.kind === 'conflict' && !isManagementSurface) ? (
          // "This email already has an account": the way on is to sign in,
          // so that is offered right here — not a "try again" that cannot
          // succeed, and not "this item was changed elsewhere".
          <div
            ref={failureRef}
            tabIndex={-1}
            className="space-y-2 outline-none"
            data-testid="register-email-exists"
          >
            <ErrorState
              kind="conflict"
              titleKey="auth:register.errors.emailTakenTitle"
              descriptionKey={
                // Launch Stabilization A4 — on an academy website an existing
                // account CAN join this academy; the refusal means either
                // it already has, or the password was not that account's.
                isManagementSurface
                  ? 'auth:register.errors.emailTaken'
                  : failureKey === AUTH_ERROR_KEYS.alreadyLearnerHere
                    ? 'auth:register.errors.alreadyLearnerHere'
                    : 'auth:register.errors.existingAccountAcademy'
              }
            />
            {/* Not on an academy website, whose sign-in lives elsewhere. */}
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
          // Everything else: ONE message with the real reason (or the copy
          // for its kind), focused. The button below is the retry.
          <div ref={failureRef} tabIndex={-1} className="outline-none">
            <AuthFormAlert
              message={failureText(failure)}
              focusKey={failure}
              autoFocus={false}
              requestId={
                failure.kind === 'server' ? failure.requestId : undefined
              }
            />
          </div>
        )
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className={REQUIRED_LABEL_CLASS}>
            {t('auth:register.name')}
          </Label>
          {/* No hard `maxLength`: a pasted long name is not cut silently.
              The counter shows the limit as it nears, the rule says it. */}
          <Input
            id="name"
            type="text"
            placeholder={t('auth:register.namePlaceholder')}
            autoComplete="name"
            disabled={isLoading}
            {...register('name')}
            aria-required
            aria-invalid={!!errors.name}
            aria-describedby={
              [
                errors.name ? 'name-error' : null,
                nameLength >= NAME_COUNTER_FROM ? 'name-counter' : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
          {errors.name ? (
            <p id="name-error" className="text-sm text-destructive">
              {fieldErrorText(errors.name, 'auth:register.errors.nameRequired')}
            </p>
          ) : null}
          {nameLength >= NAME_COUNTER_FROM ? (
            <p
              id="name-counter"
              data-testid="name-counter"
              className={cn(
                'text-end text-xs tabular-nums',
                nameLength > NAME_MAX
                  ? 'font-medium text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {t('auth:register.nameCounter', {
                count: nameLength,
                max: NAME_MAX,
              })}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={REQUIRED_LABEL_CLASS}>
            {t('auth:register.email')}
          </Label>
          <Input
            id="email"
            type="email"
            // An address is always left-to-right, in Arabic too (the same
            // rule as the other email and URL inputs, e.g. AcademyJoinForm).
            dir="ltr"
            placeholder={t('auth:register.emailPlaceholder')}
            autoComplete="email"
            // Back from "Change email" on the join step: straight to the field.
            autoFocus={!!defaultEmail}
            disabled={isLoading}
            {...register('email')}
            aria-required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              {fieldErrorText(
                errors.email,
                'auth:register.errors.emailRequired'
              )}
            </p>
          ) : null}
        </div>

        {/* `PhoneField` takes a plain label: its required mark is put on
            from here (see `REQUIRED_PHONE_LABEL_CLASS`). */}
        <div className={REQUIRED_PHONE_LABEL_CLASS}>
          <PhoneField
            control={control}
            errors={errors}
            id="phoneNumber"
            label={t('auth:register.phone')}
            hint={t('auth:register.phoneHint')}
            disabled={isLoading}
          />
        </div>

        {mode.organization && whatsappConsentOffered ? (
          // DRAFT wording pending counsel (`SIGNUP_WHATSAPP_CONSENT_WORDING_VERSION`,
          // utils/owner-whatsapp-consent.ts).
          <div
            className="flex items-start gap-3"
            data-testid="owner-whatsapp-consent"
          >
            <Checkbox
              id="whatsappConsent"
              checked={whatsappConsent}
              onCheckedChange={(checked) =>
                setWhatsappConsent(checked === true)
              }
              disabled={isLoading}
            />
            <Label
              htmlFor="whatsappConsent"
              className="cursor-pointer text-sm font-normal leading-relaxed"
            >
              {t('auth:register.whatsappConsent')}
            </Label>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="password" className={REQUIRED_LABEL_CLASS}>
            {t('auth:register.password')}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth:register.passwordPlaceholder')}
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
                'auth:register.errors.passwordTooShort'
              )}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t('auth:register.passwordHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className={REQUIRED_LABEL_CLASS}>
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
              <Label
                htmlFor="organizationName"
                className={REQUIRED_LABEL_CLASS}
              >
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
                aria-required
                aria-invalid={!!errors.organizationName}
              />
              {errors.organizationName ? (
                <p className="text-sm text-destructive">
                  {fieldErrorText(
                    errors.organizationName,
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
                required
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

            {/* G1 — the optional last question; never required. */}
            <div className="space-y-2" data-testid="signup-heard-from">
              <Label htmlFor="heardFrom">
                {t('auth:register.heardFrom.label')}
                <span className="ms-1 font-normal text-muted-foreground">
                  ({t('auth:register.heardFrom.optional')})
                </span>
              </Label>
              <select
                id="heardFrom"
                aria-describedby="heardFrom-hint"
                disabled={isLoading}
                {...register('heardFrom')}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="">
                  {t('auth:register.heardFrom.placeholder')}
                </option>
                {heardFromOrder.map((option) => (
                  <option key={option} value={option}>
                    {t(`auth:register.heardFrom.options.${option}`)}
                  </option>
                ))}
              </select>
              <p id="heardFrom-hint" className="text-xs text-muted-foreground">
                {t('auth:register.heardFrom.hint')}
              </p>
            </div>
            {heardFromValue === 'other' ? (
              <div className="space-y-2">
                <Label htmlFor="heardFromOther">
                  {t('auth:register.heardFrom.otherLabel')}
                  <span className="ms-1 font-normal text-muted-foreground">
                    ({t('auth:register.heardFrom.optional')})
                  </span>
                </Label>
                <Input
                  id="heardFromOther"
                  type="text"
                  dir="auto"
                  autoComplete="off"
                  maxLength={HEARD_FROM_OTHER_MAX}
                  disabled={isLoading}
                  aria-describedby="heardFromOther-hint"
                  aria-invalid={!!errors.heardFromOther}
                  {...register('heardFromOther')}
                />
                {errors.heardFromOther ? (
                  <p className="text-sm text-destructive">
                    {fieldErrorText(
                      errors.heardFromOther,
                      'auth:register.heardFrom.otherTooLong',
                      { max: HEARD_FROM_OTHER_MAX }
                    )}
                  </p>
                ) : null}
                <p
                  id="heardFromOther-hint"
                  className="text-xs text-muted-foreground"
                >
                  {t('auth:register.heardFrom.otherHint')}
                </p>
              </div>
            ) : null}
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
            {fieldErrorText(
              errors.acceptTerms,
              'auth:register.errors.termsRequired'
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
