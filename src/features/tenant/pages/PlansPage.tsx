/**
 * Plans Page (Phase P19; trial flow added in Phase 11).
 *
 * First-time plan browsing, reachable independent of an existing
 * subscription — `Reports/DEVELOPMENT_E2E_FLOW_AUDIT.md` P2 found the
 * only prior UI path into the plan catalog was `TenantSubscriptionPage`'s
 * comparison dialog, an "upgrade my existing plan" flow that assumes a
 * subscription already exists (and was itself unreachable for a
 * brand-new Client — see P0-2). Reuses `PlanComparisonDialog` verbatim
 * (no `currentPlanKey`, since there may be none yet) — never a second
 * plan-catalog rendering.
 *
 * A plan/subscription is always Organization-scoped (`POST
 * /organizations/:id/checkouts`; `CheckoutPage` itself reads the active
 * Organization) — there is no such thing as an org-less checkout. Before
 * this fix, a Client with no Organization yet could still click "Select
 * this plan" here and land straight on `RouteGuard`'s `tenant.payment.create`
 * check, which an org-less account can never satisfy (that permission only
 * ever comes from an organization membership) — a silent 403 dead end, not
 * a bug in the guard (which is correctly failing closed) but a gap in this
 * page for not anticipating the state it always runs in first for a
 * brand-new Client. Selection is now only offered once an Organization
 * exists; until then the catalog stays fully browsable (read-only, the
 * same mode Usage/Add-ons already use) with an inline notice guiding the
 * Client to create one first.
 *
 * PHASE 11 — THE FREE TRIAL IS OFFERED HERE, which is the whole point of
 * the change: this is where the customer is actually choosing, so it is
 * where "try Growth free for 3 days" belongs. It used to live on the
 * Subscription page and could only ever trial whichever plan happened to
 * be on the subscription row — for a new Organization, a placeholder
 * nobody had chosen. Two independent conditions decide whether the offer
 * appears, and BOTH come from the backend: the plan must be configured
 * trial-eligible (`plan.trialEligible`), and the account must still hold
 * its one lifetime trial (`lifecycle.trialAvailable`). Neither is
 * enforced here — `TrialRedemptionService` re-checks both and refuses
 * regardless of what this page rendered.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader } from '@components/layout';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAuth, useToast } from '@hooks';
import { formatDate } from '@utils';
import { usePlanCatalog } from '../hooks';
import { useStartTrial } from '../hooks/useSubscriptionLifecycle';
import { useSubscriptionLifecycleState } from '../hooks/useSubscriptionLifecycleState';
import { PlanComparisonDialog } from '../components/PlanComparisonDialog';
import { StartTrialDialog } from '../components/StartTrialDialog';
import type { LanguageCode, Plan } from '@types';

export default function PlansPage(): JSX.Element {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { toast } = useToast();
  const { organization } = useAuth();
  const planCatalogQuery = usePlanCatalog();
  const { state: lifecycle } = useSubscriptionLifecycleState();
  const startTrial = useStartTrial();

  const [trialPlan, setTrialPlan] = useState<Plan | null>(null);

  const hasOrganization = !!organization;

  /*
    The trial is offerable only when the account still has one AND the
    organization has not already started or had one. `no_plan` is the only
    lifecycle from which a trial can begin — which is exactly what the
    backend's own `startTrial` predicate says, so the button and the
    server agree rather than the UI offering something that will 409.
  */
  const canOfferTrial =
    hasOrganization &&
    lifecycle?.trialAvailable === true &&
    lifecycle.lifecycle === 'no_plan';

  const handleConfirmTrial = (): void => {
    if (!trialPlan) return;
    startTrial.mutate(
      { planId: trialPlan.id },
      {
        onSuccess: (result) => {
          setTrialPlan(null);
          if (result.started) {
            toast({
              title: t('tenant:trial.started'),
              description: result.trialEndsAt
                ? t('tenant:trial.startedDescription', {
                    date: formatDate(result.trialEndsAt, language, 'short'),
                  })
                : undefined,
            });
            navigate(DASHBOARD_ROUTES.root);
            return;
          }
          // A REFUSAL IS NOT AN ERROR — the backend answers 200 with
          // `started: false` because "you have already used your trial"
          // is an ordinary business outcome. Say something true rather
          // than a generic failure, and never reveal the anti-abuse
          // reasoning behind it.
          toast({
            variant: 'destructive',
            title: t('tenant:trial.alreadyUsedTitle'),
            description: t('tenant:trial.alreadyUsedDescription'),
          });
        },
        onError: () => {
          setTrialPlan(null);
          toast({
            variant: 'destructive',
            title: t('tenant:trial.failedTitle'),
            description: t('tenant:trial.failedDescription'),
          });
        },
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="tenant:plans.title"
        descriptionKey="tenant:plans.subtitle"
      />

      <PlanComparisonDialog
        open
        // Closing here means "go back to the dashboard" — there is no
        // underlying page content behind this dialog on a dedicated
        // Plans route, unlike `TenantSubscriptionPage`'s use of it.
        onOpenChange={(open) => {
          if (!open) navigate(DASHBOARD_ROUTES.root);
        }}
        plans={planCatalogQuery.data}
        isLoading={planCatalogQuery.isLoading}
        onSelectPlan={
          hasOrganization
            ? (plan) => {
                navigate(
                  buildPath(DASHBOARD_ROUTES.tenantBillingCheckout, {
                    targetType: 'plan_subscription',
                    targetKey: plan.key,
                  })
                );
              }
            : undefined
        }
        // Passing the handler is what makes the offer appear at all; WHICH
        // plans show it is decided per-plan by `plan.trialEligible` inside
        // the dialog, never by a plan-name check here.
        onStartTrial={canOfferTrial ? (plan) => setTrialPlan(plan) : undefined}
        notice={
          hasOrganization
            ? undefined
            : {
                titleKey: 'tenant:plans.needsOrganization.title',
                descriptionKey: 'tenant:plans.needsOrganization.description',
                actionLabelKey: 'tenant:plans.needsOrganization.action',
                onAction: () => navigate(DASHBOARD_ROUTES.organizationCreate),
              }
        }
      />

      <StartTrialDialog
        open={trialPlan !== null}
        onOpenChange={(open) => {
          if (!open) setTrialPlan(null);
        }}
        plan={trialPlan}
        isSubmitting={startTrial.isPending}
        onConfirm={handleConfirmTrial}
      />
    </PageContainer>
  );
}
