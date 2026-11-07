/**
 * Atlas Subscription Payment Provider — Platform Owner Console
 * (Generic Payment Gateway Integration Readiness, 2026-08-26).
 *
 * Configures which registered payment provider backs Atlas's OWN
 * subscription billing (Organization → Atlas) — never an Organization- or
 * Student-facing setting (see §5.8's separate, Organization-owned
 * course-payment configuration for that domain).
 *
 * The provider list is derived entirely from the backend's registry
 * (`useAvailableAtlasSubscriptionPaymentProviders`) — this page never
 * hardcodes a provider name or a provider-specific field. Today that list
 * contains exactly one entry, Manual Transfer, which requires no
 * credentials at all; the generic "Advanced configuration" field below is
 * the honest, provider-agnostic fallback for a future real gateway whose
 * field shape isn't known yet — never a Paymob/Stripe-specific form.
 *
 * Raw credential values are only ever sent in a save request, never
 * received back — `AtlasSubscriptionPaymentProviderConfig` has no field
 * capable of holding one.
 *
 * Below the provider configuration, `ManualPaymentMethodsCard` (2 Oct 2026)
 * manages the manual methods the Manual Transfer provider tells
 * Organizations to pay into — Bank Transfer accounts, E-Wallets and
 * InstaPay, one tab each.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBidiIsolation, useDateFormatter, useErrorText } from '@hooks';
import { errorMessageKey, normalizeUnknownError } from '@services';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, ShieldCheck, ShieldAlert } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { hasViolationOn, useServerValidation } from '@forms';
import {
  useAtlasSubscriptionPaymentProviderConfig,
  useAvailableAtlasSubscriptionPaymentProviders,
  useSaveAtlasSubscriptionPaymentProviderConfig,
  useSetAtlasSubscriptionPaymentProviderEnabled,
  useTestAtlasSubscriptionPaymentProviderConnection,
} from '../hooks';
import { ManualPaymentMethodsCard } from '../components/ManualPaymentMethodsCard';
import type { AtlasSubscriptionPaymentProviderStatus } from '@types';

const configFormSchema = z.object({
  providerKey: z.string().min(1),
  configJson: z.string().refine(
    (value) => {
      if (value.trim() === '') return true;
      try {
        const parsed: unknown = JSON.parse(value);
        return (
          typeof parsed === 'object' &&
          parsed !== null &&
          !Array.isArray(parsed)
        );
      } catch {
        return false;
      }
    },
    { message: 'payments:atlasPaymentProvider.configJsonInvalid' }
  ),
});

type ConfigFormData = z.infer<typeof configFormSchema>;

function statusTone(
  status: AtlasSubscriptionPaymentProviderStatus
): 'success' | 'warning' | 'neutral' {
  if (status === 'verified') return 'success';
  if (status === 'configured') return 'warning';
  return 'neutral';
}

/** The built-in provider every Atlas install runs on until another is enabled. */
const MANUAL_PROVIDER_KEY = 'atlas_manual';

