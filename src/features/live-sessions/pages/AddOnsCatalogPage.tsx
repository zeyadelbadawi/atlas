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
 */
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Boxes, Check, Loader2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useApiMutation, useApiQuery, useAuth } from '@hooks';
import { liveSessionKeys } from '@services/query';
import { addOnCatalogService } from '../services/AddOnCatalogService';
import type { AddOnAccessState, AddOnCatalogEntry } from '@types';
import type { ApiError } from '@api';

type Action = 'install' | 'enable' | 'disable' | 'uninstall';

export default function AddOnsCatalogPage(): JSX.Element {
  const { t } = useTranslation();
  const { organization } = useAuth();
  const queryClient = useQueryClient();
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

  if (catalogQuery.isLoading) {
    return (
      <PageContainer>
        <PageHeader titleKey="liveSessions:catalog.title" descriptionKey="liveSessions:catalog.subtitle" />
        <SectionLoader />
      </PageContainer>
    );
  }

  if (catalogQuery.isError) {
    return (
      <PageContainer>
        <PageHeader titleKey="liveSessions:catalog.title" descriptionKey="liveSessions:catalog.subtitle" />
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
                      <h2 className="font-display text-base font-semibold text-foreground">
                        {addOn.name}
                      </h2>
                      <Badge variant={enabled ? 'default' : 'outline'}>
                        {t(`liveSessions:catalog.state.${addOn.installStatus}`)}
                      </Badge>
                    </div>

                    {addOn.description ? (
                      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                        {addOn.description}
                      </p>
                    ) : null}

                    <p className="text-sm font-medium text-foreground">
                      {addOn.isFree
                        ? t('liveSessions:catalog.free')
                        : t('liveSessions:catalog.price', {
                            amount: addOn.pricing?.amount ?? 0,
                            currency: addOn.pricing?.currency ?? 'USD',
                          })}
                    </p>

                    {addOn.failureReason ? (
                      <p className="text-sm text-destructive">{addOn.failureReason}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {!installed ? (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            transition.mutate({ addOnKey: addOn.key, action: 'install' })
                          }
                        >
                          {busy ? (
                            <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
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
                              transition.mutate({
                                addOnKey: addOn.key,
                                action: enabled ? 'disable' : 'enable',
                              })
                            }
                          >
                            {enabled ? (
                              <Check className="me-2 size-4" aria-hidden />
                            ) : null}
                            {t(
                              enabled
                                ? 'liveSessions:catalog.disable'
                                : 'liveSessions:catalog.enable',
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              transition.mutate({
                                addOnKey: addOn.key,
                                action: 'uninstall',
                              })
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
