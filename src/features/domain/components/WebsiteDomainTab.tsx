/**
 * Website access tab (Prompt 11; reworked P63, P63c).
 *
 * Embedded in `WebsiteSettingsPage` (`@features/website`) through this
 * feature's public barrel. Answers, in the customer's order of concern:
 * what is my website address, what is my Atlas address, what custom
 * domain am I using and what do I still need to do, has Atlas verified
 * it, is HTTPS working, and which address is primary.
 *
 * Every value is a server fact from `useAcademyDomain` — the canonical
 * host, the lifecycle status, whether the provider holds the hostname,
 * whether DNS setup is genuinely possible, the last check and its error,
 * the HTTPS probe — or an explicit "not yet"/"unknown". The step shown is
 * derived from those facts on every render, so a refresh lands on the
 * same step. Nothing is ever shown as verified because a button was
 * clicked.
 *
 * P63c: a domain the provider has not accepted is a BLOCKED state ("Atlas
 * is not ready"), never an empty DNS table; and the hostname can be
 * changed at any step before "live" (with a confirmation once live).
 *
 * P63d: "connected" is not "live". The step past verification is HTTPS —
 * certificate issued AND Atlas's own probe succeeded (server-computed
 * `live`) — and while it is pending or failing the tab says exactly
 * which fact is missing, re-reads the server's facts periodically, and
 * offers "Check now" right where the HTTPS state is shown. While a
 * replacement hostname is being entered the indicator shows Connect:
 * the old domain's progress is never shown as the new one's.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Globe,
  Loader2,
  Pencil,
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
import { cn, MIRROR_IN_RTL } from '@utils';
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
  canChangeDomainFreely,
  deriveCustomDomainStep,
  isInProgressStep,
  shouldShowDnsInstructions,
  stepWhileEditing,
  type CustomDomainStep,
} from '../utils/domain-lifecycle.utils';
import { CustomDomainStepper } from './CustomDomainStepper';
import { DnsRecordsTable } from './DnsRecordsTable';

/** How often the tab re-reads the server's stored facts while a domain is in progress. */
const IN_PROGRESS_REFETCH_MS = 60_000;

export interface WebsiteDomainTabProps {
  readonly academyId: string;
  readonly academySlug: string;
}

