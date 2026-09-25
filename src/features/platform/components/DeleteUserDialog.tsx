/**
 * "Delete this user" — the Platform Owner's irreversible administrative act.
 *
 * WHAT IT PROMISES IS WHAT HAPPENS. Atlas cannot hard-delete a person:
 * `users` carries ten `ON DELETE RESTRICT` edges and 65 tenant tables have
 * no DELETE policy at all. So the impact list is built from the server's
 * own deletion plan and labels each group with the treatment it actually
 * receives — destroyed, de-identified, retained, tombstoned or revoked —
 * rather than flattening all five into the word "delete". An operator
 * about to remove someone's account is entitled to know that the financial
 * records survive.
 *
 * DESTRUCTIVE EMPHASIS IS RESERVED, NOT SPRAYED. Only genuinely destroyed
 * groups are styled destructive. Painting the retained financial and audit
 * rows red would tell the operator those are being erased, which is both
 * false and the opposite of reassuring. Every row also carries an icon and
 * a treatment word, so the distinction survives greyscale, colour-blindness
 * and a screenshot.
 *
 * THE CONFIRMATION IS THE TARGET'S EMAIL, TYPED. A directory makes it easy
 * to open the wrong person, and clicking through a generic "are you sure"
 * would not catch that. The expected value differs per user, which is the
 * property that makes it a real check — the same reasoning
 * `DeleteAcademyCard` uses for an academy's name.
 *
 * THE OUTCOME DOES NOT VANISH. Success is rendered in place rather than as
 * a toast. A four-second notification is the wrong way to report an
 * irreversible act, and a worse way to report one that failed partway.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Landmark,
  Loader2,
  ShieldOff,
  Trash2,
  UserX,
} from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@utils';
import { useDeleteUserAsPlatformOwner, useUserDeletionPlan } from '../hooks';
import type { DeletionPlanLine, DeletionTreatment } from '@types';

export interface DeleteUserDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly userId: string;
  /** Typed to confirm, and shown so the operator can see who this is. */
  readonly userEmail: string;
  readonly userName: string;
}

/**
 * How each treatment is presented. `destructive` is deliberately only on
 * the two treatments that genuinely remove something.
 */
const TREATMENT_PRESENTATION: Record<
  DeletionTreatment,
  { readonly Icon: typeof Trash2; readonly className: string }
> = {
  destroy: { Icon: Trash2, className: 'text-destructive' },
  deidentify: { Icon: UserX, className: 'text-destructive' },
  revoke: { Icon: ShieldOff, className: 'text-amber-600 dark:text-amber-500' },
  tombstone: { Icon: Archive, className: 'text-muted-foreground' },
  retain: { Icon: Landmark, className: 'text-muted-foreground' },
};

/** Groups that go first, because they are what the operator is deciding about. */
const TREATMENT_ORDER: readonly DeletionTreatment[] = [
  'destroy',
  'deidentify',
  'revoke',
  'tombstone',
  'retain',
];

