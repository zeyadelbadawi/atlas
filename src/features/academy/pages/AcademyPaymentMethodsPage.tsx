/**
 * Academy Payment Methods — the manual methods THIS academy accepts from its
 * learners (Academy Manual Payments): bank transfer, InstaPay and mobile
 * wallet, each with its own details and on/off switch. Academy A can take
 * bank transfer and InstaPay while Academy B takes a wallet only.
 *
 * Organization Owner only, like Orders and Revenue beside it: the backend
 * answers 403 to anyone else, rendered as one permission state.
 *
 *   - A method cannot be switched on before it has details: switching on an
 *     unconfigured method opens its form instead.
 *   - Switching off hides it from checkout at once; payments already made
 *     keep the details they were made with.
 *   - Status is never colour alone: every card says Accepting / Off / Not
 *     set up in words, beside the switch.
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, ShieldOff, Wallet } from 'lucide-react';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@app/providers';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { ManualPaymentInstructionsPanel } from '@features/billing';
import type { AcademyPaymentMethod, AcademyPaymentMethodType } from '@types';
import {
  useAcademyPaymentMethods,
  useSaveAcademyPaymentMethod,
} from '../hooks';
import { ACADEMY_PAYMENT_METHOD_META } from '../components/academy-payment-method.meta';
import { AcademyPaymentMethodDialog } from '../components/AcademyPaymentMethodDialog';

export default function AcademyPaymentMethodsPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId = '' } = useParams<{ academyId: string }>();
  const { notifySuccess, notifyError } = useToast();
  const methods = useAcademyPaymentMethods(academyId);
  const save = useSaveAcademyPaymentMethod(academyId);
  const [editing, setEditing] = useState<AcademyPaymentMethodType | null>(null);
  const [switching, setSwitching] = useState<AcademyPaymentMethodType | null>(
    null
  );

  const header = (
    <PageHeader
      titleKey="payments:academyMethods.title"
      descriptionKey="payments:academyMethods.description"
    />
  );

  if (!academyId) {
    return (
      <PageContainer>
        {header}
        <SectionCard>
          <EmptyState
            icon={Wallet}
            titleKey="payments:academyOrders.noAcademy.title"
            descriptionKey="payments:academyOrders.noAcademy.description"
          />
        </SectionCard>
      </PageContainer>
    );
  }

  if (methods.error?.kind === 'forbidden') {
    return (
      <PageContainer>
        {header}
        <SectionCard>
          <EmptyState
            icon={ShieldOff}
            titleKey="payments:academyMethods.forbidden.title"
            descriptionKey="payments:academyMethods.forbidden.description"
          />
        </SectionCard>
      </PageContainer>
    );
  }

  const byType = new Map<AcademyPaymentMethodType, AcademyPaymentMethod>(
    (methods.data ?? []).map((method) => [method.type, method])
  );
  const anyEnabled = (methods.data ?? []).some((method) => method.enabled);

  const toggle = async (type: AcademyPaymentMethodType, next: boolean) => {
    const saved = byType.get(type);
    if (!saved) {
      // Nothing to switch on yet: set it up first.
      if (next) setEditing(type);
      return;
    }
    setSwitching(type);
    try {
      await save.mutateAsync({ type, enabled: next });
      notifySuccess(
        next
          ? 'payments:academyMethods.enabledToast'
          : 'payments:academyMethods.disabledToast',
        undefined,
        { method: t(`payments:common.methodType.${type}`) }
      );
    } catch {
      notifyError('payments:academyMethods.saveError');
    } finally {
      setSwitching(null);
    }
  };

  return (
    <PageContainer>
      {header}

      <Alert className="mb-4">
        <Info className="size-4" aria-hidden />
        <AlertTitle>{t('payments:academyMethods.howItWorks.title')}</AlertTitle>
        <AlertDescription>
          {t('payments:academyMethods.howItWorks.description')}{' '}
          <Link
            className="font-medium underline underline-offset-2"
            to={buildPath(DASHBOARD_ROUTES.academyPayments, { academyId })}
          >
            {t('payments:academyMethods.howItWorks.reviewLink')}
          </Link>
        </AlertDescription>
      </Alert>

      {methods.data && !anyEnabled ? (
        <Alert
          className="mb-4 border-warning/50 bg-warning-surface text-foreground [&>svg]:text-warning"
          data-testid="academy-methods-none-enabled"
        >
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>
            {t('payments:academyMethods.noneEnabled.title')}
          </AlertTitle>
          <AlertDescription>
            {t('payments:academyMethods.noneEnabled.description')}
          </AlertDescription>
        </Alert>
      ) : null}

      {methods.error ? (
        <ErrorState
          kind={methods.error.kind}
          requestId={methods.error.requestId}
          onRetry={() => void methods.refetch()}
        />
      ) : methods.isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <ul className="space-y-4" role="list">
          {ACADEMY_PAYMENT_METHOD_META.map((meta) => {
            const saved = byType.get(meta.type);
            const name = t(meta.labelKey);
            const switchId = `${meta.testId}-switch`;
            const status = !saved
              ? { key: 'notSetUp', tone: 'neutral' as const }
              : saved.enabled
                ? { key: 'enabled', tone: 'success' as const }
                : { key: 'disabled', tone: 'warning' as const };
            const Icon = meta.icon;
            return (
              <li key={meta.type} data-testid={meta.testId}>
                <section
                  aria-labelledby={`${meta.testId}-title`}
                  className="rounded-lg border border-border bg-card shadow-xs"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            id={`${meta.testId}-title`}
                            className="text-base font-semibold text-foreground"
                          >
                            {name}
                          </h2>
                          <StatusBadge
                            labelKey={`payments:academyMethods.status.${status.key}`}
                            tone={status.tone}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t(meta.descriptionKey)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <label
                        htmlFor={switchId}
                        className="text-sm font-medium text-foreground"
                      >
                        {t('payments:academyMethods.acceptLabel')}
                      </label>
                      <Switch
                        id={switchId}
                        checked={saved?.enabled ?? false}
                        disabled={switching === meta.type}
                        onCheckedChange={(next) => void toggle(meta.type, next)}
                        aria-describedby={`${meta.testId}-title`}
                        data-testid={`${meta.testId}-toggle`}
                      />
                    </div>
                  </div>

                  <div className="border-t border-border p-4">
                    {saved ? (
                      <div className="space-y-3">
                        <ManualPaymentInstructionsPanel
                          instructions={saved.instructions}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 sm:min-h-9"
                          onClick={() => setEditing(meta.type)}
                          aria-label={t('payments:academyMethods.editFor', {
                            method: name,
                          })}
                          data-testid={`${meta.testId}-edit`}
                        >
                          {t('payments:academyMethods.edit')}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                          {t('payments:academyMethods.notSetUpHint')}
                        </p>
                        <Button
                          type="button"
                          className="min-h-11 sm:min-h-9"
                          onClick={() => setEditing(meta.type)}
                          aria-label={t('payments:academyMethods.setUpFor', {
                            method: name,
                          })}
                          data-testid={`${meta.testId}-setup`}
                        >
                          {t('payments:academyMethods.setUp')}
                        </Button>
                      </div>
                    )}
                  </div>
                </section>
              </li>
            );
          })}
        </ul>
      )}

      <AcademyPaymentMethodDialog
        key={editing ?? 'closed'}
        academyId={academyId}
        type={editing}
        method={editing ? byType.get(editing) : undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </PageContainer>
  );
}
