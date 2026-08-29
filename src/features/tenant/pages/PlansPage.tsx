/**
 * Plans Page (Phase P19).
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
 */
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAuth } from '@hooks';
import { usePlanCatalog } from '../hooks';
import { PlanComparisonDialog } from '../components/PlanComparisonDialog';

export default function PlansPage(): JSX.Element {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const planCatalogQuery = usePlanCatalog();
  const hasOrganization = !!organization;

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
    </PageContainer>
  );
}
