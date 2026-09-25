/**
 * Mark Payout Paid — confirmation dialog.
 *
 * Marking a payout paid records that money has left Atlas for the academy.
 * It cannot be reverted from any screen, so it is always an explicit,
 * confirmed step naming the amount — never a one-click row action. The
 * optional reference (bank transfer id, etc.) is sent as
 * `providerReference` (`MarkAcademyPayoutPaidDto`, max 255).
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@app/providers';
import { apiErrorMessage } from '@utils';
import { formatMoney } from '@features/billing';
import type { AcademyPayout } from '@types';
import { useMarkAcademyPayoutPaid } from '../hooks';
import {
  markPayoutPaidSchema,
  type MarkPayoutPaidFormData,
} from '../schemas/platform-commerce.schemas';

export interface MarkPayoutPaidDialogProps {
  /** The payout being confirmed; `null` closes the dialog. */
  readonly payout: AcademyPayout | null;
  readonly onClose: () => void;
}

export function MarkPayoutPaidDialog({
  payout,
  onClose,
}: MarkPayoutPaidDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const markPaid = useMarkAcademyPayoutPaid();

  const form = useForm<MarkPayoutPaidFormData>({
    resolver: zodResolver(markPayoutPaidSchema),
    defaultValues: { providerReference: '' },
  });

  const { reset: resetForm } = form;
  const { reset: resetMutation } = markPaid;
  useEffect(() => {
    if (!payout) return;
    resetForm();
    resetMutation();
  }, [payout, resetForm, resetMutation]);

  const onSubmit = (data: MarkPayoutPaidFormData) => {
    if (!payout) return;
    const reference = data.providerReference.trim();
    markPaid.mutate(
      {
        payoutId: payout.id,
        payload: { providerReference: reference || undefined },
      },
      {
        onSuccess: () => {
          notifySuccess('platformCommerce:payouts.markPaid.success');
          onClose();
        },
      }
    );
  };

  const amount = payout ? formatMoney(payout.money, i18n.language) : '';

  return (
    <Dialog
      open={payout !== null}
      onOpenChange={(next) => {
        if (!next && !markPaid.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('platformCommerce:payouts.markPaid.title')}
          </DialogTitle>
          <DialogDescription>
            {t('platformCommerce:payouts.markPaid.description', { amount })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="mark-payout-paid-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="providerReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('platformCommerce:payouts.markPaid.reference')}
                  </FormLabel>
                  <FormControl>
                    <Input dir="auto" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {markPaid.error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  {apiErrorMessage(t, i18n, markPaid.error)}
                </AlertDescription>
              </Alert>
            ) : null}
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={markPaid.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="mark-payout-paid-form"
            disabled={markPaid.isPending}
          >
            {markPaid.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('platformCommerce:payouts.markPaid.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
