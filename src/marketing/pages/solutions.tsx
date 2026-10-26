/**
 * B3 — `/solutions/multi-academy` · `/ar/solutions/multi-academy`: one
 * organization running several academies. Each academy has its own
 * website, branding, team, courses and students; one owner account and one
 * subscription cover them all; the number of academies per plan is read
 * from the live catalog (never typed into the copy). Facts follow the help
 * center (DOC-ACD-007, DOC-ORG-012).
 */
import {
  Building2,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Minus,
  ReceiptText,
  UserCog,
  Wallet,
} from 'lucide-react';
import type { Plan } from '@/types/plan.types';
import {
  ButtonLink,
  Container,
  CtaBand,
  Faq,
  FeatureGrid,
  LearnMore,
  Section,
  SectionHeading,
  StepList,
  dirOf,
} from '../components/ui';
import { HeroArt } from '../components/hero-art';
import { canFill, fill, link, planTokens } from '../lib/copy';
import { contactHref, localePath, planName, selfServePlans } from '../lib/site';
import type { MarketingLang, MarketingPageDef } from '../types';
import {
  Shell,
  breadcrumb,
  faqPage,
  pageEnv,
  seoHead,
  webPage,
  type PageEnv,
} from './shared';

const SEPARATE_ICONS = [Globe, GraduationCap, UserCog, Wallet] as const;
const SHARED_ICONS = [Building2, ReceiptText, LayoutDashboard] as const;

/** Self-serve plans with their academies limit, as the catalog states it. */
export function academiesByPlan(
  env: PageEnv
): { key: string; name: string; academies: string }[] {
  return selfServePlans(env.ctx.plans as readonly Plan[])
    .map((plan) => ({
      key: plan.key,
      name: planName(plan, env.lang),
      academies: planTokens(env.content, plan).academies,
    }))
    .filter((row): row is { key: string; name: string; academies: string } =>
      Boolean(row.academies)
    );
}

function faqItems(env: PageEnv) {
  return env.content.multiAcademy.faq.items
    .filter(
      (qa) => canFill(qa.question, env.tokens) && canFill(qa.answer, env.tokens)
    )
    .map((qa) => ({
      question: fill(qa.question, env.tokens),
      answer: fill(qa.answer, env.tokens),
    }));
}

