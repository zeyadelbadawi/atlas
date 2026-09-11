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
 * THE PLATFORM OWNER DOES NOT SEE THIS. The backend refuses that account
 * with a 403 regardless; hiding the card just avoids offering an action
 * that cannot succeed. The server is the enforcement, not this check.
 */
import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@hooks';
import { useToast } from '@app/providers';
import { currentUserService } from '@services/identity';
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

  // See the header: the server refuses this account anyway.
  if (user.roles.includes('platform_owner')) return null;

  // Compared case-insensitively and trimmed — the check exists to prove
  // intent, not to test typing accuracy.
  const isConfirmed =
    confirmation.trim().toLowerCase() === user.email.trim().toLowerCase();

  async function handleDelete(): Promise<void> {
    if (!isConfirmed || isDeleting) return;
    setDeleting(true);
    try {
      await currentUserService.deleteAccount({
        reason: reason || undefined,
        feedback: feedback.trim() || undefined,
      });

      // Every session is already dead server-side. `signOut` clears
      // the local tokens so the app does not keep retrying with
      // credentials that can only ever 401 from here on.
      await signOut();
      navigate(PUBLIC_ROUTES.home, { replace: true });
    } catch (error) {
      // Kept open on failure: closing would suggest it worked.
      setDeleting(false);
      notifyError(
        error instanceof Error
          ? error.message
          : t('profile:deleteAccount.failed')
      );
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
          if (!isDeleting) setOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('profile:deleteAccount.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('profile:deleteAccount.confirmDescription')}
            </DialogDescription>
          </DialogHeader>

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

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setOpen(false)}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-delete-account"
              // Disabled until the email matches: the
              // irreversible action must not be reachable by
              // reflex.
              disabled={!isConfirmed || isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting
                ? t('profile:deleteAccount.deleting')
                : t('profile:deleteAccount.confirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
