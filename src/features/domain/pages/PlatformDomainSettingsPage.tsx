/**
 * Platform Domain Settings Page (Prompt 11).
 *
 * Atlas Platform Owner-only, mirroring `PlatformTrialPolicyPage`'s exact
 * pattern (Prompt 6) — one backend-configurable settings resource, seeded
 * with a compiled default (`DEFAULT_PLATFORM_DOMAIN_CONFIGURATION`),
 * gated by `requiredRoles: ['platform_owner']` at the route/nav level,
 * never a separate permission string.
 *
 * There is no real Atlas production domain today. Saving a value here
 * does not make it real — it only tells the backend what the Platform
 * Owner intends, and the honest "not configured" state is what every
 * Academy's domain tab shows until this is genuinely set (see
 * `Reports/ARCHITECTURE.md`, Prompt 11, "No Real Atlas Domain Yet").
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import {
  useInfrastructureProviderStatus,
  usePlatformDomainConfiguration,
  useUpdatePlatformDomainConfiguration,
} from '../hooks';
import { platformDomainSchema, type PlatformDomainFormData } from '../schemas/domain.schemas';

export default function PlatformDomainSettingsPage(): JSX.Element {
  const { t } = useTranslation();

  const { data: config, isLoading, error, refetch } = usePlatformDomainConfiguration();
  const { mutateAsync: updateConfig, isPending, error: mutationError } =
    useUpdatePlatformDomainConfiguration();
  const cloudflareStatus = useInfrastructureProviderStatus('cloudflare');

  const form = useForm<PlatformDomainFormData>({
    resolver: zodResolver(platformDomainSchema),
    values: { baseDomain: config?.baseDomain ?? '' },
  });

  useServerValidation(form, mutationError);
  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    messageKey: 'website:platformDomain.unsavedChanges',
  });

  const onSubmit = async (data: PlatformDomainFormData) => {
    try {
      await updateConfig(data);
      toast({ title: t('website:platformDomain.success') });
    } catch {
      toast({ title: t('website:platformDomain.error'), variant: 'destructive' });
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

  if (error || !config) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="website:platformDomain.title"
          descriptionKey="website:platformDomain.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="website:platformDomain.title"
        descriptionKey="website:platformDomain.subtitle"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t('website:platformDomain.formTitle')}
              <StatusBadge
                labelKey={
                  config.configured
                    ? 'website:platformDomain.status.configured'
                    : 'website:platformDomain.status.notConfigured'
                }
                tone={config.configured ? 'success' : 'neutral'}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="baseDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('website:platformDomain.baseDomainLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" placeholder="example.com" />
                      </FormControl>
                      <FormDescription>{t('website:platformDomain.baseDomainHelp')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Save className="size-4" strokeWidth={2} aria-hidden />
                    )}
                    {t('website:common.saveChanges')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('website:platformDomain.infrastructureTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {t('website:domain.infrastructure.provider')}
              </span>
              <StatusBadge
                labelKey={
                  cloudflareStatus.data?.connected
                    ? 'website:platformDomain.providerConnected'
                    : 'website:platformDomain.providerNotConnected'
                }
                tone={cloudflareStatus.data?.connected ? 'success' : 'neutral'}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('website:platformDomain.infrastructureHelp')}
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
