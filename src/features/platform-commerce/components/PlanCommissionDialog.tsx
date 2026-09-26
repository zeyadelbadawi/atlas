/**
 * Edit a plan's commission override.
 *
 * The dialog IS the confirmation step: it names the plan, the current rate
 * and what the change affects before anything is sent. The backend DTO
 * takes an integer 0..10000 bp and offers no "remove override" — so neither
 * does this dialog (said plainly in the copy, not hidden).
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@app/providers';
import { apiErrorMessage } from '@utils';
import { useUpdatePlanCommission } from '../hooks';
import {
  commissionRateSchema,
  type CommissionRateFormData,
} from '../schemas/platform-commerce.schemas';
import {
  basisPointsToPercent,
  percentToBasisPoints,
} from '../utils/commission.utils';

export interface PlanCommissionTarget {
  readonly planKey: string;
  readonly planName: string;
  readonly currentBasisPoints: number | null;
}

export interface PlanCommissionDialogProps {
  readonly target: PlanCommissionTarget | null;
  readonly onClose: () => void;
}

export function PlanCommissionDialog({
  target,
  onClose,
}: PlanCommissionDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const updatePlan = useUpdatePlanCommission();

  const form = useForm<CommissionRateFormData>({
    resolver: zodResolver(commissionRateSchema),
    defaultValues: { percent: '' },
  });

  const { reset: resetForm } = form;
  const { reset: resetMutation } = updatePlan;
  useEffect(() => {
    if (!target) return;
    resetForm({
      percent:
        target.currentBasisPoints === null
          ? ''
          : String(basisPointsToPercent(target.currentBasisPoints)),
    });
    resetMutation();
  }, [target, resetForm, resetMutation]);

  const onSubmit = (data: CommissionRateFormData) => {
    if (!target) return;
    updatePlan.mutate(
      {
        planKey: target.planKey,
        payload: {
          commissionBasisPoints: percentToBasisPoints(Number(data.percent)),
        },
      },
      {
        onSuccess: () => {
          notifySuccess('platformCommerce:commission.plans.saved', undefined, {
            plan: target.planName,
          });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(next) => {
        if (!next && !updatePlan.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('platformCommerce:commission.plans.dialogTitle', {
              plan: target?.planName ?? '',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('platformCommerce:commission.plans.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="plan-commission-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('platformCommerce:commission.percentLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" autoComplete="off" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('platformCommerce:commission.percentHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {updatePlan.error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  {apiErrorMessage(t, i18n, updatePlan.error)}
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
            disabled={updatePlan.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="plan-commission-form"
            disabled={updatePlan.isPending}
          >
            {updatePlan.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('platformCommerce:commission.plans.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
