/**
 * The Add-ons store.
 *
 * WHAT THIS SCREEN HAS TO GET RIGHT: an add-on has four independent
 * states, and the customer needs to see which one they are in and what the
 * next action is. "Unavailable" with no explanation is the failure mode
 * this page exists to avoid — so every card names its own state and offers
 * exactly the action that moves it forward.
 *
 * Install and enable are genuinely different, and the UI keeps them
 * different: installing brings the add-on into the workspace, enabling is
 * the switch that makes it grant anything. A disabled add-on keeps its
 * configuration and its history — turning it off is not uninstalling.
 *
 * B5 (UX audit) — Disable and Uninstall ask first and say what happens,
 * as the backend does it (`AddOnsLifecycleController`): nothing is
 * deleted; the add-on stops granting its feature or extra limit; a limit
 * already used stays used but blocks adding more; and a PAID add-on that
 * is uninstalled has to be bought again (re-enabling it is refused).
 */
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Boxes, Loader2, ShoppingCart } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useApiMutation, useApiQuery, useAuth } from '@hooks';
import { useConfirmDialog } from '@app/providers';
import { localizedAddOnText } from '@features/tenant';
import { formatCurrency } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { liveSessionKeys } from '@services/query';
import { addOnCatalogService } from '../services/AddOnCatalogService';
import type { AddOnAccessState, AddOnCatalogEntry, LanguageCode } from '@types';
import type { ApiError } from '@api';

type Action = 'install' | 'enable' | 'disable' | 'uninstall';

/** The add-on's effect as the API sends it (a limit carries its key and amount). */
interface WireEffect {
  readonly type: 'limit' | 'feature';
  readonly featureKey?: string;
  readonly limitKey?: string;
  readonly amount?: number | 'unlimited';
}

/** What turning this add-on off takes away, in words. */
export function addOnLossText(t: TFunction, addOn: AddOnCatalogEntry): string {
  const effect = addOn.effect as WireEffect;
  if (
    effect.type === 'limit' &&
    effect.limitKey &&
    typeof effect.amount === 'number'
  ) {
    return t('liveSessions:catalog.confirm.limitLoss', {
      count: effect.amount,
      limit: t(`tenant:common.limits.${effect.limitKey}`),
    });
  }
  if (effect.type === 'feature' && effect.featureKey === 'liveSessions') {
    return t('liveSessions:catalog.confirm.liveSessionsLoss');
  }
  return t('liveSessions:catalog.confirm.genericLoss');
}

