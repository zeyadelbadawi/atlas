/**
 * `/pricing.md` — the catalog as Markdown for people and AI assistants
 * (SPEC §E.7, RDM L74 "`/pricing.md` 200 = API"). Generated from the same
 * `GET /public/plans` response the pricing page renders; no price, currency
 * or trial length is written here by hand (DL-38).
 */
import type { LimitValue, Plan, PlanResourceLimits } from '@/types/plan.types';

const LIMIT_ROWS: readonly {
  readonly key: keyof PlanResourceLimits;
  readonly label: string;
  readonly unit?: string;
}[] = [
  { key: 'academies', label: 'Academies' },
  { key: 'students', label: 'Students' },
  { key: 'instructors', label: 'Instructors' },
  { key: 'staff', label: 'Staff members' },
  { key: 'courses', label: 'Courses' },
  { key: 'videoStorage', label: 'Video storage', unit: 'GB' },
  { key: 'generalStorage', label: 'Files and images storage', unit: 'GB' },
  { key: 'recordedSessions', label: 'Recorded live sessions' },
  { key: 'monthlyEmails', label: 'Emails per academy per month' },
];

function groupDigits(value: number): string {
  const [whole, fraction] = String(value).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

function money(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined || !currency) return '—';
  return `${currency} ${groupDigits(amount)}`;
}

function limit(value: LimitValue | undefined, unit?: string): string {
  if (value === undefined) return '—';
  if (value === 'unlimited') return 'Unlimited';
  return unit ? `${groupDigits(value)} ${unit}` : groupDigits(value);
}

function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

/** Customer-facing plans in catalog order. */
export function publishedPlans(plans: readonly Plan[]): Plan[] {
  return plans
    .filter((plan) => plan.status === 'active')
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function planDisplayName(plan: Plan): string {
  return plan.nameLocalized?.en || plan.name;
}

function monthlyAndYearly(plan: Plan): {
  monthly?: number;
  yearly?: number;
} {
  const pricing = plan.pricing;
  if (!pricing) return {};
  if (pricing.billingCycle === 'yearly') return { yearly: pricing.amount };
  return { monthly: pricing.amount, yearly: pricing.yearlyAmount };
}

function trial(plan: Plan): string {
  return plan.trialEligible && plan.trialDurationDays
    ? `${plan.trialDurationDays} days`
    : 'No trial';
}

export function buildPricingMarkdown(input: {
  readonly plans: readonly Plan[];
  readonly siteUrl: string;
  readonly buildDate: string;
}): string {
  const plans = publishedPlans(input.plans);
  const origin = input.siteUrl.replace(/\/+$/, '');
  const lines: string[] = [
    '# Atlas pricing',
    '',
    `Plans and prices from the Atlas catalog as of ${input.buildDate}. Prices are per subscription; each plan is chosen by the number of students and academies it covers.`,
    '',
    `- Pricing page: ${origin}/pricing`,
    `- Arabic: ${origin}/ar/pricing`,
    `- Live catalog (JSON): ${origin}/api/v1/public/plans`,
    '',
    '## Plans',
    '',
  ];

  if (plans.length === 0) {
    lines.push('No plans are published right now.', '');
    return lines.join('\n');
  }

  lines.push('| Plan | Monthly | Yearly | Trial |', '| --- | --- | --- | --- |');
  for (const plan of plans) {
    const { monthly, yearly } = monthlyAndYearly(plan);
    const currency = plan.pricing?.currency;
    lines.push(
      `| ${cell(planDisplayName(plan))} | ${money(monthly, currency)} | ${money(yearly, currency)} | ${trial(plan)} |`
    );
  }
  lines.push('');

  const described = plans.filter(
    (plan) => plan.descriptionLocalized?.en || plan.description
  );
  if (described.length > 0) {
    for (const plan of described) {
      lines.push(
        `- **${cell(planDisplayName(plan))}**: ${cell(plan.descriptionLocalized?.en || plan.description || '')}`
      );
    }
    lines.push('');
  }

  lines.push(
    '## Limits',
    '',
    `| Limit | ${plans.map((plan) => cell(planDisplayName(plan))).join(' | ')} |`,
    `| --- | ${plans.map(() => '---').join(' | ')} |`
  );
  for (const row of LIMIT_ROWS) {
    if (plans.every((plan) => plan.limits[row.key] === undefined)) continue;
    lines.push(
      `| ${row.label} | ${plans.map((plan) => limit(plan.limits[row.key], row.unit)).join(' | ')} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}
