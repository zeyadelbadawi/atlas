/**
 * Website Domain Tab (Prompt 11).
 *
 * Embedded as a new tab in the existing `WebsiteSettingsPage`
 * (`@features/website`) — this file lives in `@features/domain` and is
 * consumed through that feature's public barrel, the same
 * cross-feature-import pattern every other Atlas feature already uses
 * (`no-restricted-imports` only allows the bare `@features/<name>`
 * barrel, never a deep import).
 *
 * Shows the Academy's Atlas subdomain (derived from the Platform base
 * domain + the Academy's own slug — or an honest "not configured" state
 * when no Platform base domain exists yet), the custom-domain lifecycle,
 * and SSL/CDN status. Nothing here ever shows a fake "Active"/"Verified"
 * value — every status comes straight from `useAcademyDomain`'s real
 * query response (see `Reports/ARCHITECTURE.md`, Prompt 11, "No Fake
 * Infrastructure").
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Globe, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import { usePermissions } from '@hooks';
import { useServerValidation } from '@forms';
import {
  useAcademyDomain,
  useAddCustomDomain,
  useInfrastructureProviderStatus,
  usePlatformDomainConfiguration,
  useRemoveCustomDomain,
  useVerifyDomain,
} from '../hooks';
import { addCustomDomainSchema, type AddCustomDomainFormData } from '../schemas/domain.schemas';
import { getCdnStatusTone, getDomainStatusTone, getSslStatusTone } from '../utils/domain-status.utils';

export interface WebsiteDomainTabProps {
  readonly academyId: string;
  readonly academySlug: string;
}

export function WebsiteDomainTab({ academyId, academySlug }: WebsiteDomainTabProps): JSX.Element {
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('academy.website.manage');

  const platformDomainQuery = usePlatformDomainConfiguration();
  const domainQuery = useAcademyDomain(academyId);
  const cloudflareStatusQuery = useInfrastructureProviderStatus('cloudflare');
  const addDomain = useAddCustomDomain();
  const removeDomain = useRemoveCustomDomain();
  const verifyDomain = useVerifyDomain();

  const [showAddForm, setShowAddForm] = useState(false);

  const form = useForm<AddCustomDomainFormData>({
    resolver: zodResolver(addCustomDomainSchema),
    defaultValues: { hostname: '' },
  });
  useServerValidation(form, addDomain.error);

  if (domainQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  if (domainQuery.error || !domainQuery.data) {
    return <ErrorState onRetry={() => domainQuery.refetch()} />;
  }

  const domain = domainQuery.data;
  const platformDomainConfigured = platformDomainQuery.data?.configured ?? false;
  const baseDomain = platformDomainQuery.data?.baseDomain;
  const derivedSubdomain = platformDomainConfigured && baseDomain ? `${academySlug}.${baseDomain}` : undefined;

  const onSubmitAddDomain = (data: AddCustomDomainFormData) => {
    addDomain.mutate(
      { academyId, payload: data },
      {
        onSuccess: () => {
          toast({ title: t('website:domain.custom.added') });
          setShowAddForm(false);
          form.reset();
        },
        onError: () => toast({ title: t('website:domain.custom.addError'), variant: 'destructive' }),
      }
    );
  };

  const handleRemove = async () => {
    const confirmed = await confirm({
      titleKey: 'website:domain.custom.removeConfirmTitle',
      descriptionKey: 'website:domain.custom.removeConfirmDescription',
      confirmLabelKey: 'website:domain.custom.removeAction',
      intent: 'destructive',
    });
    if (!confirmed) return;
    removeDomain.mutate(academyId, {
      onError: () => toast({ title: t('website:domain.custom.removeError'), variant: 'destructive' }),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('website:domain.subdomain.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {derivedSubdomain ? (
            <div className="flex items-center gap-3">
              <Globe className="size-4 text-muted-foreground" aria-hidden />
              <code className="text-sm font-medium text-foreground" dir="ltr">
                {derivedSubdomain}
              </code>
              {domain.subdomain ? (
                <StatusBadge
                  labelKey={`website:domain.subdomain.status.${domain.subdomain.status}`}
                  tone={domain.subdomain.status === 'assigned' ? 'success' : 'neutral'}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('website:domain.subdomain.notConfigured')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('website:domain.custom.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {domain.customDomain?.hostname ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <code className="text-sm font-medium text-foreground" dir="ltr">
                  {domain.customDomain.hostname}
                </code>
                <StatusBadge
                  labelKey={`website:domain.custom.status.${domain.customDomain.status}`}
                  tone={getDomainStatusTone(domain.customDomain.status)}
                />
              </div>

              {domain.customDomain.verificationRecords?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {t('website:domain.custom.dnsInstructionsTitle')}
                  </p>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-start text-sm" dir="ltr">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="p-2 text-start">{t('website:domain.custom.dnsType')}</th>
                          <th className="p-2 text-start">{t('website:domain.custom.dnsName')}</th>
                          <th className="p-2 text-start">{t('website:domain.custom.dnsValue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domain.customDomain.verificationRecords.map((record, index) => (
                          <tr key={`${record.type}-${index}`} className="border-t border-border">
                            <td className="p-2 font-mono">{record.type}</td>
                            <td className="p-2 font-mono">{record.name}</td>
                            <td className="p-2 font-mono">{record.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={verifyDomain.isPending}
                    onClick={() =>
                      verifyDomain.mutate(academyId, {
                        onError: () =>
                          toast({ title: t('website:domain.custom.verifyError'), variant: 'destructive' }),
                      })
                    }
                  >
                    {verifyDomain.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="size-3.5" aria-hidden />
                    )}
                    {t('website:domain.custom.verifyAction')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    disabled={removeDomain.isPending}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    {t('website:domain.custom.removeAction')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : showAddForm && canManage ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitAddDomain)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="hostname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('website:domain.custom.hostnameLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" placeholder="www.example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addDomain.isPending}>
                    {addDomain.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : null}
                    {t('website:domain.custom.addAction')}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    {t('common:actions.cancel')}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('website:domain.custom.empty')}</p>
              {canManage ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                  {t('website:domain.custom.addAction')}
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('website:domain.infrastructure.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{t('website:domain.infrastructure.ssl')}</p>
            <StatusBadge
              labelKey={`website:domain.infrastructure.sslStatus.${domain.ssl.status}`}
              tone={getSslStatusTone(domain.ssl.status)}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{t('website:domain.infrastructure.cdn')}</p>
            <StatusBadge
              labelKey={`website:domain.infrastructure.cdnStatus.${domain.cdn.status}`}
              tone={getCdnStatusTone(domain.cdn.status)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium text-foreground">
              {t('website:domain.infrastructure.provider')}
            </p>
            <p className="text-sm text-muted-foreground">
              {cloudflareStatusQuery.data?.connected
                ? t('website:domain.infrastructure.providerConnected')
                : t('website:domain.infrastructure.providerNotConnected')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
