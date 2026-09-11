/**
 * "Delete this academy" — owner-only, and irreversible in the ways that
 * matter to a customer.
 *
 * WHAT IT HONESTLY CLAIMS. Atlas's academy delete is archival: the row
 * survives because courses, enrolments, orders and revenue entries
 * reference it, and destroying it would take the customer's own financial
 * history with it. So the copy promises what actually happens — the
 * academy disappears from the product, its public website goes offline
 * immediately, and the plan's academy allowance is freed — rather than
 * claiming an erasure that does not occur.
 *
 * THE CONFIRMATION IS THE ACADEMY'S NAME, typed. An owner with several
 * academies must not be able to delete the wrong one by clicking through,
 * and the expected value differs per academy.
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
import { toast } from '@/hooks/use-toast';
import { usePermissions } from '@hooks';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useDeleteAcademy } from '../hooks';
import type { Academy } from '@types';

/** Mirrors `ACADEMY_ARCHIVE_REASONS` in the backend DTO exactly. */
const ARCHIVE_REASONS = [
  'created_by_mistake',
  'no_longer_needed',
  'replacing_with_another',
  'testing_only',
  'too_expensive',
  'switching_provider',
  'other',
] as const;

export interface DeleteAcademyCardProps {
  readonly academy: Academy;
}

export function DeleteAcademyCard({
  academy,
}: DeleteAcademyCardProps): JSX.Element | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const deleteAcademy = useDeleteAcademy();

  const [isOpen, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');

  // Deleting an academy is an owner-level action, the same boundary
  // provisioning one is. The backend enforces it independently — this
  // only avoids showing an action that would be refused.
  if (!hasPermission('academy.provisioning.create')) return null;

  const isConfirmed =
    confirmation.trim().toLowerCase() === academy.name.trim().toLowerCase();

  async function handleDelete(): Promise<void> {
    if (!isConfirmed || deleteAcademy.isPending) return;
    try {
      await deleteAcademy.mutateAsync({
        id: academy.id,
        reason: reason || undefined,
        feedback: feedback.trim() || undefined,
      });
      setOpen(false);
      toast({
        title: t('academy:delete.deletedTitle'),
        description: t('academy:delete.deletedDescription', {
          name: academy.name,
        }),
      });
      navigate(DASHBOARD_ROUTES.academy, { replace: true });
    } catch (error) {
      // Left open: closing the dialog would imply it worked.
      toast({
        variant: 'destructive',
        title: t('academy:delete.failedTitle'),
        description:
          error instanceof Error
            ? error.message
            : t('academy:delete.failedTitle'),
      });
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
          {t('academy:delete.title')}
        </CardTitle>
        <CardDescription>{t('academy:delete.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
          <li>{t('academy:delete.consequenceWebsite')}</li>
          <li>{t('academy:delete.consequenceAccess')}</li>
          <li>{t('academy:delete.consequenceAllowance')}</li>
          <li>{t('academy:delete.consequenceRecords')}</li>
        </ul>

        <Button
          variant="destructive"
          data-testid="open-delete-academy"
          onClick={() => {
            setConfirmation('');
            setReason('');
            setFeedback('');
            setOpen(true);
          }}
        >
          {t('academy:delete.action')}
        </Button>
      </CardContent>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!deleteAcademy.isPending) setOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('academy:delete.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('academy:delete.confirmDescription', { name: academy.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-academy-reason">
                {t('academy:delete.reasonLabel')}
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="delete-academy-reason">
                  <SelectValue
                    placeholder={t('academy:delete.reasonPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {ARCHIVE_REASONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`academy:delete.reasons.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-academy-feedback">
                {t('academy:delete.feedbackLabel')}
              </Label>
              <Textarea
                id="delete-academy-feedback"
                value={feedback}
                maxLength={2000}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder={t('academy:delete.feedbackPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-academy-confirmation">
                {t('academy:delete.typeNameLabel', { name: academy.name })}
              </Label>
              <Input
                id="delete-academy-confirmation"
                data-testid="delete-academy-confirmation"
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteAcademy.isPending}
              onClick={() => setOpen(false)}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-delete-academy"
              disabled={!isConfirmed || deleteAcademy.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteAcademy.isPending
                ? t('academy:delete.deleting')
                : t('academy:delete.confirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
