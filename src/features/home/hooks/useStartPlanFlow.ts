/**
 * useStartPlanFlow hook.
 *
 * The one place the marketing site's "choose this plan" intent is routed
 * into the real, existing Atlas product flow — never a parallel checkout.
 * A visitor's intended plan is preserved in `sessionStorage` (cleared once
 * consumed) rather than lost across the sign-up/organization-creation
 * steps that must happen first; the actual subscription selection always
 * still goes through `PlansPage`/`PlanComparisonDialog` and the real
 * `POST /organizations/:id/checkouts` flow — this hook only decides which
 * of the three existing entry points a visitor lands on next.
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks';
import { AUTH_ROUTES, DASHBOARD_ROUTES } from '@app/routes/route-paths';

export const INTENDED_PLAN_STORAGE_KEY = 'atlas:intendedPlanKey';

export function useStartPlanFlow() {
  const navigate = useNavigate();
  const { isAuthenticated, organization } = useAuth();

  return (planKey: string): void => {
    if (!isAuthenticated) {
      sessionStorage.setItem(INTENDED_PLAN_STORAGE_KEY, planKey);
      navigate(`${AUTH_ROUTES.register}?plan=${encodeURIComponent(planKey)}`);
      return;
    }

    if (!organization) {
      sessionStorage.setItem(INTENDED_PLAN_STORAGE_KEY, planKey);
      navigate(DASHBOARD_ROUTES.organizationCreate);
      return;
    }

    navigate(DASHBOARD_ROUTES.plans);
  };
}
