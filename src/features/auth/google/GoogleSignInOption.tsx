/**
 * Google Identity — "Continue with Google" for a signed-out page: the
 * button, the "or" divider under it, and why a start failed. Renders
 * nothing while this host does not offer Google, so every page can mount
 * it unconditionally.
 */
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { SignInSurface } from '@types';
import { AuthMethodDivider, GoogleAuthButton } from './GoogleAuthButton';
import { readLastAuthMethod } from './google-flow.storage';
import type { GoogleSignupDraft } from './google-flow.storage';
import { useGoogleAuthOptions } from './useGoogleAuthOptions';
import { useGoogleErrorMessage } from './google-errors';
import { useGoogleStart } from './useGoogleStart';

export interface GoogleSignInOptionProps {
  /**
   * `setup`: the account-setup page — Google becomes the invited account's
   * sign-in instead of a password; `setupToken` (the emailed one) proves
   * the mailbox exactly as it does for the password form.
   */
  readonly intent: 'sign_in' | 'sign_up' | 'setup';
  readonly setupToken?: string;
  readonly surface: SignInSurface;
  readonly academyId?: string;
  /** Where a new session goes (the page's own post-sign-in destination). */
  readonly next?: string;
  readonly inviteToken?: string;
  readonly locale?: 'en' | 'ar';
  /** Wraps the button, e.g. `WebsiteBrandBridge` on an academy website. */
  readonly className?: string;
  /**
   * Atlas sign-up: what the form already holds (organization name, plan),
   * read at the click so the Google create step starts from it.
   */
  readonly getSignupDraft?: () => GoogleSignupDraft | undefined;
}

export function GoogleSignInOption({
  intent,
  surface,
  academyId,
  next,
  inviteToken,
  locale,
  setupToken,
  className,
  getSignupDraft,
}: GoogleSignInOptionProps): JSX.Element | null {
  const { googleEnabled } = useGoogleAuthOptions({ academyId });
  const { start, isStarting, error } = useGoogleStart();
  const messageFor = useGoogleErrorMessage();
  if (!googleEnabled) return null;

  return (
    <div className={className} data-testid="google-sign-in-option">
      <div className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{messageFor(error)}</AlertDescription>
          </Alert>
        ) : null}
        <GoogleAuthButton
          onClick={() =>
            void start({
              intent,
              surface,
              academyId,
              next,
              inviteToken,
              locale,
              setupToken,
              signup: getSignupDraft?.(),
            })
          }
          isLoading={isStarting}
          lastUsed={readLastAuthMethod() === 'google'}
        />
        <AuthMethodDivider />
      </div>
    </div>
  );
}
