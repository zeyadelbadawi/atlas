/**
 * Bank Transfer accounts — Platform Owner (2 Oct 2026).
 *
 * The bank accounts Organizations transfer their Atlas subscription
 * payments to. Until this card existed the catalog had no write path, so
 * production — which never runs the development seed — had no account and
 * Bank Transfer could not be offered at all. The empty state says exactly
 * that, so an empty list never reads as "Bank Transfer is fine".
 *
 * These are the Platform Owner's own details, so they are shown in full.
 * A method is never deleted (existing payments keep its key and their own
 * copy of the instructions); it is disabled instead.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, Loader2, Pencil, Plus } from 'lucide-react';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { toErrorsNamespaceKey } from '@utils';
import { isApiError } from '@api';
import type { PlatformPaymentMethod } from '@types';
import {
  usePlatformPaymentMethods,
  useUpdatePlatformPaymentMethod,
} from '../hooks';
import { BankTransferMethodFormDialog } from './BankTransferMethodFormDialog';

/** Enough for every configured method on one page; the backend's maximum is higher. */
const METHODS_QUERY = { pagination: { page: 1, pageSize: 100 } } as const;

export function BankTransferMethodsCard(): JSX.Element {
  const { t, i18n } = useTranslation();
  const methodsQuery = usePlatformPaymentMethods({ query: METHODS_QUERY });
  const updateMethod = useUpdatePlatformPaymentMethod();
  const [dialogOpen, setDialogOpen] = useState(false);
  // Kept while the dialog animates closed, so its title does not flip.
  const [editingMethod, setEditingMethod] = useState<PlatformPaymentMethod>();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const bankMethods = useMemo(
    () =>
      (methodsQuery.data?.items ?? []).filter(
        (method) => method.type === 'manual_bank_transfer'
      ),
    [methodsQuery.data]
  );

  const onToggleEnabled = async (method: PlatformPaymentMethod) => {
    const enabling = !method.enabled;
    setTogglingId(method.id);
    try {
      await updateMethod.mutateAsync({
        methodId: method.id,
        payload: { enabled: enabling },
      });
      toast({
        title: t(
          enabling
            ? 'payments:bankTransferMethods.enableSuccess'
            : 'payments:bankTransferMethods.disableSuccess'
        ),
      });
    } catch (error) {
      const key = isApiError(error)
        ? toErrorsNamespaceKey(error.messageKey)
        : undefined;
      toast({
        title: t(
          enabling
            ? 'payments:bankTransferMethods.enableError'
            : 'payments:bankTransferMethods.disableError'
        ),
        description: key && i18n.exists(key) ? t(key) : undefined,
        variant: 'destructive',
      });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Card data-testid="bank-transfer-methods-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="size-4" aria-hidden />
            {t('payments:bankTransferMethods.title')}
          </CardTitle>
          <CardDescription>
            {t('payments:bankTransferMethods.description')}
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          data-testid="bank-method-add"
          onClick={() => {
            setEditingMethod(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          {t('payments:bankTransferMethods.add')}
        </Button>
      </CardHeader>
      <CardContent>
        {methodsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : methodsQuery.error ? (
          <ErrorState onRetry={() => methodsQuery.refetch()} />
        ) : bankMethods.length === 0 ? (
          <EmptyState
            icon={Landmark}
            titleKey="payments:bankTransferMethods.emptyTitle"
            descriptionKey="payments:bankTransferMethods.emptyDescription"
          />
        ) : (
          <ul className="divide-y divide-border">
            {bankMethods.map((method) => {
              const details =
                method.manualInstructions?.type === 'manual_bank_transfer'
                  ? method.manualInstructions
                  : undefined;
              const isToggling = togglingId === method.id;
              return (
                <li
                  key={method.id}
                  data-testid={`bank-method-row-${method.id}`}
                  className="flex flex-wrap items-start justify-between gap-3 py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-foreground" dir="auto">
                      {method.displayName}
                    </p>
                    {details ? (
                      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        <div className="flex gap-1.5">
                          <dt className="text-muted-foreground">
                            {t('payments:payment.bankName')}:
                          </dt>
                          <dd className="text-foreground" dir="auto">
                            {details.bankName}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-muted-foreground">
                            {t('payments:payment.accountNumber')}:
                          </dt>
                          <dd className="font-mono text-foreground" dir="ltr">
                            {details.accountNumber}
                          </dd>
                        </div>
                        {details.iban ? (
                          <div className="flex gap-1.5">
                            <dt className="text-muted-foreground">
                              {t('payments:payment.iban')}:
                            </dt>
                            <dd className="font-mono text-foreground" dir="ltr">
                              {details.iban}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="text-sm text-warning">
                        {t('payments:bankTransferMethods.missingDetails')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                      data-testid={`bank-method-edit-${method.id}`}
                      onClick={() => {
                        setEditingMethod(method);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-4" aria-hidden />
                      {t('common:actions.edit')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={method.enabled ? 'ghost' : 'default'}
                      data-testid={`bank-method-toggle-${method.id}`}
                      disabled={isToggling}
                      onClick={() => void onToggleEnabled(method)}
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
      </CardContent>

      <BankTransferMethodFormDialog
        open={dialogOpen}
        method={editingMethod}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
