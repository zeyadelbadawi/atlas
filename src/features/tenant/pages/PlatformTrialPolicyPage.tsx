/**
 * Platform Trial Policy Page.
 *
 * Atlas Platform Owner-only. Lets the Platform Owner configure whether new
 * Tenants get a free trial and, if so, its duration — the concrete
 * requirement behind "7 days must not be a hardcoded business rule"
 * (see `Reports/ARCHITECTURE.md`, Prompt 6). Access is gated by
 * `requiredRoles: ['platform_owner']` on the route/nav entry, the same
 * pattern already used for Settings/Billing/Analytics.
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
import { useServerValidation } from '@forms';
import { useTrialPolicy, useUpdateTrialPolicy } from '../hooks';
import {
  updateTrialPolicySchema,
  type UpdateTrialPolicyFormData,
} from '../schemas/tenant.schemas';

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
      ? { enabled: policy.enabled, durationDays: policy.durationDays }
      : undefined,
  });

  useServerValidation(form, mutationError);
  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    messageKey: 'tenant:platformAdmin.trialPolicy.unsavedChanges',
  });

  const enabled = form.watch('enabled');

  const onSubmit = async (data: UpdateTrialPolicyFormData) => {
    try {
      await updateTrialPolicy(data);
      toast({
        title: t('tenant:platformAdmin.trialPolicy.success'),
        description: t('common:states.success.description'),
      });
    } catch {
      toast({
        title: t('tenant:platformAdmin.trialPolicy.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      {t(
                        'tenant:platformAdmin.trialPolicy.durationDaysLabel'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        disabled={!enabled}
                        {...field}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ''
                              ? 0
                              : Number(event.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {enabled
                        ? t(
                            'tenant:platformAdmin.trialPolicy.durationDaysHelp'
                          )
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
