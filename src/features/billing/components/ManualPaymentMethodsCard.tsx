/**
 * Manual payment methods — Platform Owner (2 Oct 2026).
 *
 * Grew out of the Bank Transfer accounts card: one card on the Atlas
 * subscription payment provider page that manages every manual method
 * Organizations can pay their subscription with — Bank Transfer accounts,
 * Egyptian E-Wallets (Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay,
 * or another provider by name) and InstaPay — one tab each, the same list,
 * dialogs and Enable/Disable in each. All three feed the SAME checkout
 * and payment flow; nothing here is a separate payment journey.
 *
 * Until a method exists and is enabled it is not offered; each tab's
 * empty state says so, so an empty list never reads as "fine".
 *
 * These are the Platform Owner's own details, so they are shown in full.
 * A method is never deleted (existing payments keep its key and their own
 * copy of the instructions); it is disabled instead.
 *
 * PLACEHOLDERS. The database ships disabled placeholder rows for Vodafone
 * Cash, Orange Cash, Etisalat Cash and InstaPay (`placeholder: true`,
 * destinations like `PLACEHOLDER-NOT-A-WALLET`). They are flagged on the
 * row and summarized above the tabs; enabling one asks for confirmation,
 * because customers would be shown the placeholder details. Production
 * refuses it outright (409 `errors.paymentMethod.placeholderDetails`),
 * which is surfaced as the toast's description. Editing a placeholder's
 * details replaces it.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeftRight,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { toErrorsNamespaceKey } from '@utils';
import { isApiError } from '@api';
import type {
  ManualPaymentInstructions,
  ManualPaymentMethodType,
  PlatformPaymentMethod,
} from '@types';
import {
  usePlatformPaymentMethods,
  useUpdatePlatformPaymentMethod,
} from '../hooks';
import { localizedManualText } from '../utils/manual-payment-method.utils';
import { BankTransferMethodFormDialog } from './BankTransferMethodFormDialog';
import { WalletMethodFormDialog } from './WalletMethodFormDialog';
import { InstapayMethodFormDialog } from './InstapayMethodFormDialog';
import { ManualPaymentBrandChip } from './ManualPaymentBrandChip';
import { WARNING_ALERT_CLASS } from './ManualMethodFormFields';

/** Enough for every configured method on one page; the backend's maximum is higher. */

interface KindConfig {
  /** The `payments:` section holding this kind's copy. */
  readonly section: 'bankTransferMethods' | 'walletMethods' | 'instapayMethods';
  /** Prefix of every row/button test id (`bank-method-row-…`). */
  readonly testIdPrefix: string;
  readonly sectionTestId: string;
  readonly tabKey: string;
  readonly icon: LucideIcon;
}

const KINDS: Readonly<Record<ManualPaymentMethodType, KindConfig>> = {
  manual_bank_transfer: {
    section: 'bankTransferMethods',
    testIdPrefix: 'bank-method',
    // Kept from the original Bank Transfer card (browser journey J16).
    sectionTestId: 'bank-transfer-methods-card',
    tabKey: 'payments:manualMethods.tabs.bank',
    icon: Landmark,
  },
  manual_wallet_transfer: {
    section: 'walletMethods',
    testIdPrefix: 'wallet-method',
    sectionTestId: 'wallet-methods-section',
    tabKey: 'payments:manualMethods.tabs.wallet',
    icon: Wallet,
  },
  manual_instapay: {
    section: 'instapayMethods',
    testIdPrefix: 'instapay-method',
    sectionTestId: 'instapay-methods-section',
    tabKey: 'payments:manualMethods.tabs.instapay',
    icon: ArrowLeftRight,
  },
};

const KIND_ORDER: readonly ManualPaymentMethodType[] = [
  'manual_bank_transfer',
  'manual_wallet_transfer',
  'manual_instapay',
];

function isManualKind(type: string): type is ManualPaymentMethodType {
  return (KIND_ORDER as readonly string[]).includes(type);
}

/** One label/value pair of a row's details. */
function Detail({
  label,
  value,
  mono,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}): JSX.Element {
  return (
    <div className="flex min-w-0 gap-1.5">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd
        className={
          mono ? 'break-all font-mono text-foreground' : 'text-foreground'
        }
        dir={mono ? 'ltr' : 'auto'}
      >
        {value}
      </dd>
    </div>
  );
}

