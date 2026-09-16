/**
 * Platform Owner — Domains (Prompt 11; reworked P63).
 *
 * Was a form for re-typing the platform base domain. That value is owned
 * by the deployment (`PLATFORM_BASE_DOMAIN` drives CORS, hostname
 * resolution, the wildcard certificate and DNS); typing it here never
 * changed any of that, so the page now shows the effective value and its
 * source read-only, keeps the editor only for a deployment that has not
 * set the variable, and becomes what an operator actually needs:
 *
 *  - infrastructure readiness — live provider answers and live probes;
 *  - real counts of how customers' websites are addressed;
 *  - a searchable, filterable, paginated cross-tenant list of every
 *    Academy's website address, its verification state, last check,
 *    latest problem and canonical host, with an operator "Check now".
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { MetricCard, StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  useDateFormatter,
  usePagination,
  useSearch,
  useUnsavedChanges,
} from '@hooks';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { formatNumber } from '@utils';
import {
  useCheckPlatformDomain,
  usePlatformDomainConfiguration,
  usePlatformDomainReadiness,
  usePlatformDomains,
  usePlatformDomainsOverview,
  useUpdatePlatformDomainConfiguration,
} from '../hooks';
import {
  platformDomainSchema,
  type PlatformDomainFormData,
} from '../schemas/domain.schemas';
import { getDomainStatusTone } from '../utils/domain-status.utils';
import type {
  DomainStatus,
  LanguageCode,
  PlatformDomainKindFilter,
  PlatformDomainRow,
} from '@types';

const ALL = '__all__';
const KIND_OPTIONS: readonly PlatformDomainKindFilter[] = [
  'custom',
  'subdomain',
];
const STATUS_OPTIONS: readonly DomainStatus[] = [
  'verification_required',
  'pending',
  'verifying',
  'connected',
  'failed',
  'disconnected',
];

function readParam<T extends string>(
  value: string | null,
  options: readonly T[]
): T | undefined {
  return value && (options as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function TruthRow({
  labelKey,
  ok,
  unknown,
  detail,
}: {
  readonly labelKey: string;
  readonly ok?: boolean;
  readonly unknown?: boolean;
  readonly detail?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const Icon = unknown ? AlertTriangle : ok ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon
        className={
          unknown
            ? 'mt-0.5 size-4 shrink-0 text-warning'
            : ok
              ? 'mt-0.5 size-4 shrink-0 text-success'
              : 'mt-0.5 size-4 shrink-0 text-destructive'
        }
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-foreground">{t(labelKey)}</p>
        {detail ? (
          <p className="break-all text-muted-foreground" dir="ltr">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function PlatformDomainSettingsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const configQuery = usePlatformDomainConfiguration();
  const readinessQuery = usePlatformDomainReadiness();
  const overviewQuery = usePlatformDomainsOverview();
  const updateConfig = useUpdatePlatformDomainConfiguration();
  const checkDomain = useCheckPlatformDomain();

  // ---- filters live in the URL, like every other platform console
  const kind = readParam(searchParams.get('kind'), KIND_OPTIONS);
  const status = readParam(searchParams.get('status'), STATUS_OPTIONS);
  const attention = searchParams.get('attention') === 'true';
  const setFilter = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    debouncedQuery,
  } = useSearch({
    debounceMs: 300,
  });
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });
  const filters = useMemo(
    () => ({
      ...(kind ? { kind } : {}),
      ...(status ? { status } : {}),
      ...(attention ? { attention: true } : {}),
    }),
    [kind, status, attention]
  );
  const listQuery = usePlatformDomains({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedQuery || undefined,
      filters,
    },
  });
  useEffect(() => {
    if (listQuery.data) setTotalItems(listQuery.data.pagination.totalItems);
  }, [listQuery.data]);

  // ---- base-domain editor, only when the deployment does not own the value
  const environmentManaged = configQuery.data?.source === 'environment';
  const form = useForm<PlatformDomainFormData>({
    resolver: zodResolver(platformDomainSchema),
    values: { baseDomain: configQuery.data?.baseDomain ?? '' },
  });
  useServerValidation(form, updateConfig.error);
  useUnsavedChanges({
    isDirty: !environmentManaged && form.formState.isDirty,
    messageKey: 'website:platformDomain.unsavedChanges',
  });
  const onSubmit = async (data: PlatformDomainFormData) => {
    try {
      await updateConfig.mutateAsync(data);
      toast({ title: t('website:platformDomain.success') });
    } catch {
      toast({
        title: t('website:platformDomain.error'),
        variant: 'destructive',
      });
    }
  };

  const handleCheck = (row: PlatformDomainRow) =>
    checkDomain.mutate(row.academyId, {
      onSuccess: (result) =>
        toast({
          title: result.customDomain?.lastCheckError
            ? t(
                `website:domain.checkError.${result.customDomain.lastCheckError}.title`
              )
            : t('website:platformDomain.operations.checked', {
                status: t(
                  `website:domain.custom.status.${result.customDomain?.status ?? 'not_configured'}`
                ),
              }),
          variant: result.customDomain?.lastCheckError
            ? 'destructive'
            : undefined,
        }),
      onError: () =>
        toast({
          title: t('website:domain.custom.verifyError'),
          variant: 'destructive',
        }),
    });

  const columns = useMemo<ColumnDef<PlatformDomainRow, unknown>[]>(
    () => [
      {
        id: 'academy',
        header: t('website:platformDomain.operations.table.academy'),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium" dir="auto">
              {row.original.academyName}
            </p>
            <p className="truncate text-xs text-muted-foreground" dir="auto">
              {row.original.organizationName}
            </p>
          </div>
        ),
      },
      {
        id: 'subdomain',
        header: t('website:platformDomain.operations.table.subdomain'),
        cell: ({ row }) => (
          <span className="font-mono text-xs" dir="ltr">
            {row.original.subdomain?.fullHost ??
              row.original.subdomain?.subdomain ??
              '—'}
          </span>
        ),
      },
      {
        id: 'customDomain',
        header: t('website:platformDomain.operations.table.customDomain'),
        cell: ({ row }) =>
          row.original.customDomain?.hostname ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs" dir="ltr">
                {row.original.customDomain.hostname}
              </span>
              <StatusBadge
                labelKey={`website:domain.custom.status.${row.original.customDomain.status}`}
                tone={getDomainStatusTone(row.original.customDomain.status)}
              />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t('website:platformDomain.operations.table.noCustomDomain')}
            </span>
          ),
      },
      {
        id: 'canonical',
        header: t('website:platformDomain.operations.table.canonical'),
        cell: ({ row }) =>
          row.original.canonicalHost ? (
            <span className="font-mono text-xs" dir="ltr">
              {row.original.canonicalHost.host}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: 'https',
        header: t('website:platformDomain.operations.table.https'),
        cell: ({ row }) => {
          const custom = row.original.customDomain;
          if (!custom?.hostname)
            return <span className="text-xs text-muted-foreground">—</span>;
          if (custom.httpsReachable === undefined)
            return (
              <span className="text-xs text-muted-foreground">
                {t('website:platformDomain.operations.table.httpsUnknown')}
              </span>
            );
          return (
            <StatusBadge
              labelKey={
                custom.httpsReachable
                  ? 'website:platformDomain.operations.table.httpsReachable'
                  : 'website:platformDomain.operations.table.httpsUnreachable'
              }
              tone={custom.httpsReachable ? 'success' : 'destructive'}
            />
          );
        },
      },
      {
        id: 'lastChecked',
        header: t('website:platformDomain.operations.table.lastChecked'),
        cell: ({ row }) => {
          const custom = row.original.customDomain;
          if (!custom?.hostname)
            return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <div className="min-w-32 text-xs">
              <p className="whitespace-nowrap text-muted-foreground">
                {custom.lastCheckedAt
                  ? fmt.dateTime(custom.lastCheckedAt)
                  : t('website:domain.custom.neverChecked')}
              </p>
              {custom.lastCheckError ? (
                <p className="text-destructive">
                  {t(
                    `website:domain.checkError.${custom.lastCheckError}.title`
                  )}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'attention',
        header: t('website:platformDomain.operations.table.attention'),
        cell: ({ row }) =>
          row.original.needsAttention ? (
            <StatusBadge
              labelKey="website:platformDomain.operations.table.needsAttention"
              tone="warning"
            />
          ) : (
            <StatusBadge
              labelKey="website:platformDomain.operations.table.ok"
              tone="neutral"
            />
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {row.original.customDomain?.hostname ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={checkDomain.isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  handleCheck(row.original);
                }}
                aria-label={t('website:platformDomain.operations.checkNow')}
              >
                {checkDomain.isPending &&
                checkDomain.variables === row.original.academyId ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-3.5" aria-hidden />
                )}
                {t('website:platformDomain.operations.checkNow')}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, language, checkDomain.isPending, checkDomain.variables]
  );

  const readiness = readinessQuery.data;
  const overview = overviewQuery.data;
  const num = (value: number | undefined) =>
    value === undefined ? '—' : formatNumber(value, language);

  return (
    <PageContainer>
      <PageHeader
        titleKey="website:platformDomain.title"
        descriptionKey="website:platformDomain.subtitle"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void readinessQuery.refetch();
              void overviewQuery.refetch();
              void listQuery.refetch();
            }}
          >
            <RefreshCw className="size-4" strokeWidth={2} aria-hidden />
            {t('website:platformDomain.refresh')}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* ---------------------------------------------- readiness */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                {t('website:platformDomain.formTitle')}
                {configQuery.data ? (
                  <StatusBadge
                    labelKey={
                      configQuery.data.configured
                        ? 'website:platformDomain.status.configured'
                        : 'website:platformDomain.status.notConfigured'
                    }
                    tone={configQuery.data.configured ? 'success' : 'neutral'}
                  />
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {configQuery.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : configQuery.error || !configQuery.data ? (
                <ErrorState onRetry={() => configQuery.refetch()} />
              ) : environmentManaged ? (
                <>
                  <div className="flex items-center gap-2">
                    <Globe
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    <code className="text-sm font-medium" dir="ltr">
                      {configQuery.data.baseDomain}
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('website:platformDomain.managedByEnvironment')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('website:platformDomain.baseDomainHelp', {
                      baseDomain: configQuery.data.baseDomain,
                    })}
                  </p>
                </>
              ) : (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="baseDomain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('website:platformDomain.baseDomainLabel')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              dir="ltr"
                              placeholder="example.com"
                            />
                          </FormControl>
                          <FormDescription>
                            {t('website:platformDomain.databaseFallbackHelp')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateConfig.isPending}>
                        {updateConfig.isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Save
                            className="size-4"
                            strokeWidth={2}
                            aria-hidden
                          />
                        )}
                        {t('website:common.saveChanges')}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4" aria-hidden />
                {t('website:platformDomain.readiness.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {readinessQuery.isLoading ? (
                <Skeleton className="h-28 w-full" />
              ) : readinessQuery.error || !readiness ? (
                <ErrorState onRetry={() => readinessQuery.refetch()} />
              ) : (
                <>
                  <TruthRow
                    labelKey={
                      readiness.provider.connected
                        ? 'website:platformDomain.readiness.providerConnected'
                        : 'website:platformDomain.readiness.providerNotConnected'
                    }
                    ok={readiness.provider.connected}
                  />
                  <TruthRow
                    labelKey={
                      readiness.customHostnames.ready
                        ? 'website:platformDomain.readiness.customHostnamesReady'
                        : 'website:platformDomain.readiness.customHostnamesNotReady'
                    }
                    ok={readiness.customHostnames.ready}
                    detail={
                      readiness.customHostnames.fallbackOrigin
                        ? `${readiness.customHostnames.fallbackOrigin} · ${readiness.customHostnames.fallbackOriginStatus ?? ''}`
                        : undefined
                    }
                  />
                  <TruthRow
                    labelKey={
                      readiness.customHostnames.originSslModeCompatible ===
                      undefined
                        ? 'website:platformDomain.readiness.originSslUnknown'
                        : readiness.customHostnames.originSslModeCompatible
                          ? 'website:platformDomain.readiness.originSslCompatible'
                          : 'website:platformDomain.readiness.originSslIncompatible'
                    }
                    ok={readiness.customHostnames.originSslModeCompatible}
                    unknown={
                      readiness.customHostnames.originSslModeCompatible ===
                      undefined
                    }
                    detail={readiness.customHostnames.originSslMode}
                  />
                  <TruthRow
                    labelKey={
                      readiness.platformHttps.baseDomainReachable === undefined
                        ? 'website:platformDomain.readiness.platformHttpsUnknown'
                        : readiness.platformHttps.baseDomainReachable
                          ? 'website:platformDomain.readiness.platformHttpsReachable'
                          : 'website:platformDomain.readiness.platformHttpsUnreachable'
                    }
                    ok={readiness.platformHttps.baseDomainReachable}
                    unknown={
                      readiness.platformHttps.baseDomainReachable === undefined
                    }
                    detail={readiness.baseDomain}
                  />
                  <TruthRow
                    labelKey={
                      readiness.platformHttps.wildcardReachable === undefined
                        ? 'website:platformDomain.readiness.wildcardUnknown'
                        : readiness.platformHttps.wildcardReachable
                          ? 'website:platformDomain.readiness.wildcardReachable'
                          : 'website:platformDomain.readiness.wildcardUnreachable'
                    }
                    ok={readiness.platformHttps.wildcardReachable}
                    unknown={
                      readiness.platformHttps.wildcardReachable === undefined
                    }
                    detail={
                      readiness.baseDomain
                        ? `*.${readiness.baseDomain}`
                        : undefined
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('website:platformDomain.readiness.checkedAt', {
                      time: fmt.dateTime(readiness.checkedAt),
                    })}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---------------------------------------------- overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            labelKey="website:platformDomain.overview.academies"
            value={num(overview?.academies)}
            isLoading={overviewQuery.isLoading}
          />
          <MetricCard
            labelKey="website:platformDomain.overview.customConnected"
            value={num(overview?.customConnected)}
            isLoading={overviewQuery.isLoading}
          />
          <MetricCard
            labelKey="website:platformDomain.overview.customAwaiting"
            value={num(overview?.customAwaitingProvider)}
            isLoading={overviewQuery.isLoading}
          />
          <MetricCard
            labelKey="website:platformDomain.overview.needingAttention"
            value={num(overview?.needingAttention)}
            isLoading={overviewQuery.isLoading}
          />
        </div>

        {/* ---------------------------------------------- operations list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('website:platformDomain.operations.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="flex flex-wrap items-center gap-3 px-6 pt-2">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t(
                  'website:platformDomain.operations.searchPlaceholder'
                )}
                className="max-w-sm"
                aria-label={t(
                  'website:platformDomain.operations.searchPlaceholder'
                )}
              />
              <Select
                value={kind ?? ALL}
                onValueChange={(v) => setFilter('kind', v)}
              >
                <SelectTrigger
                  className="w-44"
                  aria-label={t(
                    'website:platformDomain.operations.filters.kind'
                  )}
                >
                  <SelectValue
                    placeholder={t(
                      'website:platformDomain.operations.filters.kind'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('website:platformDomain.operations.filters.allKinds')}
                  </SelectItem>
                  {KIND_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(
                        `website:platformDomain.operations.filters.kinds.${value}`
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status ?? ALL}
                onValueChange={(v) => setFilter('status', v)}
              >
                <SelectTrigger
                  className="w-48"
                  aria-label={t(
                    'website:platformDomain.operations.filters.status'
                  )}
                >
                  <SelectValue
                    placeholder={t(
                      'website:platformDomain.operations.filters.status'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('website:platformDomain.operations.filters.allStatuses')}
                  </SelectItem>
                  {STATUS_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`website:domain.custom.status.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch
                  id="platform-domains-attention"
                  checked={attention}
                  onCheckedChange={(checked) =>
                    setFilter('attention', checked ? 'true' : undefined)
                  }
                />
                <Label htmlFor="platform-domains-attention" className="text-sm">
                  {t('website:platformDomain.operations.filters.attentionOnly')}
                </Label>
              </div>
            </div>
            {listQuery.error ? (
              <div className="p-6">
                <ErrorState onRetry={() => listQuery.refetch()} />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={listQuery.data?.items ?? []}
                isLoading={listQuery.isLoading}
                pagination={pagination}
                emptyTitleKey="website:platformDomain.operations.emptyTitle"
                emptyDescriptionKey="website:platformDomain.operations.emptyDescription"
                getRowId={(row) => row.academyId}
                onRowSelect={(row) =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.platformAcademyDetail, {
                      academyId: row.academyId,
                    })
                  )
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
