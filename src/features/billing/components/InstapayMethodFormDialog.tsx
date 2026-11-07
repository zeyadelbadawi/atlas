/**
 * InstaPay method form — Platform Owner (2 Oct 2026).
 *
 * One dialog for "Add InstaPay" (`method` absent) and "Edit" (`method`
 * given), mirroring `BankTransferMethodFormDialog`. Nothing is pre-filled
 * with a sample. Editing a seeded placeholder starts its address blank —
 * `PLACEHOLDER-NOT-AN-ADDRESS` is not one — and saving replaces the
 * placeholder (the server clears the flag).
 *
 * Client validation mirrors `InstapayInstructionsDto`
 * (`instapayMethodSchema`: `name@instapay`, case-insensitive; the server
 * stores it lowercase). An edit sends `instapayInstructions` — never
 * `instructions`, which the server reserves for bank transfer.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type {
  InstapayInstructionsPayload,
  PlatformPaymentMethod,
} from '@types';
import {
  useCreateInstapayMethod,
  useUpdatePlatformPaymentMethod,
} from '../hooks';
import {
  instapayMethodSchema,
  type InstapayMethodFormData,
} from '../schemas/billing.schemas';
import {
  ManualMethodTextsFields,
  MethodLongTextField,
  MethodTextField,
  PlaceholderDetailsNotice,
  toTextsFormValues,
  toTextsPayload,
  ManualMethodSaveFailure,
  useGuardedDialogClose,
  useManualMethodServerValidation,
  MethodNameFields,
  toNameFormValues,
  toNamePayload,
} from './ManualMethodFormFields';

export interface InstapayMethodFormDialogProps {
  readonly open: boolean;
  /** The method being edited; absent when adding a new InstaPay address. */
  readonly method?: PlatformPaymentMethod;
  readonly onOpenChange: (open: boolean) => void;
}

function toFormValues(
  method: PlatformPaymentMethod | undefined
): InstapayMethodFormData {
  const saved =
    method?.manualInstructions?.type === 'manual_instapay'
      ? method.manualInstructions
      : undefined;
  return {
    ...toNameFormValues(method),
    instructions: {
      instapayAddress: saved?.placeholder ? '' : (saved?.instapayAddress ?? ''),
      ...toTextsFormValues(saved),
    },
  };
}

function toInstructionsPayload(
  values: InstapayMethodFormData['instructions']
): InstapayInstructionsPayload {
  return {
    instapayAddress: values.instapayAddress,
    ...toTextsPayload(values),
  };
}

export function InstapayMethodFormDialog({
  open,
  method,
  onOpenChange,
}: InstapayMethodFormDialogProps): JSX.Element {
  const { t } = useTranslation();
  const isEdit = method !== undefined;

  const createMethod = useCreateInstapayMethod();
  const updateMethod = useUpdatePlatformPaymentMethod();
  const activeMutation = isEdit ? updateMethod : createMethod;

  const form = useForm<InstapayMethodFormData>({
    resolver: zodResolver(instapayMethodSchema),
    defaultValues: toFormValues(method),
  });

  useManualMethodServerValidation(
    form,
    activeMutation.error,
    isEdit ? 'instapayInstructions' : 'instructions'
  );

  const { reset } = form;
  useEffect(() => {
    if (open) reset(toFormValues(method));
  }, [open, method, reset]);

  // A previous attempt's failure is not this one's: clear it on open.
  const resetMutation = activeMutation.reset;
  useEffect(() => {
    if (open) resetMutation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const requestOpenChange = useGuardedDialogClose(
    form.formState.isDirty,
    onOpenChange
  );

  const onSubmit = async (values: InstapayMethodFormData) => {
    const details = toInstructionsPayload(values.instructions);
    try {
      if (method) {
        await updateMethod.mutateAsync({
          methodId: method.id,
          payload: {
            // Sent even when empty: clearing a description or an Arabic
            // text is an edit.
            ...toNamePayload(values, true),
            instapayInstructions: details,
          },
        });
        toast({ title: t('payments:instapayMethods.updateSuccess') });
      } else {
        await createMethod.mutateAsync({
          ...toNamePayload(values, false),
          instructions: details,
        });
        toast({ title: t('payments:instapayMethods.createSuccess') });
      }
      onOpenChange(false);
    } catch {
      // B8 (UX audit) V06/V15 — the failure is shown ONCE, in the dialog
      // (a field violation on its field, anything else in one alert);
      // the dialog stays open with everything typed.
    }
  };

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              isEdit
                ? 'payments:instapayMethods.editTitle'
                : 'payments:instapayMethods.createTitle'
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              isEdit
                ? 'payments:instapayMethods.editDescription'
                : 'payments:instapayMethods.createDescription'
            )}
          </DialogDescription>
        </DialogHeader>

        {method?.manualInstructions?.placeholder ? (
          <PlaceholderDetailsNotice testId="instapay-method-placeholder-notice" />
        ) : null}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
            data-testid="instapay-method-form"
          >
            <MethodNameFields
              control={form.control}
              section="instapayMethods"
              testIdPrefix="instapay-method"
            />
            <MethodTextField
              control={form.control}
              name="instructions.instapayAddress"
              labelKey="payments:instapayMethods.fields.instapayAddress"
              helpKey="payments:instapayMethods.fields.instapayAddressHelp"
              dir="ltr"
              data-ltr-content
              inputMode="email"
              testId="instapay-method-address"
            />

            <ManualMethodTextsFields
              control={form.control}
              section="instapayMethods"
              testIdPrefix="instapay-method"
            />

            {!isEdit ? (
              <p className="text-xs text-muted-foreground">
                {t('payments:instapayMethods.createdDisabledNote')}
              </p>
            ) : null}

            <ManualMethodSaveFailure
              form={form}
              error={activeMutation.error ?? null}
              titleKey={
                isEdit
                  ? 'payments:instapayMethods.updateError'
                  : 'payments:instapayMethods.createError'
              }
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={activeMutation.isPending}
                onClick={() => requestOpenChange(false)}
              >
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="submit"
                data-testid="instapay-method-save"
                disabled={activeMutation.isPending}
              >
                {activeMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('common:actions.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
