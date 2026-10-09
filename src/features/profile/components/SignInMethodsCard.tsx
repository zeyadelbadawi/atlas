/**
 * Google Identity — Account settings → Sign-in methods.
 *
 * Shows how this account can sign in (password, Google) and lets the owner
 * connect or disconnect Google. Both changes re-prove the account with its
 * current password first: a session left open on a shared computer must
 * not be enough to attach somebody else's Google account, or to remove
 * the owner's. Disconnecting is refused while Google is the only way in
 * (no password yet) — the card says so instead of offering a dead button.
 *
 * Connecting leaves for Google and comes back through the return page,
 * which brings the person back here with a confirmation.
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { useToast } from '@app/providers';
import { formatDate } from '@/shared/utils/date.utils';
import {
  GoogleAuthButton,
  GoogleLogo,
  useGoogleAuthOptions,
  useGoogleErrorMessage,
  useGoogleStart,
} from '@features/auth';
import type { ApiError } from '@api';
import type { LanguageCode, SignInSurface } from '@types';
import { useSignInMethods, useUnlinkGoogle } from '../hooks';

export interface SignInMethodsScope {
  readonly surface: SignInSurface;
  /** Academy website: the host's own academy. */
  readonly academyId?: string;
  readonly locale?: 'en' | 'ar';
}

type Dialogue = 'connect' | 'disconnect' | null;

export function SignInMethodsCard({
  scope = { surface: 'management' },
}: {
  readonly scope?: SignInMethodsScope;
}): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { notifySuccess } = useToast();
  const methods = useSignInMethods();
  const { googleEnabled } = useGoogleAuthOptions({
    academyId: scope.academyId,
  });
  const unlink = useUnlinkGoogle();
  const googleStart = useGoogleStart();
  const messageFor = useGoogleErrorMessage();

  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [password, setPassword] = useState('');
  const [dialogueError, setDialogueError] = useState<ApiError | null>(null);

  const google = methods.data?.google ?? null;
  // Nothing to show: Google is off here and not connected (the password
  // card above already covers the password).
  if (methods.isSuccess && !google && !googleEnabled) return null;

  const close = () => {
    setDialogue(null);
    setPassword('');
    setDialogueError(null);
    googleStart.clearError();
  };

  const onConfirm = (event: FormEvent) => {
    event.preventDefault();
    if (password.length === 0) return;
    setDialogueError(null);
    if (dialogue === 'connect') {
      void googleStart.start({
        intent: 'link',
        surface: scope.surface,
        academyId: scope.academyId,
        locale: scope.locale,
        currentPassword: password,
      });
      return;
    }
    unlink.mutate(
      { currentPassword: password },
      {
        onSuccess: () => {
          close();
          notifySuccess('auth:google.settings.disconnected');
        },
        onError: (error) => setDialogueError(error),
      }
    );
  };

  const busy = unlink.isPending || googleStart.isStarting;
  const shownError = dialogueError ?? googleStart.error;

  return (
    <Card data-testid="sign-in-methods-card">
      <CardHeader>
        <CardTitle>{t('auth:google.settings.title')}</CardTitle>
        <CardDescription>
          {t('auth:google.settings.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {methods.isPending ? (
          <SectionLoader />
        ) : methods.isError ? (
          <ErrorState
            kind={methods.error.kind}
            onRetry={() => void methods.refetch()}
            requestId={methods.error.requestId}
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            <li className="flex flex-wrap items-center gap-3 p-4">
              <KeyRound
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {t('auth:google.settings.password')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    methods.data.password
                      ? 'auth:google.settings.passwordSet'
                      : 'auth:google.settings.passwordNotSet'
                  )}
                </p>
              </div>
            </li>
            <li
              className="flex flex-wrap items-center gap-3 p-4"
              data-testid="google-method-row"
            >
              <GoogleLogo className="size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                  Google
                  {google ? (
                    <Badge variant="secondary">
                      {t('auth:google.settings.connected')}
                    </Badge>
                  ) : null}
                </p>
                <p className="break-all text-sm text-muted-foreground">
                  {google ? (
                    <>
                      <span dir="ltr" data-ltr-content>
                        {google.email}
                      </span>
                      {' · '}
                      {t('auth:google.settings.connectedOn', {
                        date: formatDate(google.linkedAt, language),
                      })}
                    </>
                  ) : (
                    t('auth:google.settings.notConnected')
                  )}
                </p>
              </div>
              {google ? (
                methods.data.password ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogue('disconnect')}
                  >
                    {t('auth:google.settings.disconnect')}
                  </Button>
                ) : null
              ) : methods.data.password ? (
                <GoogleAuthButton
                  label="connect"
                  className="w-full sm:w-auto"
                  onClick={() => setDialogue('connect')}
                />
              ) : null}
            </li>
          </ul>
        )}
        {google && methods.data && !methods.data.password ? (
          <Alert>
            <Info className="size-4" aria-hidden />
            <AlertDescription>
              {t('auth:google.settings.setPasswordFirst')}
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <Dialog
        open={dialogue !== null}
        onOpenChange={(open) => (open ? undefined : close())}
      >
        <DialogContent>
          <form onSubmit={onConfirm} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {t(
                  dialogue === 'connect'
                    ? 'auth:google.settings.connectTitle'
                    : 'auth:google.settings.disconnectTitle'
                )}
              </DialogTitle>
              <DialogDescription>
                {t(
                  dialogue === 'connect'
                    ? 'auth:google.settings.connectDescription'
                    : 'auth:google.settings.disconnectDescription'
                )}
              </DialogDescription>
            </DialogHeader>
            {shownError ? (
              <Alert variant="destructive">
                <AlertDescription>{messageFor(shownError)}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="sign-in-methods-password">
                {t('auth:google.settings.currentPassword')}
              </Label>
              <Input
                id="sign-in-methods-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={close}
                disabled={busy}
              >
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="submit"
                variant={dialogue === 'disconnect' ? 'destructive' : 'default'}
                disabled={busy || password.length === 0}
                aria-busy={busy}
              >
                {busy
                  ? t('common:actions.loading')
                  : t(
                      dialogue === 'connect'
                        ? 'auth:google.settings.continueToGoogle'
                        : 'auth:google.settings.disconnect'
                    )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
