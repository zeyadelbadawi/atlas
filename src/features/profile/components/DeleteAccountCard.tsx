/**
 * "Delete my account" — the irreversible one.
 *
 * THE CONFIRMATION IS TYPED, NOT CLICKED. A single "Are you sure?" button
 * is dismissed reflexively; typing the account's own email address makes
 * the action deliberate and makes it almost impossible to perform on the
 * wrong account. The expected value is the signed-in address, so it is
 * different for every user and cannot be muscle-memoried.
 *
 * WHAT THIS ACTUALLY DOES is spelled out before the button, not after:
 * the account is anonymised and cannot be recovered, every session ends,
 * and any academies owned by the user go offline. Telling someone the
 * consequences only in a success toast is too late to be a choice.
 *
 * THE FEEDBACK IS OPTIONAL AND SAYS SO. Deletion never depends on
 * answering it — a required exit survey is a dark pattern, and under both
 * the Egyptian and Saudi PDPLs an erasure request cannot be conditioned
 * on unrelated disclosure.
 *
 * THE EMAILED CODE IS THE AUTHORISATION (authentication audit, Decision
 * 1). Typing the address proves intent; it does not prove the person at the
 * keyboard owns the account — a stolen session could type it. So the
 * dialog's first step only ASKS: the server emails a 6-digit code to the
 * account's verified address, bound to this account and this session, and
 * only that code, entered in step two, deletes anything.
 *
 * THE PLATFORM OWNER DOES NOT SEE THIS. The backend refuses that account
 * with a 403 regardless; hiding the card just avoids offering an action
 * that cannot succeed. The server is the enforcement, not this check.
 */
import { useEffect, useState } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@hooks';
import { useToast } from '@app/providers';
import { currentUserService } from '@services/identity';
import type { AccountDeletionChallenge } from '@services/identity/current-user.service';
import type { ApiError } from '@api';
import type { CurrentUser } from '@types';
import { PUBLIC_ROUTES } from '@app/routes/route-paths';

/**
 * Mirrors `ACCOUNT_DELETION_REASONS` in the backend exactly. A value not
 * in this list is rejected by the DTO, so the two must not drift.
 */
const DELETION_REASONS = [
  'no_longer_needed',
  'too_expensive',
  'missing_features',
  'too_difficult',
  'switching_provider',
  'privacy_concerns',
  'other',
] as const;

export interface DeleteAccountCardProps {
  readonly user: CurrentUser;
}