function MultiAcademyPage({ env }: { env: PageEnv }) {
  const { content, tokens, lang } = env;
  const m = content.multiAcademy;
  const dir = dirOf(lang);
  const primary = link(lang, m.hero.primaryCta, tokens);
  const secondary = link(lang, m.hero.secondaryCta, tokens);
  const rows = academiesByPlan(env);
  const faq = faqItems(env);
  return (
    <Shell env={env} path="/solutions/multi-academy" currentId="multi-academy">
      <section
        className="relative overflow-hidden border-b border-border"
        aria-labelledby="multi-title"
      >
        <div
          aria-hidden
          className="mk-hero-ground pointer-events-none absolute inset-0"
        />
        <Container className="relative grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <SectionHeading
              id="multi-title"
              level={1}
              eyebrow={
                m.hero.eyebrow ? fill(m.hero.eyebrow, tokens) : undefined
              }
              title={fill(m.hero.title, tokens)}
              lead={m.hero.lead ? fill(m.hero.lead, tokens) : undefined}
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink
                href={primary.href}
                signedIn={primary.signedIn}
                track="cta_t"
                arrow
                dir={dir}
              >
                {primary.label}
              </ButtonLink>
              <ButtonLink
                href={secondary.href}
                track="cta_c"
                variant="secondary"
              >
                {secondary.label}
              </ButtonLink>
            </div>
          </div>
          <div className="lg:col-span-5">
            <HeroArt
              name="multi-academy"
              className="mx-auto max-w-md lg:max-w-none"
            />
          </div>
        </Container>
      </section>

      <Section id="separate" labelledBy="multi-separate-title">
        <SectionHeading
          id="multi-separate-title"
          title={fill(m.separate.title, tokens)}
          lead={m.separate.lead ? fill(m.separate.lead, tokens) : undefined}
        />
        <FeatureGrid
          columns={4}
          items={m.separate.items.map((item, index) => {
            const Icon = SEPARATE_ICONS[index % SEPARATE_ICONS.length];
            return {
              icon: <Icon className="size-5" aria-hidden strokeWidth={1.75} />,
              title: fill(item.title, tokens),
              body: fill(item.body, tokens),
            };
          })}
        />
      </Section>

      <Section
        id="shared"
        labelledBy="multi-shared-title"
        className="border-t border-border"
        tinted
      >
        <SectionHeading
          id="multi-shared-title"
          title={fill(m.shared.title, tokens)}
          lead={m.shared.lead ? fill(m.shared.lead, tokens) : undefined}
        />
        <FeatureGrid
          columns={3}
          items={m.shared.items.map((item, index) => {
            const Icon = SHARED_ICONS[index % SHARED_ICONS.length];
            return {
              icon: <Icon className="size-5" aria-hidden strokeWidth={1.75} />,
              title: fill(item.title, tokens),
              body: fill(item.body, tokens),
            };
          })}
        />
      </Section>

      <Section
        id="plans"
        labelledBy="multi-plans-title"
        className="border-t border-border"
      >
        <SectionHeading
          id="multi-plans-title"
          title={fill(m.plans.title, tokens)}
          lead={m.plans.lead ? fill(m.plans.lead, tokens) : undefined}
        />
        {rows.length > 0 ? (
          <div className="mt-10 max-w-2xl overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-start">
              <caption className="sr-only">
                {fill(m.plans.caption, tokens)}
              </caption>
              <thead className="bg-surface text-sm">
                <tr>
                  <th
                    scope="col"
                    className="px-5 py-3 text-start font-semibold"
                  >
                    {m.plans.planColumn}
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-start font-semibold"
                  >
                    {m.plans.academiesColumn}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.key} data-plan={row.key}>
                    <th
                      scope="row"
                      className="px-5 py-4 text-start font-medium text-foreground"
                    >
                      {row.name}
                    </th>
                    <td className="px-5 py-4 text-muted-foreground">
                      <bdi>{row.academies}</bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-8 text-muted-foreground">
            {fill(m.plans.unavailable, tokens)}
          </p>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          <a
            href={contactHref(lang, 'sales')}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {fill(m.plans.note, tokens)}
          </a>
        </p>
        <p className="mt-2 text-sm">
          <a
            href={link(lang, content.chrome.ctas.seePricing, tokens).href}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {link(lang, content.chrome.ctas.seePricing, tokens).label}
          </a>
        </p>
      </Section>

      <Section
        id="steps"
        labelledBy="multi-steps-title"
        className="border-t border-border"
      >
        <SectionHeading
          id="multi-steps-title"
          title={fill(m.steps.title, tokens)}
        />
        <StepList
          lang={lang}
          steps={m.steps.items.map((item) => ({
            title: fill(item.title, tokens),
            body: fill(item.body, tokens),
          }))}
        />
        {m.steps.learnMore ? (
          <LearnMore lang={lang} value={m.steps.learnMore} tokens={tokens} />
        ) : null}
      </Section>

      <Section
        id="limits"
        labelledBy="multi-limits-title"
        className="border-t border-border"
      >
        <div className="max-w-3xl rounded-xl border border-border bg-surface p-6 sm:p-8">
          <SectionHeading
            id="multi-limits-title"
            title={fill(m.limits.title, tokens)}
          />
          <ul className="mt-6 space-y-3">
            {m.limits.items.map((item) => (
              <li key={item} className="flex gap-3">
                <Minus
                  className="mt-1 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                  strokeWidth={2.25}
                />
                <span className="leading-relaxed">{fill(item, tokens)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {faq.length > 0 ? (
        <Section
          id="faq"
          labelledBy="multi-faq-title"
          className="border-t border-border"
        >
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <SectionHeading
              id="multi-faq-title"
              title={fill(m.faq.title, tokens)}
            />
            <Faq items={faq} />
          </div>
        </Section>
      ) : null}

      <CtaBand
        title={fill(m.closing.title, tokens)}
        microcopy={
          m.closing.microcopy && tokens.trialDays
            ? fill(m.closing.microcopy, tokens)
            : undefined
        }
        primary={link(lang, m.closing.primaryCta, tokens)}
        secondary={
          m.closing.secondaryCta
            ? link(lang, m.closing.secondaryCta, tokens)
            : undefined
        }
        dir={dir}
      />
    </Shell>
  );
}

function multiAcademyPage(lang: MarketingLang): MarketingPageDef {
  const path = '/solutions/multi-academy';
  return {
    id: 'multi-academy',
    lang,
    path: localePath(lang, path),
    file:
      lang === 'ar'
        ? 'ar/solutions/multi-academy/index.html'
        : 'solutions/multi-academy/index.html',
    inSitemap: true,
    head: (ctx) => {
      const env = pageEnv(lang, ctx);
      return seoHead(env, 'multi-academy', path, [
        webPage(
          env,
          path,
          fill(env.content.seo['multi-academy'].ogTitle, env.tokens)
        ),
        breadcrumb(env, [
          { name: fill(env.content.multiAcademy.name, env.tokens), path },
        ]),
        faqPage(env, faqItems(env)),
      ]);
    },
    render: (ctx) => <MultiAcademyPage env={pageEnv(lang, ctx)} />,
  };
}

export const SOLUTION_PAGES = [
  multiAcademyPage('en'),
  multiAcademyPage('ar'),
] as const;
