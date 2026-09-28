/**
 * Public Website Sign Up Page (Phase 1, Extended Scope, Decision 11,
 * dependencies C and D).
 *
 * A real, reachable Sign Up page inside the Academy's own public website
 * — a separate page from Sign In (per the confirmed product requirement),
 * rendered inside the exact same branded shell every other public page
 * uses. Reuses `RegistrationForm` (the exact same component/mutation the
 * internal app's own registration page uses) with its new `academyId`
 * prop (dependency D) — this is the one real, concrete thing that makes
 * "Academy A's website registers into Academy A" true: the resolved
 * Academy's own id, from the SAME trusted `resolveHostname` lookup every
 * other public page already relies on, never a client-guessed or
 * Organization-level value.
 *
 * Phase 6 — see `PublicWebsiteSignInPage`'s identically-shaped doc
 * comment for `locale`/`usePublicWebsiteDocumentDirection`, and for why
 * `RegistrationForm` is wrapped in `WebsiteBrandBridge`.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  WebsiteChrome,
  WebsiteBrandBridge,
  resolvePagePath,
  resolveLocalizedText,
  usePublicWebsiteDocumentDirection,
} from '@features/website';
import {
  AcademyJoinForm,
  EmailOtpChallengeForm,
  RegistrationForm,
  TwoFactorChallengeForm,
  GoogleSignInOption,
} from '@features/auth';
import type { AcademyJoinCredentials } from '@features/auth';
import { useAuth, useSignIn, useSignOut } from '@hooks';
import { isEmailOtpChallenge } from '@types';
import type { SignInChallenge } from '@types';
import { authenticationService } from '@services/identity';
import { usePublicWebsiteData } from '../hooks/usePublicWebsiteData';
import { useHoldGuestRedirect } from './PublicWebsiteGuestRoute';
import { PublicWebsiteStatus } from './PublicWebsiteStatus';
import {
  usePublicWebsiteLinkRenderer,
  usePublicWebsiteHrefBuilder,
} from '../utils/public-website-link-renderer';
import { DEV_OVERRIDE_PARAM } from '../utils/hostname-resolution.utils';
import type { PublicWebsiteLocale } from '@types';
import { LEARNER_ROUTES } from '@app/routes/route-paths';

/**
 * Where the sign-up is. `join` is the smart academy signup's "you already
 * have an Atlas account" step; `continuing`/`challenge` sign that account in
 * here; `done` is every terminal state (a new account, an existing account
 * that joined but could not be signed in here, or a join awaiting approval).
 */
type SignUpStep =
  | {
      readonly kind: 'register';
      readonly name?: string;
      readonly email?: string;
    }
  | {
      readonly kind: 'join';
      readonly reason: 'existing_email' | 'proactive';
      readonly email?: string;
      readonly name?: string;
    }
  | { readonly kind: 'continuing'; readonly name?: string }
  | {
      readonly kind: 'challenge';
      readonly challenge: SignInChallenge;
      readonly name?: string;
    }
  | {
      /** Signed in; the account already uses Atlas with these academies. */
      readonly kind: 'welcome';
      readonly otherAcademies: readonly string[];
    }
  | {
      readonly kind: 'done';
      readonly result: 'new' | 'joined' | 'pending';
      readonly name?: string;
    };

export interface PublicWebsiteSignUpPageProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsiteSignUpPage({
  lookupKey,
  locale,
}: PublicWebsiteSignUpPageProps): JSX.Element {
  const { t } = useTranslation();
  usePublicWebsiteDocumentDirection(locale);
  const data = usePublicWebsiteData(lookupKey);
  const [step, setStep] = useState<SignUpStep>({ kind: 'register' });
  const {
    signIn,
    completeTwoFactor,
    completeEmailOtp,
    isLoading: signInLoading,
    error: signInError,
    clearError,
  } = useSignIn();
  const navigate = useNavigate();
  const holdGuestRedirect = useHoldGuestRedirect();
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  const buildHref = usePublicWebsiteHrefBuilder(locale);
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { signOut } = useSignOut();

  // Smart academy signup — once the continuation below has signed the
  // existing account in (password, then this academy's emailed code), the
  // learner lands on their dashboard, exactly like the sign-in page.
  //
  // Just before that, the page asks which OTHER academies the account
  // already belongs to — answered only now, to a session that proved both
  // the password and this academy's emailed code — so the person sees why
  // they "already had an account". No answer, or none: straight to /my.
  const continuing = step.kind === 'continuing' || step.kind === 'challenge';
  useEffect(() => {
    if (!continuing || session.status !== 'authenticated') return;
    let cancelled = false;
    const goToLearning = () =>
      navigate(buildHref(LEARNER_ROUTES.root), { replace: true });
    authenticationService
      .academyJoinSummary()
      .then((summary) => {
        if (cancelled) return;
        if (summary.otherAcademies.length > 0) {
          setStep({ kind: 'welcome', otherAcademies: summary.otherAcademies });
        } else {
          goToLearning();
        }
      })
      .catch(() => {
        if (!cancelled) goToLearning();
      });
    return () => {
      cancelled = true;
    };
  }, [continuing, session.status, navigate, buildHref]);
  const authState =
    session.status === 'authenticated' && session.user
      ? {
          name: session.user.name,
          onSignOut: () => void signOut(),
          // Bare path — see `PublicWebsiteSignInPage`'s identical note.
          myLearningHref: LEARNER_ROUTES.root,
        }
      : undefined;

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  const { academy, configuration, pages } = data;

  /*
    Smart academy signup — the account exists and now belongs to this
    academy, and the visitor has just typed its password: sign it in here
    rather than sending them to sign in again. The academy's own A6 rules
    apply (an emailed code on a new device). If that cannot complete, the
    join itself stands and the visitor is told to sign in.
  */
  const continueAsExistingAccount = async (
    credentials: AcademyJoinCredentials,
    name?: string
  ) => {
    // This page, not the guest-route guard, decides where a session it
    // signs in goes next (the "you already use Atlas with …" step).
    holdGuestRedirect(true);
    setStep({ kind: 'continuing', name });
    clearError();
    try {
      const challenge = await signIn({
        email: credentials.email,
        password: credentials.password,
        rememberMe: false,
        surface: 'academy',
        academyId: academy.academyId,
      });
      if (challenge) setStep({ kind: 'challenge', challenge, name });
    } catch {
      setStep({ kind: 'done', result: 'joined', name });
    }
  };

  const onExistingAccountJoined = (
    status: 'active' | 'pending' | undefined,
    credentials: AcademyJoinCredentials,
    name?: string
  ) => {
    if (status === 'pending') {
      setStep({ kind: 'done', result: 'pending', name });
      return;
    }
    void continueAsExistingAccount(credentials, name);
  };

  const handleVerify = async (input: {
    token?: string;
    recoveryCode?: string;
  }) => {
    if (step.kind !== 'challenge') return;
    clearError();
    try {
      await completeTwoFactor({
        challengeId: step.challenge.challengeId,
        ...input,
        surface: 'academy',
        academyId: academy.academyId,
      });
    } catch {
      // Surfaced via `signInError`.
    }
  };

  const handleVerifyEmailOtp = async (input: {
    code: string;
    rememberDevice: boolean;
  }) => {
    if (step.kind !== 'challenge' || !isEmailOtpChallenge(step.challenge)) {
      return;
    }
    clearError();
    try {
      await completeEmailOtp({
        challengeId: step.challenge.challengeId,
        code: input.code,
        rememberDevice: input.rememberDevice,
        surface: 'academy',
        academyId: academy.academyId,
      });
    } catch {
      // Surfaced via `signInError`.
    }
  };

  const abandonChallenge = () => {
    clearError();
    setStep({
      kind: 'done',
      result: 'joined',
      name: step.kind === 'challenge' ? step.name : undefined,
    });
  };

  const primaryLinkClass =
    'font-medium text-[var(--website-primary-solid)] hover:underline';

  const onNavigate = (pageId: string) => {
    const target = pages.find((candidate) => candidate.id === pageId);
    const path = target ? resolvePagePath(target) : undefined;
    if (path) window.location.assign(buildHref(path));
  };

  const title =
    resolveLocalizedText(
      configuration.header.authPages?.signUp?.title,
      locale
    ) ||
    t('publicWebsite:auth.signUp.title', { academyName: academy.academyName });
  const subtitle =
    resolveLocalizedText(
      configuration.header.authPages?.signUp?.subtitle,
      locale
    ) ||
    t('publicWebsite:auth.signUp.subtitle', {
      academyName: academy.academyName,
    });

  return (
    <WebsiteChrome
      academyName={academy.academyName}
      academyLogo={academy.academyLogo}
      configuration={configuration}
      pages={pages}
      onNavigate={onNavigate}
      linkRenderer={linkRenderer}
      locale={locale}
      onLocaleChange={(target) => {
        const base = `${target === 'en' ? '' : '/ar'}/sign-up`;
        const devSlug = searchParams.get(DEV_OVERRIDE_PARAM);
        window.location.assign(
          devSlug
            ? `${base}?${DEV_OVERRIDE_PARAM}=${encodeURIComponent(devSlug)}`
            : base
        );
      }}
      authState={authState}
    >
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {step.kind === 'welcome' ? (
          <div
            role="status"
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center"
          >
            <CheckCircle2
              className="size-8 text-[var(--website-primary-solid)]"
              aria-hidden
            />
            <p className="font-medium text-foreground">
              {t('publicWebsite:auth.signUp.welcomeTitle', {
                academyName: academy.academyName,
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('publicWebsite:auth.signUp.welcomeOtherAcademies', {
                academies: step.otherAcademies.join(
                  t('publicWebsite:auth.signUp.listSeparator')
                ),
                academyName: academy.academyName,
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('publicWebsite:auth.signUp.welcomeSeparate')}
            </p>
            {linkRenderer({
              href: LEARNER_ROUTES.root,
              external: false,
              className:
                'mt-2 inline-flex items-center justify-center rounded-md bg-[var(--website-primary-solid)] px-4 py-2 text-sm font-medium text-white hover:opacity-90',
              children: t('publicWebsite:auth.signUp.goToLearning'),
            })}
          </div>
        ) : step.kind === 'done' ? (
          <div
            role="status"
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center"
          >
            <CheckCircle2
              className="size-8 text-[var(--website-primary-solid)]"
              aria-hidden
            />
            {step.name ? (
              <p className="font-medium text-foreground">
                {t('publicWebsite:auth.signUp.welcomeBack', {
                  name: step.name,
                })}
              </p>
            ) : null}
            <p className="text-foreground">
              {t(
                step.result === 'new'
                  ? 'publicWebsite:auth.signUp.success'
                  : step.result === 'pending'
                    ? 'publicWebsite:auth.signUp.joinedPending'
                    : 'publicWebsite:auth.signUp.successExistingAccount',
                { academyName: academy.academyName }
              )}
            </p>
            {step.result === 'pending'
              ? null
              : linkRenderer({
                  href: '/sign-in',
                  external: false,
                  className: primaryLinkClass,
                  children: t('publicWebsite:auth.signUp.goToSignIn'),
                })}
          </div>
        ) : step.kind === 'continuing' ? (
          <div
            role="status"
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center"
          >
            <Loader2
              className="size-6 animate-spin text-[var(--website-primary-solid)]"
              aria-hidden
            />
            {step.name ? (
              <p className="font-medium text-foreground">
                {t('publicWebsite:auth.signUp.welcomeBack', {
                  name: step.name,
                })}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {t('publicWebsite:auth.signUp.continuing', {
                academyName: academy.academyName,
              })}
            </p>
          </div>
        ) : step.kind === 'challenge' ? (
          <div className="space-y-4">
            <p
              role="status"
              className="text-center text-sm text-muted-foreground"
            >
              {step.name
                ? `${t('publicWebsite:auth.signUp.welcomeBack', {
                    name: step.name,
                  })} `
                : ''}
              {t('publicWebsite:auth.signUp.joinedVerify', {
                academyName: academy.academyName,
              })}
            </p>
            <WebsiteBrandBridge>
              {isEmailOtpChallenge(step.challenge) ? (
                <EmailOtpChallengeForm
                  challenge={step.challenge}
                  onSubmit={handleVerifyEmailOtp}
                  onResend={() =>
                    authenticationService.resendEmailOtp(
                      step.challenge.challengeId
                    )
                  }
                  onCancel={abandonChallenge}
                  isLoading={signInLoading}
                  error={signInError}
                  forgotPasswordHref={buildHref('/forgot-password')}
                />
              ) : (
                <TwoFactorChallengeForm
                  onSubmit={(input) => void handleVerify(input)}
                  onCancel={abandonChallenge}
                  isLoading={signInLoading}
                  error={signInError}
                />
              )}
            </WebsiteBrandBridge>
          </div>
        ) : step.kind === 'join' ? (
          <WebsiteBrandBridge>
            <AcademyJoinForm
              academyId={academy.academyId}
              inviteToken={searchParams.get('invite') ?? undefined}
              academyName={academy.academyName}
              defaultEmail={step.email}
              reason={step.reason}
              onJoined={(result, credentials) =>
                onExistingAccountJoined(
                  result?.status,
                  credentials,
                  result?.name
                )
              }
              onBack={() => setStep({ kind: 'register' })}
              onChangeEmail={(email) =>
                setStep({ kind: 'register', email, name: step.name })
              }
              forgotPasswordHref="/forgot-password"
              renderLink={({ href, className, children }) =>
                linkRenderer({ href, external: false, className, children })
              }
            />
          </WebsiteBrandBridge>
        ) : (
          <>
            <WebsiteBrandBridge>
              {/* Google Identity — the same academy, the same invitation
                  code (`?invite=`), the same registration policy: the
                  backend applies it at the return page's create step (or
                  joins an existing Google-linked account directly). */}
              <GoogleSignInOption
                intent="sign_up"
                surface="academy"
                academyId={academy.academyId}
                inviteToken={searchParams.get('invite') ?? undefined}
                locale={locale}
                next={buildHref(LEARNER_ROUTES.root)}
                className="mb-6"
              />
              {/* P64 Phase 1 (D3) — the invitation token from the link the
                  academy sent (`/sign-up?invite=…`). Passed through as-is:
                  the BACKEND decides whether this academy's registration
                  policy needs one and whether it is still valid, and
                  `RegistrationForm` renders the invite-required /
                  invalid-invite answers it gives. */}
              <RegistrationForm
                academyId={academy.academyId}
                inviteToken={searchParams.get('invite') ?? undefined}
                onSuccess={(result, credentials) => {
                  // Launch Stabilization A4 — the email already had an
                  // Atlas account and its password was typed here, so this
                  // academy was added to it: continue exactly like a join.
                  if (result.account === 'existing') {
                    onExistingAccountJoined(result.status, credentials);
                  } else {
                    setStep({ kind: 'done', result: 'new' });
                  }
                }}
                onExistingAccount={(email, name) =>
                  setStep({
                    kind: 'join',
                    reason: 'existing_email',
                    email,
                    name,
                  })
                }
                defaultName={step.kind === 'register' ? step.name : undefined}
                defaultEmail={step.kind === 'register' ? step.email : undefined}
              />
            </WebsiteBrandBridge>
            <div className="mt-6 space-y-2 text-center text-sm">
              <p>
                <span className="text-muted-foreground">
                  {t('publicWebsite:auth.signUp.hasAtlasAccount')}{' '}
                </span>
                <button
                  type="button"
                  className={primaryLinkClass}
                  onClick={() => setStep({ kind: 'join', reason: 'proactive' })}
                >
                  {t('publicWebsite:auth.signUp.joinWithAtlasAccount')}
                </button>
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t('publicWebsite:auth.signUp.hasAccount')}{' '}
                </span>
                {linkRenderer({
                  href: '/sign-in',
                  external: false,
                  className: primaryLinkClass,
                  children: t('publicWebsite:auth.signUp.signIn'),
                })}
              </p>
            </div>
          </>
        )}
      </div>
    </WebsiteChrome>
  );
}
