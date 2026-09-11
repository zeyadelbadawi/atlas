/**
 * What a tenant sees once their subscription has lapsed.
 *
 * A BANNER, NOT A WALL. The temptation is to replace the dashboard with a
 * paywall, and it is the wrong call: the customer needs to SEE that their
 * academies, courses and students are all still there, or "your
 * subscription ended" reads as "your data is gone" — which is false, and
 * the single worst thing this product could imply. Reads keep working
 * server-side for the same reason; this explains why the writes do not.
 *
 * IT SAYS WHAT LAPSED AND WHEN, from the real subscription — the plan name,
 * the status, the date the trial or period ended. No invented renewal
 * dates, no invented amounts: the price lives on the plan the customer is
 * about to choose, and it comes from the catalog when they get there.
 *
 * ONE ACTION, AND IT IS THE USEFUL ONE. "Choose a plan" goes to the plan
 * catalog, which is reachable while expired precisely so this works — the
 * backend allowlists checkout, payment and support for the same reason.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { formatDate } from '@utils';
import { useSubscriptionAccess } from '../hooks/useSubscriptionAccess';
import type { LanguageCode } from '@types';

export function SubscriptionRequiredBanner(): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isBlocked, reason, subscription } = useSubscriptionAccess();

  if (!isBlocked) return null;

  // Whichever date actually ended — the trial's, or the paid period's.
  // Absent rather than guessed when neither is recorded.
  const endedAt =
    reason === 'trial_ended'
      ? subscription?.trialEndsAt
      : subscription?.currentPeriodEnd;

  return (
    <Alert variant="destructive" data-testid="subscription-required-banner">
      <AlertTriangle className="size-4" aria-hidden />
      <AlertTitle>
        {reason === 'trial_ended'
          ? t('tenant:subscriptionRequired.trialTitle')
          : t('tenant:subscriptionRequired.title')}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {reason === 'trial_ended'
            ? t('tenant:subscriptionRequired.trialDescription')
            : t('tenant:subscriptionRequired.description')}
        </p>

        {/* Reassurance, and it is true: nothing was deleted. */}
        <p className="text-sm">{t('tenant:subscriptionRequired.dataSafe')}</p>

        {subscription || endedAt ? (
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            {subscription ? (
              <div className="flex gap-2">
                <dt className="opacity-80">
                  {t('tenant:subscriptionRequired.planLabel')}
                </dt>
                <dd className="font-medium">{subscription.plan.name}</dd>
              </div>
            ) : null}
            {endedAt ? (
              <div className="flex gap-2">
                <dt className="opacity-80">
                  {t('tenant:subscriptionRequired.endedLabel')}
                </dt>
                <dd className="font-medium">
                  {formatDate(endedAt, i18n.language as LanguageCode)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <Button size="sm" onClick={() => navigate(DASHBOARD_ROUTES.plans)}>
          {t('tenant:subscriptionRequired.choosePlan')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