/** Which copy explains a failed HTTPS check: the probe's reason, the certificate state, or a generic fallback. */
function httpsFailureKey(custom: {
  readonly httpsFailureReason?: string;
  readonly sslStatus: string;
}): string {
  if (custom.httpsFailureReason) return custom.httpsFailureReason;
  if (custom.sslStatus === 'failed' || custom.sslStatus === 'expired') {
    return `certificate_${custom.sslStatus}`;
  }
  return 'unknown';
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

  // Only transient UI: whether the hostname form is open. Everything
  // about the domain itself comes from the server on every render.
  const [formMode, setFormMode] = useState<'closed' | 'add' | 'change'>(
    'closed'
  );
  const platformDomainQuery = usePlatformDomainConfiguration();
  // While the provider, the sweep or the origin can still move the domain
  // forward, re-read the stored facts every minute (a database read — the
  // provider is only asked by the sweep and by "Check now").
  const domainQuery = useAcademyDomain(academyId, {
    refetchInterval: (data) =>
      data &&
      isInProgressStep(deriveCustomDomainStep(data.customDomain, data.dns))
        ? IN_PROGRESS_REFETCH_MS
        : false,
  });
  const cloudflareStatusQuery = useInfrastructureProviderStatus('cloudflare');
  const addDomain = useAddCustomDomain();
  const removeDomain = useRemoveCustomDomain();
  const verifyDomain = useVerifyDomain();

  const form = useForm<AddCustomDomainFormData>({
    resolver: zodResolver(addCustomDomainSchema),
    defaultValues: { hostname: '' },
  });

  useUnsavedChanges({
    isDirty: formMode !== 'closed' && form.formState.isDirty,
  });
  useServerValidation(form, addDomain.error);

  if (domainQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  if (domainQuery.error || !domainQuery.data) {
    return <ErrorState onRetry={() => domainQuery.refetch()} />;
  }

  const domain = domainQuery.data;
  const custom = domain.customDomain;
  const step: CustomDomainStep = deriveCustomDomainStep(custom, domain.dns);
  // What the progress indicator shows: the stored domain's step, except
  // while a replacement hostname is being entered (then "Connect").
  const displayedStep = stepWhileEditing(step, formMode);
  const baseDomain = platformDomainQuery.data?.baseDomain;
  // The server's allocation host is authoritative; the platform base
  // domain only fills in for an allocation recorded before a base domain
  // existed. Never a fabricated address.
  const subdomainHost =
    domain.subdomain?.fullHost ??
    (baseDomain ? `${academySlug}.${baseDomain}` : undefined);
  const canonicalHost = domain.canonicalHost?.host;
  const customIsCanonical = domain.canonicalHost?.source === 'custom_domain';
  const isBusy =
    addDomain.isPending || removeDomain.isPending || verifyDomain.isPending;

  const closeForm = () => {
    setFormMode('closed');
    form.reset({ hostname: '' });
  };

  const openChangeForm = async () => {
    if (!custom?.hostname) return;
    if (!canChangeDomainFreely(step)) {
      // Live: replacing it disconnects a working address. Say so first.
      const confirmed = await confirm({
        titleKey: 'website:domain.custom.changeLiveConfirmTitle',
        descriptionKey: 'website:domain.custom.changeLiveConfirmDescription',
        confirmLabelKey: 'website:domain.custom.changeLiveConfirmAction',
        intent: 'destructive',
        values: { hostname: custom.hostname },
      });
      if (!confirmed) return;
    }
    form.reset({ hostname: custom.hostname });
    setFormMode('change');
  };

  const onSubmitHostname = (data: AddCustomDomainFormData) => {
    const unchanged = data.hostname === custom?.hostname;
    addDomain.mutate(
      { academyId, payload: data },
      {
        onSuccess: (result) => {
          const nextStep = deriveCustomDomainStep(
            result.customDomain,
            result.dns
          );
          toast({
            title:
              nextStep === 'blocked'
                ? t(
                    `website:domain.blocked.${result.dns?.blockedReason ?? 'provider_not_registered'}.title`
                  )
                : formMode === 'change' && !unchanged
                  ? t('website:domain.custom.changed')
                  : t('website:domain.custom.added'),
            variant: nextStep === 'blocked' ? 'destructive' : undefined,
          });
          closeForm();
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
        const nextStep = deriveCustomDomainStep(
          result.customDomain,
          result.dns
        );
        toast({
          title: error
            ? t(`website:domain.checkError.${error}.title`)
            : t(`website:domain.custom.checked.${nextStep}`),
          variant: error || nextStep === 'blocked' ? 'destructive' : undefined,
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
      onSuccess: () => {
        closeForm();
        toast({ title: t('website:domain.custom.removed') });
      },
      onError: () =>
        toast({
          title: t('website:domain.custom.removeError'),
          variant: 'destructive',
        }),
    });
  };

  const hostnameForm = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmitHostname)}
        className="space-y-3"
      >
        {formMode === 'change' ? (
          <p className="text-sm text-muted-foreground">
            {t('website:domain.custom.changeHelp')}
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="hostname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('website:domain.custom.hostnameLabel')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  dir="ltr"
                  placeholder="www.example.com"
                  autoComplete="off"
                  autoFocus
                />
              </FormControl>
              <FormDescription>
                {t('website:domain.custom.hostnameHelp')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={isBusy}>
            {addDomain.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            {formMode === 'change'
              ? t('website:domain.custom.changeSubmit')
              : t('website:domain.custom.addAction')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={addDomain.isPending}
            onClick={closeForm}
          >
            <ArrowLeft className={cn('size-3.5', MIRROR_IN_RTL)} aria-hidden />
            {formMode === 'change'
              ? t('website:domain.custom.backAction')
              : t('common:actions.cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ website address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('website:domain.address.title')}
          </CardTitle>
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
                  ? t('website:domain.address.redirectNote', {
                      host: subdomainHost ?? '',
                    })
                  : custom?.hostname
                    ? custom.status === 'connected'
                      ? t('website:domain.address.subdomainUntilHttps')
                      : t('website:domain.address.subdomainUntilVerified')
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
          <CardTitle className="text-base">
            {t('website:domain.subdomain.title')}
          </CardTitle>
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
                  tone={
                    domain.subdomain.status === 'assigned'
                      ? 'success'
                      : 'neutral'
                  }
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
          <CardTitle className="text-base">
            {t('website:domain.custom.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomDomainStepper step={displayedStep} />

          {custom?.hostname && formMode !== 'change' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <code className="text-sm font-medium text-foreground" dir="ltr">
                  {custom.hostname}
                </code>
                <StatusBadge
                  labelKey={
                    step === 'live'
                      ? 'website:domain.custom.lifecycle.live'
                      : step === 'securing'
                        ? 'website:domain.custom.lifecycle.securing'
                        : step === 'https_failed'
                          ? 'website:domain.custom.lifecycle.https_failed'
                          : `website:domain.custom.status.${custom.status}`
                  }
                  tone={
                    step === 'blocked' || step === 'securing'
                      ? 'warning'
                      : step === 'https_failed'
                        ? 'destructive'
                        : getDomainStatusTone(custom.status)
                  }
                />
              </div>

              <p className="text-sm text-muted-foreground">
                {t(`website:domain.custom.stepHelp.${step}`)}
              </p>

              {step === 'blocked' && domain.dns?.blockedReason ? (
                <Alert>
                  <AlertTriangle className="size-4" aria-hidden />
                  <AlertTitle>
                    {t(
                      `website:domain.blocked.${domain.dns.blockedReason}.title`
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    {t(
                      `website:domain.blocked.${domain.dns.blockedReason}.description`
                    )}
                  </AlertDescription>
                </Alert>
              ) : step === 'https_failed' ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" aria-hidden />
                  <AlertTitle>
                    {t(
                      `website:domain.httpsFailure.${httpsFailureKey(custom)}.title`,
                      { code: custom.httpsStatusCode ?? '' }
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    {t(
                      `website:domain.httpsFailure.${httpsFailureKey(custom)}.description`,
                      { code: custom.httpsStatusCode ?? '' }
                    )}
                  </AlertDescription>
                </Alert>
              ) : custom.lastCheckError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" aria-hidden />
                  <AlertTitle>
                    {t(
                      `website:domain.checkError.${custom.lastCheckError}.title`
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    {t(
                      `website:domain.checkError.${custom.lastCheckError}.description`
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {shouldShowDnsInstructions(step) && domain.dns?.ready ? (
                <DnsRecordsTable hostname={custom.hostname} dns={domain.dns} />
              ) : null}

              <dl className="grid gap-1 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">
                    {t('website:domain.custom.lastChecked')}
                  </dt>
                  <dd className="font-medium">
                    {custom.lastCheckedAt
                      ? fmt.dateTime(custom.lastCheckedAt)
                      : t('website:domain.custom.neverChecked')}
                  </dd>
                </div>
                {custom.connectedAt ? (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">
                      {t('website:domain.custom.connectedSince')}
                    </dt>
                    <dd className="font-medium">
                      {fmt.dateTime(custom.connectedAt)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={step === 'blocked' ? 'default' : 'outline'}
                    size="sm"
                    disabled={isBusy}
                    onClick={handleCheck}
                  >
                    {verifyDomain.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="size-3.5" aria-hidden />
                    )}
                    {verifyDomain.isPending
                      ? t('website:domain.custom.checking')
                      : step === 'blocked'
                        ? t('website:domain.custom.retryAction')
                        : t('website:domain.custom.verifyAction')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => void openChangeForm()}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    {t('website:domain.custom.changeAction')}
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
          ) : formMode !== 'closed' && canManage ? (
            <div className="space-y-3">
              {formMode === 'change' && custom?.hostname ? (
                <p className="text-sm font-medium text-foreground">
                  {t('website:domain.custom.changeTitle')}
                </p>
              ) : null}
              {hostnameForm}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('website:domain.custom.empty')}
              </p>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.reset({ hostname: '' });
                    setFormMode('add');
                  }}
                >
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
          <CardTitle className="text-base">
            {t('website:domain.infrastructure.title')}
          </CardTitle>
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
              <div className="space-y-2">
                <dl className="grid gap-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="text-muted-foreground">
                      {t('website:domain.infrastructure.certificate')}
                    </dt>
                    <dd>
                      <StatusBadge
                        labelKey={`website:domain.infrastructure.sslStatus.${domain.ssl.status}`}
                        tone={getSslStatusTone(domain.ssl.status)}
                      />
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="text-muted-foreground">
                      {t('website:domain.infrastructure.httpsCheck')}
                    </dt>
                    <dd>
                      {custom.status !== 'connected' ? (
                        <StatusBadge
                          labelKey="website:domain.infrastructure.httpsState.waiting"
                          tone="neutral"
                        />
                      ) : custom.httpsReachable === undefined ? (
                        <StatusBadge
                          labelKey="website:domain.infrastructure.httpsState.pending"
                          tone="warning"
                        />
                      ) : custom.httpsReachable ? (
                        <StatusBadge
                          labelKey="website:domain.infrastructure.httpsState.reachable"
                          tone="success"
                        />
                      ) : (
                        <StatusBadge
                          labelKey="website:domain.infrastructure.httpsState.failing"
                          tone="destructive"
                        />
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="text-muted-foreground">
                      {t('website:domain.infrastructure.publicSite')}
                    </dt>
                    <dd>
                      <StatusBadge
                        labelKey={
                          custom.live
                            ? 'website:domain.infrastructure.publicSiteLive'
                            : 'website:domain.infrastructure.publicSiteNotLive'
                        }
                        tone={custom.live ? 'success' : 'warning'}
                      />
                    </dd>
                  </div>
                </dl>
                <p className="text-sm text-muted-foreground">
                  {custom.status !== 'connected'
                    ? t('website:domain.infrastructure.httpsNotProbed')
                    : custom.httpsReachable === undefined
                      ? t('website:domain.infrastructure.httpsPendingProbe')
                      : custom.httpsReachable
                        ? t('website:domain.infrastructure.httpsReachable', {
                            time: custom.httpsCheckedAt
                              ? fmt.dateTime(custom.httpsCheckedAt)
                              : '',
                          })
                        : t(
                            `website:domain.httpsFailure.${httpsFailureKey(custom)}.short`,
                            {
                              code: custom.httpsStatusCode ?? '',
                              time: custom.httpsCheckedAt
                                ? fmt.dateTime(custom.httpsCheckedAt)
                                : '',
                            }
                          )}
                </p>
                {canManage && custom.status === 'connected' && !custom.live ? (
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
                    {verifyDomain.isPending
                      ? t('website:domain.custom.checking')
                      : t('website:domain.custom.verifyAction')}
                  </Button>
                ) : null}
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
