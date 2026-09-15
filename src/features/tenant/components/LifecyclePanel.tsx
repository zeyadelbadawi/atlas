/**
 * The one place the Atlas lifecycle is explained to a customer.
 *
 * WHAT IT REPLACED, AND WHY THAT MATTERED. Every non-working state used to
 * render the same destructive "Your subscription has ended" alert, because
 * the backend gave them all the same `status: 'expired'`. A workspace
 * created thirty seconds ago was greeted as a lapsed account. This
 * component renders from the authoritative lifecycle instead, so each
 * state gets the message and the ACTION that actually fits it:
 *
 *   no_organization  -> create one; nothing else is possible yet
 *   no_plan          -> "your organization is ready, choose a plan"
 *   trialing         -> which plan, how long left, what happens next
 *   trial_expired    -> "continue with <the plan you trialed>"
 *   cancelled_active -> "your subscription ends on <date>" (still working)
 *   expired          -> "your subscription has expired" (a former payer)
 *   active           -> nothing at all
 *
 * TONE IS PART OF THE CORRECTNESS. `no_plan` and `trialing` are not
 * problems and are never rendered as destructive — a new customer being
 * shown a red alert about a subscription they never had is precisely the
 * bug this exists to end. Only a genuine lapse is destructive.
 *
 * IT IS NOT A WALL. Even in a blocked state the customer keeps seeing
 * their dashboard: "your trial ended" must never read as "your data is
 * gone", which would be false and the worst thing this product could
 * imply. Reads keep working server-side for the same reason.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Rocket,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { formatDate } from '@utils';
import { useSubscriptionLifecycleState } from '../hooks/useSubscriptionLifecycleState';
import type { LanguageCode, SubscriptionLifecycleState } from '@types';
import { resolvePlanName } from '../utils/plan-text.utils';

/**
 * How loudly to speak. Derived from the lifecycle, never from whether
 * access happens to be blocked — `no_plan` blocks gated features and is
 * still good news.
 */
type Tone = 'neutral' | 'info' | 'warning' | 'destructive';

const TONE_VARIANT: Record<Tone, 'default' | 'destructive'> = {
  neutral: 'default',
  info: 'default',
  warning: 'default',
  destructive: 'destructive',
};

/** Border/İcon accents per tone, using the existing token layer only. */
const TONE_CLASS: Record<Tone, string> = {
  neutral: '',
  info: 'border-info/40 [&>svg]:text-info',
  warning: 'border-warning/50 [&>svg]:text-warning',
  destructive: '',
};

interface PanelContent {
  readonly tone: Tone;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly primary?: { readonly label: string; readonly to: string };
  readonly secondary?: { readonly label: string; readonly to: string };
  /** Shown small, under the description — reassurance, dates, fine print. */
  readonly footnote?: string;
}

/**
 * Urgency for an active trial rises as the clock runs down, which is the
 * product requirement: a quiet indicator at 2+ days, a firmer reminder at
 * 1, and a clear call to act on the final day. Driven by the backend's own
 * day count so the UI cannot disagree with the date it displays.
 */
function trialTone(daysRemaining: number | undefined): Tone {
  if (daysRemaining === undefined) return 'info';
  if (daysRemaining <= 1) return 'warning';
  return 'info';
}

function buildContent(
  state: SubscriptionLifecycleState,
  t: (key: string, options?: Record<string, unknown>) => string,
  language: LanguageCode
): PanelContent | null {
  // P54 — the plan's bilingual catalog name, not its English `name`.
  const planName = state.plan ? resolvePlanName(state.plan, language) : '';

  switch (state.lifecycle) {
    case 'no_organization':
      return {
        tone: 'neutral',
        icon: Building2,
        title: t('tenant:lifecycle.noOrganization.title'),
        description: t('tenant:lifecycle.noOrganization.description'),
        primary: {
          label: t('tenant:lifecycle.noOrganization.action'),
          to: DASHBOARD_ROUTES.organizationCreate,
        },
      };

    case 'no_plan':
      return {
        tone: 'info',
        icon: Sparkles,
        title: t('tenant:lifecycle.noPlan.title'),
        description: t('tenant:lifecycle.noPlan.description'),
        primary: {
          label: state.trialAvailable
            ? t('tenant:lifecycle.noPlan.trialAction')
            : t('tenant:lifecycle.noPlan.action'),
          to: DASHBOARD_ROUTES.plans,
        },
        // Only promised when the account genuinely still has its trial.
        footnote: state.trialAvailable
          ? t('tenant:lifecycle.noPlan.noCardFootnote')
          : undefined,
      };

    case 'trialing': {
      const days = state.trialDaysRemaining;
      return {
        tone: trialTone(days),
        icon: Clock,
        title: t('tenant:lifecycle.trialing.title', { plan: planName }),
        description:
          days === undefined
            ? t('tenant:lifecycle.trialing.description', { plan: planName })
            : t('tenant:lifecycle.trialing.remaining', { count: days }),
        primary: {
          label: t('tenant:lifecycle.trialing.action', { plan: planName }),
          to: DASHBOARD_ROUTES.plans,
        },
        footnote: state.trialEndsAt
          ? t('tenant:lifecycle.trialing.endsOn', {
              date: formatDate(state.trialEndsAt, language, 'short'),
            })
          : undefined,
      };
    }

    case 'trial_expired':
      return {
        tone: 'warning',
        icon: Rocket,
        title: t('tenant:lifecycle.trialExpired.title'),
        // The plan is known, so the offer is specific: "continue with
        // Growth", not "start the pricing journey again from zero".
        description: planName
          ? t('tenant:lifecycle.trialExpired.description', { plan: planName })
          : t('tenant:lifecycle.trialExpired.descriptionGeneric'),
        primary: {
          label: planName
            ? t('tenant:lifecycle.trialExpired.continueWith', { plan: planName })
            : t('tenant:lifecycle.trialExpired.choosePlan'),
          to: DASHBOARD_ROUTES.plans,
        },
        secondary: {
          label: t('tenant:lifecycle.changePlan'),
          to: DASHBOARD_ROUTES.plans,
        },
        footnote: t('tenant:lifecycle.dataSafe'),
      };

    case 'cancelled_active':
      // NOT expired, and must never be shown as such: this customer paid
      // for time they still have.
      return {
        tone: 'warning',
        icon: Clock,
        title: t('tenant:lifecycle.cancelledActive.title'),
        description: state.currentPeriodEnd
          ? t('tenant:lifecycle.cancelledActive.description', {
              date: formatDate(state.currentPeriodEnd, language, 'short'),
            })
          : t('tenant:lifecycle.cancelledActive.descriptionNoDate'),
        primary: {
          label: t('tenant:lifecycle.cancelledActive.action'),
          to: DASHBOARD_ROUTES.tenantSubscription,
        },
      };

    case 'expired':
      return {
        tone: 'destructive',
        icon: AlertTriangle,
        title: t('tenant:lifecycle.expired.title'),
        description: t('tenant:lifecycle.expired.description'),
        primary: {
          label: t('tenant:lifecycle.expired.action'),
          to: DASHBOARD_ROUTES.plans,
        },
        secondary: {
          label: t('tenant:lifecycle.changePlan'),
          to: DASHBOARD_ROUTES.plans,
        },
        footnote: state.currentPeriodEnd
          ? t('tenant:lifecycle.expired.endedOn', {
              date: formatDate(state.currentPeriodEnd, language, 'short'),
            })
          : t('tenant:lifecycle.dataSafe'),
      };

    // A working subscription needs no banner at all. Silence is the
    // correct UI for "everything is fine" — see MASTER.md's restraint rule.
    case 'active':
    default:
      return null;
  }
}