export function DeleteUserDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
}: DeleteUserDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const [confirmation, setConfirmation] = useState('');

  const plan = useUserDeletionPlan(userId, { enabled: open });
  const deleteUser = useDeleteUserAsPlatformOwner();

  // Reopening must never inherit a typed confirmation or a previous
  // outcome — otherwise the second deletion is one click, which is exactly
  // what the typed confirmation exists to prevent.
  useEffect(() => {
    if (!open) {
      setConfirmation('');
      deleteUser.reset();
    }
    // `deleteUser` is a stable mutation object; depending on it would reset
    // on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isConfirmed =
    confirmation.trim().toLowerCase() === userEmail.trim().toLowerCase();

  const orderedLines = useMemo(() => {
    const lines = plan.data?.lines ?? [];
    return [...lines].sort(
      (a, b) =>
        TREATMENT_ORDER.indexOf(a.treatment) -
        TREATMENT_ORDER.indexOf(b.treatment)
    );
  }, [plan.data?.lines]);

  const succeeded = deleteUser.isSuccess;
  const isDeleting = deleteUser.isPending;
  const cannotDelete = plan.data ? !plan.data.deletable : false;

  const handleDelete = (): void => {
    if (!isConfirmed || isDeleting) return;
    deleteUser.mutate({ userId, payload: {} });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Never dismissible mid-flight: closing would suggest the deletion
        // was cancelled when it is still running on the server.
        if (!isDeleting) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {succeeded ? (
              <CheckCircle2 className="size-5 text-primary" aria-hidden />
            ) : (
              <AlertTriangle className="size-5 text-destructive" aria-hidden />
            )}
            {t(
              succeeded
                ? 'platform:users.delete.doneTitle'
                : 'platform:users.delete.confirmTitle'
            )}
          </DialogTitle>
          <DialogDescription>
            {succeeded
              ? t('platform:users.delete.doneDescription', { name: userName })
              : t('platform:users.delete.confirmDescription', {
                  name: userName,
                  email: userEmail,
                })}
          </DialogDescription>
        </DialogHeader>

        {succeeded ? (
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              {t('platform:users.delete.academiesArchived', {
                count: deleteUser.data?.academiesArchived ?? 0,
              })}
            </p>
            <p className="text-muted-foreground">
              {t('platform:users.delete.retainedNotice')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {plan.isLoading ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : plan.error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {t('platform:users.delete.planFailed')}
              </p>
            ) : plan.data?.alreadyDeleted ? (
              <p
                role="status"
                className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground"
              >
                {t('platform:users.delete.alreadyDeleted')}
              </p>
            ) : cannotDelete ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {t('platform:users.delete.refused')}
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('platform:users.delete.impactTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      `platform:users.delete.role.${plan.data?.subjectRole ?? 'member'}`
                    )}
                  </p>
                </div>

                <ul className="space-y-2 rounded-md border border-border p-3">
                  {orderedLines.map((line) => (
                    <ImpactRow key={line.key} line={line} />
                  ))}
                </ul>

                <div className="space-y-2">
                  <Label htmlFor="delete-user-confirm">
                    {t('platform:users.delete.confirmLabel', {
                      email: userEmail,
                    })}
                  </Label>
                  <Input
                    id="delete-user-confirm"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                    disabled={isDeleting}
                    // NO placeholder. It used to be the email itself, which
                    // rendered greyed inside the empty field and read as
                    // already-filled — so the disabled button looked broken
                    // rather than waiting (production, 26 Sep 2026). The
                    // label and help text already say what to type.
                    aria-describedby="delete-user-confirm-help"
                  />
                  <p
                    id="delete-user-confirm-help"
                    className="text-xs text-muted-foreground"
                  >
                    {t('platform:users.delete.confirmHelp')}
                  </p>
                </div>

                {deleteUser.error ? (
                  <p
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                  >
                    {apiErrorMessage(t, i18n, deleteUser.error)}
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {t(succeeded ? 'common:actions.close' : 'common:actions.cancel')}
          </Button>
          {succeeded ? null : (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={
                !isConfirmed ||
                isDeleting ||
                plan.isLoading ||
                cannotDelete ||
                Boolean(plan.data?.alreadyDeleted)
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('platform:users.delete.deleting')}
                </>
              ) : (
                t('platform:users.delete.confirmAction')
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One group of records, with the treatment it actually receives. */
function ImpactRow({ line }: { readonly line: DeletionPlanLine }): JSX.Element {
  const { t } = useTranslation();
  const { Icon, className } = TREATMENT_PRESENTATION[line.treatment];

  return (
    <li className="flex items-start gap-2.5 text-sm">
      <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="text-foreground">
          {t(`platform:users.delete.plan.${line.key}`, { count: line.count })}
        </span>
        {line.examples && line.examples.length > 0 ? (
          <span className="block text-xs text-muted-foreground">
            {line.examples.join(', ')}
          </span>
        ) : null}
      </span>
      {/* The treatment in words, so colour is never the only signal. */}
      <span className={`shrink-0 text-xs font-medium ${className}`}>
        {t(`platform:users.delete.treatment.${line.treatment}`)}
      </span>
    </li>
  );
}
