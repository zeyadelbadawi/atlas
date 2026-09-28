/**
 * Google Identity — everything after Google, on the origin the flow
 * started from (`/auth/google/return#h=…`).
 *
 * The handoff is read from the fragment once and removed from the address
 * bar, then presented to `/auth/google/complete` exactly once (the binder
 * cookie proves this is the browser that started). The answer decides
 * what is shown:
 *  - a session → the page the person was headed to;
 *  - a 2FA / email-code challenge → the same challenge forms as the
 *    password sign-in (Google never bypasses them);
 *  - a step (link / create / activate) → `GoogleStepPanel`;
 *  - `linked` (Account settings) → back to settings, with a confirmation;
 *  - anything else → why, and the way back.
 *
 * The surface's own page supplies the chrome; this component is the flow.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth, useSignIn, useToast } from '@hooks';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';
import {
  isEmailOtpChallenge,
  isGoogleLinked,
  isGoogleStep,
  isTwoFactorChallenge,
} from '@types';
import type {
  GoogleSignInResult,
  GoogleStep,
  RefusedSignInAcademy,
  SignInChallenge,
  SignInSurface,
} from '@types';
import { TwoFactorChallengeForm } from '../components/TwoFactorChallengeForm';
import { EmailOtpChallengeForm } from '../components/EmailOtpChallengeForm';
import { StudentSignInRefusal } from '../components/StudentSignInRefusal';
import {
  AUTH_ERROR_KEYS,
  readRefusedAcademies,
} from '../utils/academy-surface.utils';
import { GoogleStepPanel } from './GoogleStepPanel';
import {
  clearGoogleFlowContext,
  readGoogleFlowContext,
  takeReturnFragment,
} from './google-flow.storage';
import type { GoogleFlowContext } from './google-flow.storage';
import { useGoogleErrorMessage } from './google-errors';

type FlowState =
  | { readonly kind: 'completing' }
  | { readonly kind: 'challenge'; readonly challenge: SignInChallenge }
  | { readonly kind: 'step'; readonly step: GoogleStep }
  | {
      readonly kind: 'refusedStudent';
      readonly academies: readonly RefusedSignInAcademy[];
    }
  | { readonly kind: 'signedIn' }
  | {
      readonly kind: 'failed';
      readonly error?: ApiError;
      readonly cancelled?: boolean;
    };

export interface GoogleReturnFlowProps {
  readonly surface: SignInSurface;
  /** Academy surface: the host's own academy (challenges are completed for it). */
  readonly academyId?: string;
  /** Where a new session goes when the starting page named nowhere. */
  readonly defaultNext: string;
  /** Where "back" goes when the starting page is unknown (another tab, storage off). */
  readonly defaultFrom: string;
  readonly forgotPasswordHref: string;
  readonly legalLinks?: { readonly terms: string; readonly privacy: string };
  /** e.g. `WebsiteBrandBridge` on an academy website. */
  readonly wrap?: (content: ReactNode) => ReactNode;
  /** Receives the flow context once read (the academy page takes its locale). */
  readonly onContext?: (context: GoogleFlowContext | null) => void;
}

