/**
 * Pricing cards and the limits table, built from the catalog at render time
 * (DL-38: GET /public/plans is the only source). Nothing here hard-codes a
 * price, currency, trial length or limit; a missing catalog value renders
 * nothing rather than a guess.
 */
import { Check } from 'lucide-react';
import type { Plan } from '@/types/plan.types';
import { cn } from '@/shared/utils/class-name.utils';
import type { MarketingContent, MarketingPlanKey } from '../content/content.types';
import { canFill, fill, link, planTokens, splitAt, type Tokens } from '../lib/copy';
import { contactHref, formatNumber, registerHref, selfServePlans } from '../lib/site';

function isKnownPlan(content: MarketingContent, key: string): key is MarketingPlanKey {
  return key in content.pricing.plans;
}

/** Price inside its copy template; the <bdi> is what client/main.ts refreshes. */
function PriceLine({
  template,
  token,
  value,
  field,
  amount,
  currency,
}: {
  template: string;
  token: string;
  value: string;
  field: 'monthly' | 'yearly';
  amount?: number;
  currency?: string;
}) {
  const parts = splitAt(template, token) ?? ['', ` ${template}`];
  const muted = 'whitespace-nowrap text-sm text-muted-foreground';
  return (
    <>
      {parts[0].trim() ? <span className={muted}>{parts[0].trim()}</span> : null}
      <bdi className="text-4xl font-semibold tracking-tight text-foreground" data-price={field} data-amount={amount} data-currency={currency}>
        {value}
      </bdi>
      {parts[1].trim() ? <span className={muted}>{parts[1].trim()}</span> : null}
    </>
  );
}