export function DeleteAccountCard({
  user,
}: DeleteAccountCardProps): JSX.Element | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { notifyError } = useToast();

  const [isOpen, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [isDeleting, setDeleting] = useState(false);
  // Step two: the code emailed for THIS request.
  const [challenge, setChallenge] = useState<AccountDeletionChallenge | null>(
    null
  );
  const [code, setCode] = useState('');
  const [isRequesting, setRequesting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Ticks only while a resend is still cooling down.
  const resendAt = challenge ? Date.parse(challenge.resendAvailableAt) : 0;
  useEffect(() => {
    if (!challenge || now >= resendAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge, now, resendAt]);
  const resendInSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  // See the header: the server refuses this account anyway.
  if (user.roles.includes('platform_owner')) return null;

  // Compared case-insensitively and trimmed — the check exists to prove
  // intent, not to test typing accuracy.
  const isConfirmed =
    confirmation.trim().toLowerCase() === user.email.trim().toLowerCase();

  /** `errors.account.x` → the `errors` namespace's `account.x`. */
  const toErrorKey = (error: unknown): string => {
    const key = (error as Partial<ApiError> | null)?.messageKey;
    return typeof key === 'string' && key.startsWith('errors.')
      ? `errors:${key.slice('errors.'.length)}`
      : 'profile:deleteAccount.failed';
  };

  async function handleRequestCode(): Promise<void> {
    if (!isConfirmed || isRequesting) return;
    setRequesting(true);
    setErrorKey(null);
    try {
      const issued = await currentUserService.requestAccountDeletion();
      setChallenge(issued);
      setCode('');
      setNow(Date.now());
    } catch (error) {
      setErrorKey(toErrorKey(error));
    } finally {
      setRequesting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!challenge || code.length !== 6 || isDeleting) return;
    setDeleting(true);
    setErrorKey(null);
    try {
      await currentUserService.deleteAccount({
        challengeId: challenge.challengeId,
        code,
        reason: reason || undefined,
        feedback: feedback.trim() || undefined,
      });

      // Every session is already dead server-side. `signOut` clears
      // the local tokens so the app does not keep retrying with
      // credentials that can only ever 401 from here on.
      await signOut();
      navigate(PUBLIC_ROUTES.home, { replace: true });
    } catch (error) {
      // Kept open on failure: closing would suggest it worked. A wrong code
      // can be retried; an expired or spent one needs a new code.
      setDeleting(false);
      setCode('');
      const key = toErrorKey(error);
      setErrorKey(key);
      if (key === 'profile:deleteAccount.failed') notifyError(t(key));
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
          {t('profile:deleteAccount.title')}
        </CardTitle>
        <CardDescription>
          {t('profile:deleteAccount.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
          <li>{t('profile:deleteAccount.consequenceIrreversible')}</li>
          <li>{t('profile:deleteAccount.consequenceSessions')}</li>
          <li>{t('profile:deleteAccount.consequenceAcademies')}</li>
          <li>{t('profile:deleteAccount.consequenceRecords')}</li>
        </ul>

        <Button
          variant="destructive"
          data-testid="open-delete-account"
          onClick={() => {
            setConfirmation('');
            setReason('');
            setFeedback('');
            setChallenge(null);
            setCode('');
            setErrorKey(null);
            setOpen(true);
          }}
        >
          {t('profile:deleteAccount.action')}
        </Button>
      </CardContent>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          // Cannot be dismissed mid-request — the account may
          // already be gone.
          if (!isDeleting && !isRequesting) setOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('profile:deleteAccount.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('profile:deleteAccount.confirmDescription')}
            </DialogDescription>
          </DialogHeader>

          {errorKey ? (
            <p
              role="alert"
              data-testid="delete-account-error"
              className="text-sm text-destructive"
            >
              {t(errorKey)}
            </p>
          ) : null}

          {challenge ? (
            <div className="space-y-4" data-testid="delete-account-code-step">
              <div className="space-y-1">
                <p className="font-medium">
                  {t('profile:deleteAccount.codeTitle')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('profile:deleteAccount.codeDescription', {
                    email: challenge.maskedEmail,
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-account-code">
                  {t('profile:deleteAccount.codeLabel')}
                </Label>
                <InputOTP
                  id="delete-account-code"
                  data-testid="delete-account-code"
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={isDeleting}
                  containerClassName="justify-center"
                >
                  {/* Digits read left-to-right in Arabic too. */}
                  <InputOTPGroup dir="ltr">
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-12 w-10 text-lg font-medium sm:w-12"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                variant="link"
                className="h-auto p-0"
                data-testid="delete-account-resend"
                disabled={resendInSeconds > 0 || isRequesting || isDeleting}
                onClick={() => void handleRequestCode()}
              >
                {resendInSeconds > 0
                  ? t('profile:deleteAccount.resendIn', {
                      seconds: resendInSeconds,
                    })
                  : t('profile:deleteAccount.resend')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delete-account-reason">
                  {t('profile:deleteAccount.reasonLabel')}
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="delete-account-reason">
                    <SelectValue
                      placeholder={t('profile:deleteAccount.reasonPlaceholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {DELETION_REASONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`profile:deleteAccount.reasons.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-account-feedback">
                  {t('profile:deleteAccount.feedbackLabel')}
                </Label>
                <Textarea
                  id="delete-account-feedback"
                  value={feedback}
                  maxLength={2000}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder={t('profile:deleteAccount.feedbackPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-account-confirmation">
                  {t('profile:deleteAccount.typeEmailLabel', {
                    email: user.email,
                  })}
                </Label>
                <Input
                  id="delete-account-confirmation"
                  data-testid="delete-account-confirmation"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={isDeleting || isRequesting}
              onClick={() => {
                if (challenge) {
                  setChallenge(null);
                  setCode('');
                  setErrorKey(null);
                } else {
                  setOpen(false);
                }
              }}
            >
              {challenge
                ? t('profile:deleteAccount.back')
                : t('common:actions.cancel')}
            </Button>
            {challenge ? (
              <Button
                variant="destructive"
                data-testid="confirm-delete-account"
                disabled={code.length !== 6 || isDeleting}
                onClick={() => void handleDelete()}
              >
                {isDeleting
                  ? t('profile:deleteAccount.deleting')
                  : t('profile:deleteAccount.confirmAction')}
              </Button>
            ) : (
              <Button
                variant="destructive"
                data-testid="request-delete-code"
                // Disabled until the email matches: the irreversible
                // action must not be reachable by reflex.
                disabled={!isConfirmed || isRequesting}
                onClick={() => void handleRequestCode()}
              >
                {isRequesting
                  ? t('profile:deleteAccount.sendingCode')
                  : t('profile:deleteAccount.sendCode')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