/** A saved method's details, as the Platform Owner entered them. */
function MethodDetails({
  details,
  testIdPrefix,
  methodId,
}: {
  readonly details: ManualPaymentInstructions;
  readonly testIdPrefix: string;
  readonly methodId: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const holder = localizedManualText(details, 'accountName', i18n.language);
  return (
    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {details.type === 'manual_bank_transfer' ? (
        <>
          <Detail label={t('payments:payment.bankName')} value={details.bankName} />
          <Detail
            label={t('payments:payment.accountNumber')}
            value={details.accountNumber}
            mono
          />
          {details.iban ? (
            <Detail label={t('payments:payment.iban')} value={details.iban} mono />
          ) : null}
        </>
      ) : details.type === 'manual_wallet_transfer' ? (
        <>
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">
              {t('payments:payment.walletProvider')}:
            </dt>
            <dd>
              <ManualPaymentBrandChip
                instructions={details}
                testId={`${testIdPrefix}-provider-${methodId}`}
              />
            </dd>
          </div>
          <Detail
            label={t('payments:payment.walletNumber')}
            value={details.walletNumber}
            mono
          />
          <Detail label={t('payments:payment.accountHolder')} value={holder.text} />
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">
              {t('payments:common.methodType.label')}:
            </dt>
            <dd>
              <ManualPaymentBrandChip instructions={details} />
            </dd>
          </div>
          <Detail
            label={t('payments:payment.instapayAddress')}
            value={details.instapayAddress}
            mono
          />
          <Detail label={t('payments:payment.accountHolder')} value={holder.text} />
        </>
      )}
    </dl>
  );
}

export function ManualPaymentMethodsCard(): JSX.Element {
  const { t, i18n } = useTranslation();
  const methodsQuery = usePlatformPaymentMethods();
  const updateMethod = useUpdatePlatformPaymentMethod();
  const [activeKind, setActiveKind] = useState<ManualPaymentMethodType>(
    'manual_bank_transfer'
  );
  // Which dialog is open. Kind and method are kept while it animates
  // closed, so its title does not flip.
  const [dialogKind, setDialogKind] = useState<ManualPaymentMethodType>(
    'manual_bank_transfer'
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PlatformPaymentMethod>();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmingMethod, setConfirmingMethod] =
    useState<PlatformPaymentMethod>();

  const methodsByKind = useMemo(() => {
    const grouped: Record<ManualPaymentMethodType, PlatformPaymentMethod[]> = {
      manual_bank_transfer: [],
      manual_wallet_transfer: [],
      manual_instapay: [],
    };
    for (const method of methodsQuery.data?.items ?? []) {
      if (isManualKind(method.type)) grouped[method.type].push(method);
    }
    return grouped;
  }, [methodsQuery.data]);

  const placeholderCount = useMemo(
    () =>
      (methodsQuery.data?.items ?? []).filter(
        (method) => method.manualInstructions?.placeholder
      ).length,
    [methodsQuery.data]
  );

  const openDialog = (
    kind: ManualPaymentMethodType,
    method?: PlatformPaymentMethod
  ) => {
    setDialogKind(kind);
    setEditingMethod(method);
    setDialogOpen(true);
  };

  const toggleEnabled = async (method: PlatformPaymentMethod) => {
    const enabling = !method.enabled;
    const section = isManualKind(method.type)
      ? KINDS[method.type].section
      : 'bankTransferMethods';
    setTogglingId(method.id);
    try {
      await updateMethod.mutateAsync({
        methodId: method.id,
        payload: { enabled: enabling },
      });
      toast({
        title: t(
          enabling
            ? `payments:${section}.enableSuccess`
            : `payments:${section}.disableSuccess`
        ),
      });
    } catch (error) {
      // e.g. 409 `errors.paymentMethod.placeholderDetails` in production.
      const key = isApiError(error)
        ? toErrorsNamespaceKey(error.messageKey)
        : undefined;
      toast({
        title: t(
          enabling
            ? `payments:${section}.enableError`
            : `payments:${section}.disableError`
        ),
        description: key && i18n.exists(key) ? t(key) : undefined,
        variant: 'destructive',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const onToggleEnabled = (method: PlatformPaymentMethod) => {
    // Enabling a placeholder would put fake details in front of paying
    // customers: ask first.
    if (!method.enabled && method.manualInstructions?.placeholder) {
      setConfirmingMethod(method);
      return;
    }
    void toggleEnabled(method);
  };

  const renderSection = (kind: ManualPaymentMethodType) => {
    const config = KINDS[kind];
    const Icon = config.icon;
    const methods = methodsByKind[kind];
    const prefix = config.testIdPrefix;
    return (
      <section
        data-testid={config.sectionTestId}
        aria-labelledby={`${prefix}-section-title`}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3
              id={`${prefix}-section-title`}
              className="flex items-center gap-2 font-display text-sm font-semibold text-foreground"
            >
              <Icon className="size-4" aria-hidden />
              {t(`payments:${config.section}.title`)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(`payments:${config.section}.description`)}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            data-testid={`${prefix}-add`}
            onClick={() => openDialog(kind)}
          >
            <Plus className="size-4" aria-hidden />
            {t(`payments:${config.section}.add`)}
          </Button>
        </div>

        {methods.length === 0 ? (
          <EmptyState
            icon={Icon}
            titleKey={`payments:${config.section}.emptyTitle`}
            descriptionKey={`payments:${config.section}.emptyDescription`}
          />
        ) : (
          <ul className="divide-y divide-border">
            {methods.map((method) => {
              const details =
                method.manualInstructions?.type === kind
                  ? method.manualInstructions
                  : undefined;
              const isPlaceholder = !!details?.placeholder;
              const isToggling = togglingId === method.id;
              return (
                <li
                  key={method.id}
                  data-testid={`${prefix}-row-${method.id}`}
                  className="flex flex-wrap items-start justify-between gap-3 py-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-foreground" dir="auto">
                      {method.displayName}
                    </p>
                    {details ? (
                      <MethodDetails
                        details={details}
                        testIdPrefix={prefix}
                        methodId={method.id}
                      />
                    ) : (
                      <p className="text-sm text-warning">
                        {t(`payments:${config.section}.missingDetails`)}
                      </p>
                    )}
                    {isPlaceholder ? (
                      <p
                        className="flex items-start gap-1.5 text-sm text-warning"
                        data-testid={`${prefix}-placeholder-${method.id}`}
                      >
                        <AlertTriangle
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden
                        />
                        {t('payments:manualMethods.placeholderRowNotice')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isPlaceholder ? (
                      <StatusBadge
                        labelKey="payments:manualMethods.placeholderBadge"
                        tone="warning"
                      />
                    ) : null}
                    <StatusBadge
                      labelKey={
                        method.enabled
                          ? 'payments:bankTransferMethods.enabledLabel'
                          : 'payments:bankTransferMethods.disabledLabel'
                      }
                      tone={method.enabled ? 'success' : 'neutral'}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid={`${prefix}-edit-${method.id}`}
                      onClick={() => openDialog(kind, method)}
                    >
                      <Pencil className="size-4" aria-hidden />
                      {t('common:actions.edit')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={method.enabled ? 'ghost' : 'default'}
                      data-testid={`${prefix}-toggle-${method.id}`}
                      disabled={isToggling}
                      onClick={() => onToggleEnabled(method)}
                    >
                      {isToggling ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      {t(
                        method.enabled
                          ? 'payments:bankTransferMethods.disable'
                          : 'payments:bankTransferMethods.enable'
                      )}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  };

  return (
    <Card data-testid="manual-payment-methods-card">
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          {t('payments:manualMethods.title')}
        </CardTitle>
        <CardDescription>{t('payments:manualMethods.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {methodsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : methodsQuery.error ? (
          <ErrorState onRetry={() => methodsQuery.refetch()} />
        ) : (
          <>
            {placeholderCount > 0 ? (
              <Alert
                className={WARNING_ALERT_CLASS}
                data-testid="manual-methods-placeholder-summary"
              >
                <AlertTriangle className="size-4" aria-hidden />
                <AlertDescription>
                  {t('payments:manualMethods.placeholderSummary', {
                    count: placeholderCount,
                  })}
                </AlertDescription>
              </Alert>
            ) : null}
            <Tabs
              value={activeKind}
              onValueChange={(value) =>
                setActiveKind(value as ManualPaymentMethodType)
              }
            >
              <TabsList className="h-auto flex-wrap justify-start">
                {KIND_ORDER.map((kind) => (
                  <TabsTrigger
                    key={kind}
                    value={kind}
                    data-testid={`manual-methods-tab-${KINDS[kind].testIdPrefix}`}
                  >
                    {t(KINDS[kind].tabKey)}
                    <span className="ms-1.5 tabular-nums" aria-hidden>
                      ({methodsByKind[kind].length})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {KIND_ORDER.map((kind) => (
                <TabsContent key={kind} value={kind} className="mt-4">
                  {renderSection(kind)}
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </CardContent>

      <BankTransferMethodFormDialog
        open={dialogOpen && dialogKind === 'manual_bank_transfer'}
        method={dialogKind === 'manual_bank_transfer' ? editingMethod : undefined}
        onOpenChange={setDialogOpen}
      />
      <WalletMethodFormDialog
        open={dialogOpen && dialogKind === 'manual_wallet_transfer'}
        method={
          dialogKind === 'manual_wallet_transfer' ? editingMethod : undefined
        }
        onOpenChange={setDialogOpen}
      />
      <InstapayMethodFormDialog
        open={dialogOpen && dialogKind === 'manual_instapay'}
        method={dialogKind === 'manual_instapay' ? editingMethod : undefined}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog
        open={confirmingMethod !== undefined}
        onOpenChange={(open) => {
          if (!open) setConfirmingMethod(undefined);
        }}
      >
        <AlertDialogContent data-testid="placeholder-enable-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('payments:manualMethods.enablePlaceholderTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('payments:manualMethods.enablePlaceholderDescription', {
                name: confirmingMethod?.displayName ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="placeholder-enable-confirm-action"
              onClick={() => {
                const method = confirmingMethod;
                setConfirmingMethod(undefined);
                if (method) void toggleEnabled(method);
              }}
            >
              {t('payments:manualMethods.enablePlaceholderConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
