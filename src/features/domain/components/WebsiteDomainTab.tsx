/**
 * Website access tab (Prompt 11; reworked P63).
 *
 * Embedded in `WebsiteSettingsPage` (`@features/website`) through this
 * feature's public barrel. Answers, in the customer's order of concern:
 * what is my website address, what is my Atlas address, what custom
 * domain am I using and what do I still need to do, has Atlas verified
 * it, is HTTPS working, and which address is primary.
 *
 * Every value is a server fact from `useAcademyDomain` — the canonical
 * host, the lifecycle status, the last check and its error, the HTTPS
 * probe — or an explicit "not yet"/"unknown". Nothing is derived on the
 * client from a guessed base domain and nothing is ever shown as
 * verified because a button was clicked.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { useConfirmDialog } from '@app/providers';
import { useDateFormatter, usePermissions, useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import {
  useAcademyDomain,
  useAddCustomDomain,
  useInfrastructureProviderStatus,
  usePlatformDomainConfiguration,
  useRemoveCustomDomain,
  useVerifyDomain,
} from '../hooks';
import {
  addCustomDomainSchema,
  type AddCustomDomainFormData,
} from '../schemas/domain.schemas';
import {
  getDomainStatusTone,
  getSslStatusTone,
} from '../utils/domain-status.utils';
import {
  deriveCustomDomainStep,
  shouldShowDnsInstructions,
} from '../utils/domain-lifecycle.utils';
import { CustomDomainStepper } from './CustomDomainStepper';
import { DnsRecordsTable } from './DnsRecordsTable';

export interface WebsiteDomainTabProps {
  readonly academyId: string;
  readonly academySlug: string;
}

export function WebsiteDomainTab({
  academyId,
  academySlug,
}: WebsiteDomainTabProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
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

  useUnsavedChanges({ isDirty: form.formState.isDirty });
  useServerValidation(form, addDomain.error);

  if (domainQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  if (domainQuery.error || !domainQuery.data) {
    return <ErrorState onRetry={() => domainQuery.refetch()} />;
  }

  const domain = domainQuery.data;
  const custom = domain.customDomain;
  const step = deriveCustomDomainStep(custom);
  const baseDomain = platformDomainQuery.data?.baseDomain;
  // The server's allocation host is authoritative; the platform base
  // domain only fills in for an allocation recorded before a base domain
  // existed. Never a fabricated address.
  const subdomainHost =
    domain.subdomain?.fullHost ??
    (baseDomain ? `${academySlug}.${baseDomain}` : undefined);
  const canonicalHost = domain.canonicalHost?.host;
  const customIsCanonical = domain.canonicalHost?.source === 'custom_domain';
  const isBusy = addDomain.isPending || removeDomain.isPending || verifyDomain.isPending;

  const onSubmitAddDomain = (data: AddCustomDomainFormData) => {
    addDomain.mutate(
      { academyId, payload: data },
      {
        onSuccess: () => {
          toast({ title: t('website:domain.custom.added') });
          setShowAddForm(false);
          form.reset();
        },
        onError: () =>
          toast({
            title: t('website:domain.custom.addError'),
            variant: 'destructive',
          }),
      }
    );
  };

  const handleCheck = () =>
    verifyDomain.mutate(academyId, {
      onSuccess: (result) => {
        const error = result.customDomain?.lastCheckError;
        toast({
          title: error
            ? t(`website:domain.checkError.${error}.title`)
            : t(`website:domain.custom.checked.${deriveCustomDomainStep(result.customDomain)}`),
          variant: error ? 'destructive' : undefined,
        });
      },
      onError: () =>
        toast({
          title: t('website:domain.custom.verifyError'),
          variant: 'destructive',
        }),
    });

  const handleRemove = async () => {
    const confirmed = await confirm({
      titleKey: 'website:domain.custom.removeConfirmTitle',
      descriptionKey: 'website:domain.custom.removeConfirmDescription',
      confirmLabelKey: 'website:domain.custom.removeAction',
      intent: 'destructive',
    });
    if (!confirmed) return;
    removeDomain.mutate(academyId, {
      onSuccess: () => toast({ title: t('website:domain.custom.removed') }),
      onError: () =>
        toast({
          title: t('website:domain.custom.removeError'),
          variant: 'destructive',
        }),
    });
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ website address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('website:domain.address.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canonicalHost ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Globe className="size-4 text-muted-foreground" aria-hidden />
                <a
                  href={`https://${canonicalHost}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  dir="ltr"
                >
                  {canonicalHost}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
                <StatusBadge
                  labelKey={
                    customIsCanonical
                      ? 'website:domain.address.primaryCustom'
                      : 'website:domain.address.primarySubdomain'
                  }
                  tone="info"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {customIsCanonical
                  ? t('website:domain.address.redirectNote', { host: subdomainHost ?? '' })
                  : custom?.hostname
                    ? t('website:domain.address.subdomainUntilVerified')
                    : t('website:domain.address.subdomainOnly')}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('website:domain.subdomain.notConfigured')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ atlas subdomain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('website:domain.subdomain.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subdomainHost ? (
            <div className="flex flex-wrap items-center gap-3">
              <code className="text-sm font-medium text-foreground" dir="ltr">
                {subdomainHost}
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
          <p className="text-sm text-muted-foreground">
            {t('website:domain.subdomain.help')}
          </p>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ custom domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('website:domain.custom.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomDomainStepper step={step} />

          {custom?.hostname ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <code className="text-sm font-medium text-foreground" dir="ltr">
                  {custom.hostname}
                </code>
                <StatusBadge
                  labelKey={`website:domain.custom.status.${custom.status}`}
                  tone={getDomainStatusTone(custom.status)}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                {t(`website:domain.custom.stepHelp.${step}`)}
              </p>

              {custom.lastCheckError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" aria-hidden />
                  <AlertTitle>{t(`website:domain.checkError.${custom.lastCheckError}.title`)}</AlertTitle>
                  <AlertDescription>
                    {t(`website:domain.checkError.${custom.lastCheckError}.description`)}
                  </AlertDescription>
                </Alert>
              ) : null}

              {shouldShowDnsInstructions(step) && domain.dns ? (
                <DnsRecordsTable hostname={custom.hostname} dns={domain.dns} />
              ) : null}

              <dl className="grid gap-1 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">{t('website:domain.custom.lastChecked')}</dt>
                  <dd className="font-medium">
                    {custom.lastCheckedAt
                      ? fmt.dateTime(custom.lastCheckedAt)
                      : t('website:domain.custom.neverChecked')}
                  </dd>
                </div>
                {custom.connectedAt ? (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">{t('website:domain.custom.connectedSince')}</dt>
                    <dd className="font-medium">{fmt.dateTime(custom.connectedAt)}</dd>
                  </div>
                ) : null}
              </dl>

              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={handleCheck}
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
                    disabled={isBusy}
                  >
                    {removeDomain.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-3.5" aria-hidden />
                    )}
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
                        <Input {...field} dir="ltr" placeholder="www.example.com" autoComplete="off" />
                      </FormControl>
                      <FormDescription>{t('website:domain.custom.hostnameHelp')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" disabled={addDomain.isPending}>
                    {addDomain.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : null}
                    {t('website:domain.custom.addAction')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={addDomain.isPending}
                    onClick={() => {
                      setShowAddForm(false);
                      form.reset();
                    }}
                  >
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

      {/* ------------------------------------------------ https & infrastructure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('website:domain.infrastructure.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              {t('website:domain.infrastructure.subdomainHttps')}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-success" aria-hidden />
              {t('website:domain.infrastructure.subdomainHttpsManaged')}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              {t('website:domain.infrastructure.customHttps')}
            </p>
            {custom?.hostname ? (
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  labelKey={`website:domain.infrastructure.sslStatus.${domain.ssl.status}`}
                  tone={getSslStatusTone(domain.ssl.status)}
                />
                {custom.httpsReachable === undefined ? (
                  <span className="text-sm text-muted-foreground">
                    {t('website:domain.infrastructure.httpsNotProbed')}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {custom.httpsReachable
                      ? t('website:domain.infrastructure.httpsReachable', {
                          time: custom.httpsCheckedAt ? fmt.dateTime(custom.httpsCheckedAt) : '',
                        })
                      : t('website:domain.infrastructure.httpsUnreachable', {
                          time: custom.httpsCheckedAt ? fmt.dateTime(custom.httpsCheckedAt) : '',
                        })}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('website:domain.infrastructure.customHttpsNone')}
              </p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium text-foreground">
              {t('website:domain.infrastructure.provider')}
            </p>
            <p className="text-sm text-muted-foreground">
              {cloudflareStatusQuery.isLoading
                ? t('website:domain.infrastructure.providerChecking')
                : cloudflareStatusQuery.data?.connected
                  ? t('website:domain.infrastructure.providerConnected')
                  : t('website:domain.infrastructure.providerNotConnected')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