export default function AddOnsCatalogPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();
  const language = i18n.language as LanguageCode;
  const organizationId = organization?.id;

  const catalogQuery = useApiQuery<readonly AddOnCatalogEntry[], ApiError>({
    queryKey: [...liveSessionKeys.all, 'catalog', organizationId],
    queryFn: () => addOnCatalogService.getCatalog(organizationId!),
    enabled: Boolean(organizationId),
  });

  const transition = useApiMutation<
    AddOnAccessState,
    { readonly addOnKey: string; readonly action: Action },
    ApiError
  >({
    mutationFn: ({ addOnKey, action }) =>
      addOnCatalogService.transition(organizationId!, addOnKey, action),
    onSuccess: () => {
      // The catalog AND every Live Sessions surface read this state, so
      // both are invalidated — leaving the sidebar or a course builder
      // showing the previous entitlement would be worse than a refetch.
      void queryClient.invalidateQueries({ queryKey: liveSessionKeys.all });
    },
  });

  const confirmAndRun = async (
    addOn: AddOnCatalogEntry,
    action: 'disable' | 'uninstall'
  ): Promise<void> => {
    const name =
      localizedAddOnText(t, i18n, addOn.key, 'name', addOn.name) ?? addOn.name;
    const confirmed = await confirm({
      titleKey: `liveSessions:catalog.confirm.${action}Title`,
      descriptionKey: `liveSessions:catalog.confirm.${action}Description`,
      confirmLabelKey: `liveSessions:catalog.${action}`,
      cancelLabelKey: 'liveSessions:catalog.confirm.keep',
      intent: 'destructive',
      values: {
        name,
        loss: addOnLossText(t, addOn),
        rebuy:
          action === 'uninstall' && !addOn.isFree
            ? t('liveSessions:catalog.confirm.rebuy')
            : '',
      },
    });
    if (confirmed) transition.mutate({ addOnKey: addOn.key, action });
  };

  if (catalogQuery.isLoading) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="liveSessions:catalog.title"
          descriptionKey="liveSessions:catalog.subtitle"
        />
        <SectionLoader />
      </PageContainer>
    );
  }

  if (catalogQuery.isError) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="liveSessions:catalog.title"
          descriptionKey="liveSessions:catalog.subtitle"
        />
        <ErrorState onRetry={() => void catalogQuery.refetch()} />
      </PageContainer>
    );
  }

  const addOns = catalogQuery.data ?? [];

  return (
    <PageContainer>
      <PageHeader
        titleKey="liveSessions:catalog.title"
        descriptionKey="liveSessions:catalog.subtitle"
      />

      {addOns.length === 0 ? (
        <EmptyState
          icon={Boxes}
          titleKey="liveSessions:catalog.emptyTitle"
          descriptionKey="liveSessions:catalog.emptyDescription"
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addOns.map((addOn) => {
            const installed = addOn.installStatus !== 'uninstalled';
            const enabled = addOn.installStatus === 'enabled';
            const busy =
              transition.isPending ||
              addOn.installStatus === 'installing' ||
              addOn.installStatus === 'uninstalling';

            return (
              <li key={addOn.id}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2
                        className="font-display text-base font-semibold text-foreground"
                        dir="auto"
                      >
                        {localizedAddOnText(
                          t,
                          i18n,
                          addOn.key,
                          'name',
                          addOn.name
                        )}
                      </h2>
                      <Badge
                        variant={
                          addOn.comingSoon
                            ? 'secondary'
                            : enabled
                              ? 'default'
                              : 'outline'
                        }
                      >
                        {addOn.comingSoon
                          ? t('liveSessions:catalog.comingSoon')
                          : t(
                              `liveSessions:catalog.state.${addOn.installStatus}`
                            )}
                      </Badge>
                    </div>

                    {addOn.description ? (
                      <p
                        className="flex-1 text-sm leading-relaxed text-muted-foreground"
                        dir="auto"
                      >
                        {localizedAddOnText(
                          t,
                          i18n,
                          addOn.key,
                          'description',
                          addOn.description
                        )}
                      </p>
                    ) : null}

                    {/* B0-LIV-02 — a "coming soon" add-on cannot be bought, so it
                        shows no price; a priced add-on without an amount or a
                        currency shows none rather than an invented one. */}
                    {addOn.comingSoon ? null : addOn.isFree ? (
                      <p className="text-sm font-medium text-foreground">
                        {t('liveSessions:catalog.free')}
                      </p>
                    ) : addOn.pricing?.currency &&
                      addOn.pricing.amount !== undefined ? (
                      <p
                        className="text-sm font-medium text-foreground"
                        data-testid={`add-on-price-${addOn.key}`}
                      >
                        {/* B5 (UX audit) — the price in its own currency,
                            formatted as money ("US$15.00"), so a USD add-on
                            beside EGP plans reads as USD, not as a bare 15. */}
                        {t(
                          (addOn.pricing as { billingCycle?: string })
                            .billingCycle === 'yearly'
                            ? 'liveSessions:catalog.priceYearly'
                            : 'liveSessions:catalog.priceMonthly',
                          {
                            price: formatCurrency(
                              addOn.pricing.amount,
                              language,
                              addOn.pricing.currency,
                              { currencyDisplay: 'code' }
                            ),
                          }
                        )}
                      </p>
                    ) : null}

                    {addOn.failureReason ? (
                      <p className="text-sm text-destructive">
                        {addOn.failureReason}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {addOn.comingSoon ? (
                        <p className="text-sm text-muted-foreground">
                          {t('liveSessions:catalog.comingSoonNote')}
                        </p>
                      ) : !installed && !addOn.isFree ? (
                        // CF-23 — a priced add-on is bought through checkout
                        // (proof → approval activates it); the API refuses a
                        // direct install, so the button goes to checkout.
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            navigate(
                              buildPath(
                                DASHBOARD_ROUTES.tenantBillingCheckout,
                                {
                                  targetType: 'add_on',
                                  targetKey: addOn.key,
                                }
                              )
                            )
                          }
                        >
                          <ShoppingCart className="me-2 size-4" aria-hidden />
                          {t('liveSessions:catalog.purchase')}
                        </Button>
                      ) : !installed ? (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            transition.mutate({
                              addOnKey: addOn.key,
                              action: 'install',
                            })
                          }
                        >
                          {busy ? (
                            <Loader2
                              className="me-2 size-4 animate-spin"
                              aria-hidden
                            />
                          ) : null}
                          {t('liveSessions:catalog.install')}
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant={enabled ? 'outline' : 'default'}
                            disabled={busy}
                            onClick={() =>
                              enabled
                                ? void confirmAndRun(addOn, 'disable')
                                : transition.mutate({
                                    addOnKey: addOn.key,
                                    action: 'enable',
                                  })
                            }
                          >
                            {t(
                              enabled
                                ? 'liveSessions:catalog.disable'
                                : 'liveSessions:catalog.enable'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              void confirmAndRun(addOn, 'uninstall')
                            }
                          >
                            {t('liveSessions:catalog.uninstall')}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Said plainly, because "disable" sounding destructive
                        is what makes customers avoid a reversible action. */}
                    {installed ? (
                      <p className="text-xs text-muted-foreground">
                        {t('liveSessions:catalog.uninstallNote')}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