function PlanCard({ plan, content }: { plan: Plan; content: MarketingContent }) {
  const lang = content.lang;
  const card = content.pricing.card;
  const toggle = content.pricing.billingToggle;
  const tokens = planTokens(content, plan);
  const meta = isKnownPlan(content, plan.key) ? content.pricing.plans[plan.key] : undefined;
  const recommended = meta?.recommended ?? false;
  const audience = meta ? fill(meta.audience, tokens) : undefined;
  const hasMonthly = 'price' in tokens;
  const hasYearly = 'yearlyPrice' in tokens;
  const yearlyNote = canFill(toggle.yearlyNote, tokens)
    ? fill(toggle.yearlyNote, tokens)
    : canFill(toggle.yearlySaving, tokens)
      ? fill(toggle.yearlySaving, tokens)
      : undefined;
  const trial = 'trialDuration' in tokens ? fill(card.trialLine, tokens) : fill(card.noTrialLine, tokens);
  const cta =
    'trialDuration' in tokens
      ? {
          href: registerHref(lang, plan.key),
          label: fill(card.ctaTrial, tokens),
          // A signed-in visitor already has an account: their plan page, not a second trial.
          signedIn: link(lang, content.chrome.ctas.managePlan, tokens),
        }
      : { href: contactHref(lang, 'sales', plan.key), label: fill(card.ctaTalk, tokens), signedIn: undefined };
  const ctaClass = cn('mk-btn mt-6 w-full', recommended ? 'mk-btn-primary' : 'mk-btn-secondary');
  const lines = (['students', 'academies', 'instructors', 'courses'] as const)
    .map((key) => tokens[key])
    .filter((line): line is string => typeof line === 'string');

  return (
    <li
      className={cn(
        'mk-card relative flex flex-col p-6 sm:p-7',
        recommended && 'border-2 border-primary shadow-[0_18px_48px_-24px_hsl(var(--brand-700)/0.45)]',
      )}
      data-plan={plan.key}
    >
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-foreground">{tokens.planName}</h3>
        {recommended ? (
          <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold text-brand-gold-foreground">
            {card.recommendedBadge}
          </span>
        ) : null}
      </div>
      {audience ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:min-h-[4.5rem]">{audience}</p> : null}

      <div className="mt-6 min-h-[5.5rem]">
        {hasMonthly ? (
          <p data-billing="monthly" className="flex flex-wrap items-baseline gap-x-1">
            <PriceLine
              template={card.perMonth}
              token="price"
              value={String(tokens.price)}
              field="monthly"
              amount={plan.pricing?.amount}
              currency={plan.pricing?.currency}
            />
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{card.priceUnavailable}</p>
        )}
        {hasYearly ? (
          <div data-billing="yearly">
            <p className="flex flex-wrap items-baseline gap-x-1">
              <PriceLine
                template={card.perYear}
                token="yearlyPrice"
                value={String(tokens.yearlyPrice)}
                field="yearly"
                amount={plan.pricing?.yearlyAmount}
                currency={plan.pricing?.currency}
              />
            </p>
            {canFill(card.yearlyEquivalent, tokens) ? (
              <p className="mt-1 text-sm text-muted-foreground">{fill(card.yearlyEquivalent, tokens)}</p>
            ) : null}
            {yearlyNote ? <p className="mt-1 text-sm font-medium text-brand-gold-text">{yearlyNote}</p> : null}
          </div>
        ) : null}
      </div>

      <a href={cta.href} data-mkt-cta="cta_pricing" data-signed-out-only={cta.signedIn ? '' : undefined} className={ctaClass}>
        {cta.label}
      </a>
      {cta.signedIn ? (
        <a href={cta.signedIn.href} data-signed-in-only="" className={ctaClass}>
          {cta.signedIn.label}
        </a>
      ) : null}
      {trial ? (
        // The trial offer goes with the trial button: a signed-in visitor gets "Manage my plan" instead.
        <p className="mt-3 text-center text-sm text-muted-foreground" data-signed-out-only={cta.signedIn ? '' : undefined}>
          {trial}
        </p>
      ) : null}

      {lines.length > 0 ? (
        <div className="mt-6 border-t border-border pt-6">
          <h4 className="sr-only">{card.limitsHeading}</h4>
          <ul className="space-y-3 text-sm">
            {lines.map((line) => (
              <li key={line} className="flex gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden strokeWidth={2.25} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function LargerCard({ content, tokens }: { content: MarketingContent; tokens: Tokens }) {
  const larger = content.pricing.larger;
  const cta = link(content.lang, larger.cta, tokens);
  return (
    <li className="mk-card flex flex-col bg-surface p-6 sm:p-7">
      <h3 className="text-xl font-semibold text-foreground">{fill(larger.title, tokens)}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{fill(larger.body, tokens)}</p>
      <a href={cta.href} data-mkt-cta="cta_c" className="mk-btn mk-btn-secondary mt-6 w-full">
        {cta.label}
      </a>
      <ul className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
        {larger.points.map((point) => (
          <li key={point} className="flex gap-3">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden strokeWidth={2.25} />
            <span>{fill(point, tokens)}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Billing toggle + cards. The toggle is two radios; CSS hides the other price. */
export function PricingCards({
  plans,
  content,
  tokens,
  idPrefix = 'billing',
}: {
  plans: readonly Plan[];
  content: MarketingContent;
  tokens: Tokens;
  idPrefix?: string;
}) {
  const list = selfServePlans(plans);
  const toggle = content.pricing.billingToggle;
  const hasYearly = list.some((plan) => plan.pricing?.yearlyAmount !== undefined);
  return (
    <div className="mk-billing" data-pricing>
      {hasYearly ? (
        <fieldset className="mt-10 flex justify-center">
          <legend className="sr-only">{toggle.label}</legend>
          <div className="mk-toggle">
            <input type="radio" name={idPrefix} id={`${idPrefix}-monthly`} value="monthly" defaultChecked className="sr-only" />
            <label htmlFor={`${idPrefix}-monthly`}>{toggle.monthly}</label>
            <input type="radio" name={idPrefix} id={`${idPrefix}-yearly`} value="yearly" className="sr-only" />
            <label htmlFor={`${idPrefix}-yearly`}>{toggle.yearly}</label>
          </div>
        </fieldset>
      ) : null}
      <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {list.map((plan) => (
          <PlanCard key={plan.key} plan={plan} content={content} />
        ))}
        <LargerCard content={content} tokens={tokens} />
      </ul>
    </div>
  );
}

/** Enforced limits only (no staff, recorded sessions or video storage: SPEC §C). */
export function LimitsTable({ plans, content }: { plans: readonly Plan[]; content: MarketingContent }) {
  const lang = content.lang;
  const t = content.pricing.limitsTable;
  const list = selfServePlans(plans);
  const rows = t.rows.filter((row) => list.some((plan) => plan.limits[row.key] !== undefined));
  const cell = (plan: Plan, key: (typeof t.rows)[number]['key']) => {
    const value = plan.limits[key];
    if (value === undefined) return t.notSet;
    if (value === 'unlimited') return t.unlimited;
    if (key === 'generalStorage') return fill(t.storageValue, { count: formatNumber(lang, value) });
    if (key === 'monthlyEmails') return fill(t.emailsValue, { count: formatNumber(lang, value) });
    return formatNumber(lang, value);
  };
  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground md:hidden">{t.scrollHint}</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border" role="region" aria-label={t.caption} tabIndex={0}>
        <table className="w-full min-w-[560px] border-collapse text-sm sm:text-base">
          <caption className="sr-only">{t.caption}</caption>
          <thead className="bg-surface">
            <tr>
              <th scope="col" className="p-4 text-start font-semibold">
                {t.limitColumn}
              </th>
              {list.map((plan) => (
                <th key={plan.key} scope="col" className="p-4 text-start font-semibold">
                  {planTokens(content, plan).planName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <th scope="row" className="p-4 text-start font-medium">
                  {row.label}
                  {row.hint ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{row.hint}</span> : null}
                </th>
                {list.map((plan) => (
                  <td key={plan.key} className="p-4 tabular-nums">
                    <bdi>{cell(plan, row.key)}</bdi>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