export function GoogleReturnFlow({
  surface,
  academyId,
  defaultNext,
  defaultFrom,
  forgotPasswordHref,
  legalLinks,
  wrap = (content) => content,
  onContext,
}: GoogleReturnFlowProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, acceptSignInResult } = useAuth();
  const {
    completeTwoFactor,
    completeEmailOtp,
    isLoading,
    error: challengeError,
    clearError,
  } = useSignIn();
  const messageFor = useGoogleErrorMessage();
  const [state, setState] = useState<FlowState>({ kind: 'completing' });
  const contextRef = useRef<GoogleFlowContext | null>(null);
  // The handoff is single-use: read and presented exactly once, whatever
  // React does with effects (StrictMode runs them twice in development).
  const startedRef = useRef(false);

  const from = contextRef.current?.from ?? defaultFrom;
  const next = contextRef.current?.next ?? defaultNext;
  const inviteToken = contextRef.current?.inviteToken;

  /** A Google answer that may be a session or a challenge. */
  const adopt = (result: GoogleSignInResult) => {
    const challenge = acceptSignInResult(result);
    setState(
      challenge ? { kind: 'challenge', challenge } : { kind: 'signedIn' }
    );
  };

  const fail = (error: ApiError) => {
    // The one refusal with its own screen, exactly as on the password
    // sign-in: a learner is shown the academies they CAN sign in to.
    if (
      surface === 'management' &&
      error?.messageKey === AUTH_ERROR_KEYS.studentUseAcademySignIn
    ) {
      setState({
        kind: 'refusedStudent',
        academies: readRefusedAcademies(error),
      });
      return;
    }
    setState({ kind: 'failed', error });
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const fragment = takeReturnFragment();
    const context = readGoogleFlowContext();
    clearGoogleFlowContext();
    contextRef.current = context;
    onContext?.(context);

    if (!fragment.handoff) {
      setState({ kind: 'failed', cancelled: fragment.error === 'cancelled' });
      return;
    }
    authenticationService
      .googleComplete({
        handoff: fragment.handoff,
        ...(context?.inviteToken ? { inviteToken: context.inviteToken } : {}),
      })
      .then((result) => {
        if (isGoogleLinked(result)) {
          toast({
            title: t('auth:google.linked.title'),
            description: t('auth:google.linked.description', {
              email: result.email,
            }),
          });
          navigate(context?.from ?? defaultFrom, { replace: true });
          return;
        }
        if (isGoogleStep(result)) {
          setState({ kind: 'step', step: result });
          return;
        }
        adopt(result);
      })
      .catch((caught: ApiError) => fail(caught));
    // Runs once by design (see `startedRef`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This flow minted the session (directly or through a challenge): leave.
  useEffect(() => {
    if (session.status !== 'authenticated') return;
    if (state.kind !== 'signedIn') return;
    navigate(next, { replace: true });
  }, [session.status, state.kind, next, navigate]);

  const backToStart = () => navigate(from, { replace: true });

  if (state.kind === 'completing' || state.kind === 'signedIn') {
    return (
      <div
        className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
        data-testid="google-return-pending"
      >
        <Loader2 className="size-6 animate-spin" aria-hidden />
        {t('auth:google.return.completing')}
      </div>
    );
  }

  if (state.kind === 'refusedStudent') {
    return (
      <StudentSignInRefusal academies={state.academies} onBack={backToStart} />
    );
  }

  if (state.kind === 'failed') {
    return (
      <div className="space-y-4" data-testid="google-return-failed">
        <Alert variant={state.cancelled ? 'default' : 'destructive'}>
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>
            {t(
              state.cancelled
                ? 'auth:google.return.cancelledTitle'
                : 'auth:google.return.failedTitle'
            )}
          </AlertTitle>
          <AlertDescription>
            {state.cancelled
              ? t('auth:google.return.cancelledDescription')
              : messageFor(state.error)}
          </AlertDescription>
        </Alert>
        {wrap(
          <Button type="button" className="w-full" onClick={backToStart}>
            {t('auth:google.return.back')}
          </Button>
        )}
      </div>
    );
  }

  if (state.kind === 'step') {
    return (
      <>
        {wrap(
          <GoogleStepPanel
            step={state.step}
            surface={surface}
            inviteToken={inviteToken}
            signupDraft={contextRef.current?.signup}
            forgotPasswordHref={forgotPasswordHref}
            legalLinks={legalLinks}
            onResult={adopt}
            onFailure={fail}
            onCancel={backToStart}
          />
        )}
      </>
    );
  }

  const { challenge } = state;
  const scope = { surface, ...(academyId ? { academyId } : {}) };
  return (
    <>
      {wrap(
        isEmailOtpChallenge(challenge) ? (
          <EmailOtpChallengeForm
            challenge={challenge}
            onSubmit={(input) => {
              clearError();
              void completeEmailOtp({
                challengeId: challenge.challengeId,
                code: input.code,
                rememberDevice: input.rememberDevice,
                ...scope,
              })
                .then(() => setState({ kind: 'signedIn' }))
                .catch(() => undefined);
            }}
            onResend={() =>
              authenticationService.resendEmailOtp(challenge.challengeId)
            }
            onCancel={backToStart}
            isLoading={isLoading}
            error={challengeError}
            forgotPasswordHref={forgotPasswordHref}
          />
        ) : isTwoFactorChallenge(challenge) ? (
          <TwoFactorChallengeForm
            onSubmit={(input) => {
              clearError();
              void completeTwoFactor({
                challengeId: challenge.challengeId,
                ...input,
                ...scope,
              })
                .then(() => setState({ kind: 'signedIn' }))
                .catch(() => undefined);
            }}
            onCancel={backToStart}
            isLoading={isLoading}
            error={challengeError}
          />
        ) : null
      )}
    </>
  );
}