export function LifecyclePanel(): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { state, isLoading } = useSubscriptionLifecycleState();

  // Never render on incomplete information: flashing "your subscription
  // ended" at a paying customer for one frame costs more trust than
  // showing nothing for one frame costs anything.
  if (isLoading || !state) return null;

  const content = buildContent(
    state,
    t as (key: string, options?: Record<string, unknown>) => string,
    i18n.language as LanguageCode
  );
  if (!content) return null;

  const Icon = content.icon;

  return (
    <Alert
      variant={TONE_VARIANT[content.tone]}
      className={TONE_CLASS[content.tone]}
      data-testid="lifecycle-panel"
      data-lifecycle={state.lifecycle}
    >
      <Icon className="size-4" aria-hidden />
      <AlertTitle>{content.title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{content.description}</p>

        {content.footnote ? (
          <p className="text-sm opacity-80">{content.footnote}</p>
        ) : null}

        {content.primary || content.secondary ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {content.primary ? (
              <Button size="sm" onClick={() => navigate(content.primary!.to)}>
                {content.primary.label}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Button>
            ) : null}
            {content.secondary ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(content.secondary!.to)}
              >
                {content.secondary.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

/**
 * A short, honest activation checklist — shown only while the customer is
 * genuinely still getting started.
 *
 * EVERY TICK IS REAL SYSTEM STATE. Nothing here is remembered locally or
 * marked complete optimistically: an account exists because the person is
 * signed in, an organization exists because the lifecycle says so, and a
 * plan exists because the subscription does. A checklist that invents its
 * own progress is worse than no checklist, because it teaches the
 * customer that the product's claims about their account are not
 * trustworthy.
 *
 * IT DISAPPEARS THE MOMENT IT IS DONE, and never appears for a customer
 * with a working plan — an experienced user is not made to walk through
 * an onboarding wizard they have already finished.
 */
export function GettingStartedChecklist(): JSX.Element | null {
  const { t } = useTranslation();
  const { state, isLoading } = useSubscriptionLifecycleState();

  if (isLoading || !state) return null;

  // Once there is a working plan or trial, activation is over.
  const isStillActivating =
    state.lifecycle === 'no_organization' || state.lifecycle === 'no_plan';
  if (!isStillActivating) return null;

  const hasOrganization = state.lifecycle !== 'no_organization';

  const steps: readonly { readonly key: string; readonly done: boolean }[] = [
    // Reaching this screen at all required an authenticated session.
    { key: 'account', done: true },
    { key: 'organization', done: hasOrganization },
    { key: 'plan', done: false },
    { key: 'academy', done: false },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-display text-sm font-semibold text-foreground">
        {t('tenant:lifecycle.gettingStarted.title')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('tenant:lifecycle.gettingStarted.description')}
      </p>

      <ol className="mt-4 space-y-2.5">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-2.5 text-sm">
            <CheckCircle2
              className={
                step.done
                  ? 'mt-0.5 size-4 shrink-0 text-primary'
                  : 'mt-0.5 size-4 shrink-0 text-muted-foreground/40'
              }
              strokeWidth={2}
              aria-hidden
            />
            <span
              className={step.done ? 'text-foreground' : 'text-muted-foreground'}
            >
              {t(`tenant:lifecycle.gettingStarted.steps.${step.key}`)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
