/**
 * Platform Trial Policy Page.
 *
 * Atlas Platform Owner-only. Lets the Platform Owner configure whether new
 * Tenants get a free trial and, if so, its duration — the concrete
 * requirement behind "7 days must not be a hardcoded business rule"
 * (see `Reports/ARCHITECTURE.md`, Prompt 6). Access is gated by
 * `requiredRoles: ['platform_owner']` on the route/nav entry, the same
 * pattern already used for Settings/Billing/Analytics.
 *
 * B8 (UX audit) V14/V23 — the length is a whole number from 1 to 365 (the
 * server's range), checked here with the range named; a refused field is
 * said on the field only, anything else in ONE inline alert (the hook
 * marks its errors inline).
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
import {
  RequiredMark,
  SaveFailedAlert,
  hasViolationOn,
  useLabelledViolations,
  useServerValidation,
} from '@forms';
import { useTrialPolicy, useUpdateTrialPolicy } from '../hooks';
import {
  updateTrialPolicySchema,
  type UpdateTrialPolicyFormData,
} from '../schemas/tenant.schemas';

const FIELD_LABELS = {
  durationDays: 'tenant:platformAdmin.trialPolicy.durationDaysLabel',
} as const;

export default function PlatformTrialPolicyPage(): JSX.Element {
  const { t } = useTranslation();

  const { data: policy, isLoading, error, refetch } = useTrialPolicy();
  const {
    mutateAsync: updateTrialPolicy,
    isPending,
    error: mutationError,
  } = useUpdateTrialPolicy();

  const form = useForm<UpdateTrialPolicyFormData>({
    resolver: zodResolver(updateTrialPolicySchema),
    values: policy
      ? { enabled: policy.enabled, durationDays: String(policy.durationDays) }
      : undefined,
  });

  const labelledError = useLabelledViolations(
    mutationError ?? null,
    FIELD_LABELS
  );
  useServerValidation(form, labelledError);
  const enabled = form.watch('enabled');

  // Resolves false after a failure it already reported, so the Save button
  // and the unsaved-changes dialog's "Save and leave" share it.
  async function onSubmit(data: UpdateTrialPolicyFormData): Promise<boolean> {
    const parsed = updateTrialPolicySchema.parse(data);
    try {
      await updateTrialPolicy({
        enabled: parsed.enabled,
        durationDays: Number(parsed.durationDays),
      });
      form.reset(data);
      toast({
        title: t('tenant:platformAdmin.trialPolicy.success'),
        description: t('common:states.success.description'),
      });
      return true;
    } catch {
      // Shown once: on the field, or in the alert above Save.
      return false;
    }
  }

  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    onSave: () => saveViaForm(form, onSubmit),
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !policy) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="tenant:platformAdmin.trialPolicy.title"
          descriptionKey="tenant:platformAdmin.trialPolicy.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="tenant:platformAdmin.trialPolicy.title"
        descriptionKey="tenant:platformAdmin.trialPolicy.subtitle"
      />

      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {t('tenant:platformAdmin.trialPolicy.formTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>
                        {t('tenant:platformAdmin.trialPolicy.enabledLabel')}
                      </FormLabel>
                      <FormDescription>
                        {t(
                          'tenant:platformAdmin.trialPolicy.enabledDescription'
                        )}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label={t(
                          'tenant:platformAdmin.trialPolicy.enabledLabel'
                        )}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('tenant:platformAdmin.trialPolicy.durationDaysLabel')}
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        dir="ltr"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {enabled
                        ? t('tenant:platformAdmin.trialPolicy.durationDaysHelp')
                        : t(
                            'tenant:platformAdmin.trialPolicy.durationDaysDisabledHelp'
                          )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {mutationError &&
          mutationError.kind !== 'cancelled' &&
          !hasViolationOn(mutationError, FIELD_LABELS) ? (
            <SaveFailedAlert
              error={mutationError}
              titleKey="tenant:platformAdmin.trialPolicy.error"
            />
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('tenant:platformAdmin.trialPolicy.saving')}
                </>
              ) : (
                <>
                  <Save className="size-4" strokeWidth={2} aria-hidden />
                  {t('tenant:platformAdmin.trialPolicy.saveButton')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  );
}