export default function AtlasSubscriptionPaymentProviderPage(): JSX.Element {
  const fmt = useDateFormatter();
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  /** B8 (UX audit) V14 — the real reason in the one toast a failure shows. */
  const reasonOf = (error: unknown): string => {
    const failure = normalizeUnknownError(error);
    return errorText(failure.messageKey, errorMessageKey(failure.kind));
  };
  /** B8 (UX audit) V26 — Atlas's own providers by name in the page's language. */
  const providerName = (key: string | null | undefined, fallback: string) => {
    const translationKey = `payments:atlasPaymentProvider.providers.${key ?? ''}`;
    return key && i18n.exists(translationKey) ? t(translationKey) : fallback;
  };
  const { isolate } = useBidiIsolation();

  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = useAtlasSubscriptionPaymentProviderConfig();
  const { data: availableProviders, isLoading: isLoadingProviders } =
    useAvailableAtlasSubscriptionPaymentProviders();
  const {
    mutateAsync: saveConfig,
    isPending: isSaving,
    error: saveError,
  } = useSaveAtlasSubscriptionPaymentProviderConfig();
  const { mutateAsync: testConnection, isPending: isTesting } =
    useTestAtlasSubscriptionPaymentProviderConnection();
  const { mutateAsync: setEnabled, isPending: isTogglingEnabled } =
    useSetAtlasSubscriptionPaymentProviderEnabled();

  const [selectedProviderKey, setSelectedProviderKey] = useState<string>('');

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configFormSchema),
    values: { providerKey: config?.providerKey ?? '', configJson: '' },
  });

  useServerValidation(form, saveError, {
    labels: {
      configJson: 'payments:atlasPaymentProvider.configurationLabel',
    },
  });

  useEffect(() => {
    if (config?.providerKey) setSelectedProviderKey(config.providerKey);
    else if (availableProviders && availableProviders.length > 0) {
      setSelectedProviderKey(availableProviders[0].providerKey);
    }
  }, [config?.providerKey, availableProviders]);

  const requiresNoConfiguration = selectedProviderKey === 'atlas_manual';

  const onSubmit = async (data: ConfigFormData) => {
    try {
      const parsedConfig =
        data.configJson.trim() === ''
          ? {}
          : (JSON.parse(data.configJson) as Record<string, unknown>);
      await saveConfig({
        providerKey: selectedProviderKey,
        config: parsedConfig,
      });
      form.setValue('configJson', '');
      toast({ title: t('payments:atlasPaymentProvider.saveSuccess') });
    } catch (error) {
      // A refused field is said on the field only.
      if (
        hasViolationOn(normalizeUnknownError(error), {
          configJson: 'configJson',
          config: 'config',
        })
      )
        return;
      toast({
        title: t('payments:atlasPaymentProvider.saveError'),
        description: reasonOf(error),
        variant: 'destructive',
      });
    }
  };

  const onTestConnection = async () => {
    try {
      const result = await testConnection();
      toast({
        title: result.lastTestResult?.success
          ? t('payments:atlasPaymentProvider.testSuccess')
          : t('payments:atlasPaymentProvider.testFailure'),
        description: result.lastTestResult?.message,
        variant: result.lastTestResult?.success ? undefined : 'destructive',
      });
    } catch (error) {
      toast({
        title: t('payments:atlasPaymentProvider.testError'),
        description: reasonOf(error),
        variant: 'destructive',
      });
    }
  };

  const onEnable = async () => {
    try {
      await setEnabled(true);
      toast({ title: t('payments:atlasPaymentProvider.enableSuccess') });
    } catch (error) {
      toast({
        title: t('payments:atlasPaymentProvider.enableError'),
        description: reasonOf(error),
        variant: 'destructive',
      });
    }
  };

  const onDisable = async () => {
    try {
      await setEnabled(false);
      toast({ title: t('payments:atlasPaymentProvider.disableSuccess') });
    } catch (error) {
      toast({
        title: t('payments:atlasPaymentProvider.disableError'),
        description: reasonOf(error),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !config) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="payments:atlasPaymentProvider.title"
          descriptionKey="payments:atlasPaymentProvider.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="payments:atlasPaymentProvider.title"
        descriptionKey="payments:atlasPaymentProvider.subtitle"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {config.enabled ? (
                <ShieldCheck className="size-4 text-green-600" aria-hidden />
              ) : (
                <ShieldAlert
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
              )}
              {t('payments:atlasPaymentProvider.effectiveTitle')}
            </CardTitle>
            {/* B8 (UX audit) V18 — Manual Transfer is the built-in
                default, so it is active even while no other provider is
                configured or enabled; say so instead of showing "Currently
                active" beside "Not configured" with no link between them. */}
            <CardDescription data-testid="atlas-provider-effective">
              {t(
                config.effectiveProviderKey === MANUAL_PROVIDER_KEY
                  ? 'payments:atlasPaymentProvider.effectiveManualDescription'
                  : 'payments:atlasPaymentProvider.effectiveDescription',
                {
                  provider: isolate(
                    providerName(
                      config.effectiveProviderKey,
                      config.effectiveProviderDisplayName
                    )
                  ),
                }
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              {t('payments:atlasPaymentProvider.formTitle')}
              <div className="flex items-center gap-2">
                <StatusBadge
                  labelKey={`payments:atlasPaymentProvider.status.${config.status}`}
                  tone={statusTone(config.status)}
                />
                <StatusBadge
                  labelKey={
                    config.enabled
                      ? 'payments:atlasPaymentProvider.enabledLabel'
                      : 'payments:atlasPaymentProvider.disabledLabel'
                  }
                  tone={config.enabled ? 'success' : 'neutral'}
                />
              </div>
            </CardTitle>
            {config.lastTestedAt ? (
              <CardDescription>
                {t('payments:atlasPaymentProvider.lastTested', {
                  date: fmt.dateTime(config.lastTestedAt),
                })}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormItem>
                  <FormLabel>
                    {t('payments:atlasPaymentProvider.providerLabel')}
                  </FormLabel>
                  <Select
                    value={selectedProviderKey}
                    onValueChange={setSelectedProviderKey}
                    disabled={isLoadingProviders}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            'payments:atlasPaymentProvider.providerPlaceholder'
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(availableProviders ?? []).map((provider) => (
                        <SelectItem
                          key={provider.providerKey}
                          value={provider.providerKey}
                        >
                          {providerName(
                            provider.providerKey,
                            provider.displayName
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('payments:atlasPaymentProvider.providerHelp')}
                  </FormDescription>
                </FormItem>

                {requiresNoConfiguration ? (
                  <p className="text-sm text-muted-foreground">
                    {t('payments:atlasPaymentProvider.noConfigurationRequired')}
                  </p>
                ) : (
                  <FormField
                    control={form.control}
                    name="configJson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t(
                            'payments:atlasPaymentProvider.configurationLabel'
                          )}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            dir="ltr"
                            data-ltr-content
                            rows={6}
                            placeholder={t(
                              'payments:atlasPaymentProvider.configurationPlaceholder'
                            )}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('payments:atlasPaymentProvider.configurationHelp')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  {config.status === 'not_configured' ? (
                    <p
                      id="atlas-provider-test-reason"
                      className="basis-full text-end text-xs text-muted-foreground"
                    >
                      {t('payments:atlasPaymentProvider.testNeedsConfig')}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onTestConnection}
                    disabled={isTesting || config.status === 'not_configured'}
                    aria-describedby={
                      config.status === 'not_configured'
                        ? 'atlas-provider-test-reason'
                        : undefined
                    }
                  >
                    {isTesting ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {t('payments:atlasPaymentProvider.testConnection')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving || !selectedProviderKey}
                  >
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Save className="size-4" strokeWidth={2} aria-hidden />
                    )}
                    {t('website:common.saveChanges')}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="flex justify-end gap-2 border-t pt-4">
              {config.enabled ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isTogglingEnabled}>
                      {t('payments:atlasPaymentProvider.disable')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('payments:atlasPaymentProvider.disableConfirmTitle')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(
                          'payments:atlasPaymentProvider.disableConfirmDescription'
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t('payments:atlasPaymentProvider.cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={onDisable}>
                        {t('payments:atlasPaymentProvider.disable')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    onClick={onEnable}
                    disabled={isTogglingEnabled || config.status !== 'verified'}
                    aria-describedby={
                      config.status !== 'verified'
                        ? 'atlas-provider-enable-reason'
                        : undefined
                    }
                  >
                    {isTogglingEnabled ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {t('payments:atlasPaymentProvider.enable')}
                  </Button>
                  {config.status !== 'verified' ? (
                    <p
                      id="atlas-provider-enable-reason"
                      className="text-xs text-muted-foreground"
                    >
                      {t('payments:atlasPaymentProvider.enableNeedsVerified')}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <ManualPaymentMethodsCard />
      </div>
    </PageContainer>
  );
}
