/**
 * Public Features / Solutions page — the platform marketing site's detailed
 * capability tour. Every capability listed is a real, shipped Atlas module; each
 * is translated from its technical shape into the business outcome it produces,
 * never a bare technical term.
 *
 * Design system: `design-system/atlas-marketing/MASTER.md`. Shares the exact
 * container, rhythm, heading scale and divider treatment as the home page via
 * the `MarketingSection` primitives — the page does not re-decide any of them.
 *
 * The nine groups are laid out as an editorial two-column *list* rather than a
 * card grid: each group is a horizontal band with its title on the text edge and
 * its items beside it. Nine equal boxes is the anti-pattern MASTER.md §10 names.
 *
 * Visual enhancement pass: three of the nine groups (academies, lms, security —
 * chosen because they anchor the page's strongest narrative beats: the platform
 * coming together, the real course hierarchy, and trust) get a supporting visual
 * alongside their items instead of running text-only. The other six keep the
 * plain band — not every section needs a picture, and MASTER.md's restraint rule
 * still applies away from the hero. Two of the three visuals are Magnific-
 * generated (on-brand, reused from the homepage's asset set — see MASTER.md
 * §12 addendum); the third (`lms`) is `CourseStructureFigure`, a real-token
 * diagram of the actual course hierarchy, preferred over a fabricated
 * screenshot for the same reason `PlatformStructureFigure` exists.
 */
import {
  BarChart3,
  BookOpen,
  Building2,
  Globe2,
  GraduationCap,
  Network,
  Palette,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  AUTH_ROUTES,
  DASHBOARD_ROUTES,
  PUBLIC_ROUTES,
} from '@app/routes/route-paths';
import { RISE_VARIANTS, createStaggerVariants } from '@motion';
import { useAuth } from '@hooks';
import {
  MarketingContainer,
  MarketingSection,
} from '../components/MarketingSection';
import { CourseStructureFigure } from '../components/CourseStructureFigure';
import platformConvergence from '../assets/platform-convergence.webp';
import secureShield from '../assets/secure-shield.webp';

interface FeatureGroup {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly items: readonly string[];
  /** Set only for the groups chosen for visual elevation — see header comment. */
  readonly visual?: 'platform-convergence' | 'course-structure' | 'secure-shield';
}

const FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    id: 'academies',
    icon: Building2,
    items: ['overview', 'provisioning', 'branding'],
    visual: 'platform-convergence',
  },
  {
    id: 'lms',
    icon: BookOpen,
    items: ['courses', 'quizzes', 'assignments'],
    visual: 'course-structure',
  },
  { id: 'people', icon: Users, items: ['students', 'enrollment', 'progress'] },
  {
    id: 'instructors',
    icon: GraduationCap,
    items: ['teaching', 'grading', 'scoped'],
  },
  { id: 'website', icon: Palette, items: ['builder', 'themes', 'cms'] },
  {
    id: 'domains',
    icon: Globe2,
    items: ['subdomains', 'customDomains', 'ssl'],
  },
  {
    id: 'organizations',
    icon: Network,
    items: ['multiAcademy', 'roles', 'billing'],
  },
  { id: 'analytics', icon: BarChart3, items: ['dashboards', 'reporting'] },
  {
    id: 'security',
    icon: ShieldCheck,
    items: ['isolation', 'auditLog', 'infrastructure'],
    visual: 'secure-shield',
  },
];

function GroupVisual({
  visual,
}: {
  readonly visual: NonNullable<FeatureGroup['visual']>;
}): JSX.Element {
  if (visual === 'course-structure') {
    return <CourseStructureFigure />;
  }

  const src = visual === 'platform-convergence' ? platformConvergence : secureShield;
  return (
    <img
      src={src}
      alt=""
      className="mx-auto h-auto w-full max-w-[220px]"
      aria-hidden
    />
  );
}

export default function FeaturesPage(): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const stagger = createStaggerVariants(FEATURE_GROUPS.length);

  const startHref = isAuthenticated
    ? DASHBOARD_ROUTES.root
    : AUTH_ROUTES.register;

  return (
    <>
      {/* ── Hero — asymmetric, this page's own visual identity: capability
          modules connecting into one platform, distinct from the homepage's
          full-bleed transformation video. ────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <span
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-surface to-background"
          aria-hidden
        />
        <MarketingContainer className="py-16 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={RISE_VARIANTS}
              className="flex flex-col gap-5 lg:col-span-7"
            >
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground rtl:tracking-normal">
                {t('features:page.eyebrow')}
              </span>
              <h1 className="max-w-[22ch] text-balance font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl rtl:leading-[1.5] rtl:tracking-normal">
                {t('features:page.title')}
              </h1>
              <p className="max-w-[58ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('features:page.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:col-span-5 lg:block"
            >
              <img
                src={platformConvergence}
                alt=""
                className="mx-auto h-auto w-full max-w-[320px]"
                aria-hidden
              />
            </motion.div>
          </div>
        </MarketingContainer>
      </section>

      {/* ── Capability groups — editorial bands, not a card grid ────────── */}
      <MarketingSection divided>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger.container}
        >
          {FEATURE_GROUPS.map((group, index) => (
            <motion.section
              key={group.id}
              variants={stagger.item}
              aria-labelledby={`features-group-${group.id}`}
              className={
                index === 0
                  ? 'pb-12 lg:pb-16'
                  : 'border-t border-border py-12 lg:py-16'
              }
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <group.icon
                    className="size-5"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <h2
                  id={`features-group-${group.id}`}
                  className="font-display text-xl font-semibold leading-tight tracking-[-0.01em] text-foreground sm:text-2xl"
                >
                  {t(`features:groups.${group.id}.title`)}
                </h2>
              </div>

              <div
                className={
                  group.visual
                    ? 'mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12'
                    : 'mt-6 grid gap-6 lg:grid-cols-12 lg:gap-16'
                }
              >
                {group.visual ? (
                  <div className="order-first lg:order-last lg:col-span-4">
                    <GroupVisual visual={group.visual} />
                  </div>
                ) : null}

                <ul
                  className={
                    group.visual
                      ? 'grid gap-6 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-2'
                      : 'grid gap-6 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-3'
                  }
                >
                  {group.items.map((item) => (
                    <li key={item} className="flex flex-col gap-1.5">
                      <h3 className="font-display text-sm font-semibold text-foreground">
                        {t(`features:groups.${group.id}.items.${item}.title`)}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t(
                          `features:groups.${group.id}.items.${item}.description`
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.section>
          ))}
        </motion.div>
      </MarketingSection>

      {/* ── Closing CTA — identical treatment to the home page ──────────── */}
      <MarketingSection compact>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={RISE_VARIANTS}
          className="flex flex-col items-start gap-6 rounded-xl border border-border bg-surface p-8 lg:flex-row lg:items-center lg:justify-between lg:p-12"
        >
          <h2 className="max-w-[24ch] text-balance font-display text-2xl font-semibold leading-[1.15] rtl:leading-[1.5] tracking-[-0.02em] rtl:tracking-normal text-foreground sm:text-3xl">
            {t('features:cta.title')}
          </h2>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to={startHref}>{t('features:cta.action')}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Link to={PUBLIC_ROUTES.pricing}>
                {t('features:cta.pricing')}
              </Link>
            </Button>
          </div>
        </motion.div>
      </MarketingSection>
    </>
  );
}
