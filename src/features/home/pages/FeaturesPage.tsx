/**
 * Public Features / Solutions page — the platform marketing site's
 * detailed capability tour. Every capability listed is a real, shipped
 * Atlas module; each is translated from its technical shape into the
 * business outcome it produces, never a bare technical term.
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
import { PageContainer, PageHeader } from '@components/layout';
import {
  AUTH_ROUTES,
  DASHBOARD_ROUTES,
  PUBLIC_ROUTES,
} from '@app/routes/route-paths';
import { createStaggerVariants } from '@motion';
import { useAuth } from '@hooks';

interface FeatureGroup {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly items: readonly string[];
}

const FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    id: 'academies',
    icon: Building2,
    items: ['overview', 'provisioning', 'branding'],
  },
  { id: 'lms', icon: BookOpen, items: ['courses', 'quizzes', 'assignments'] },
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
  },
];

export default function FeaturesPage(): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const stagger = createStaggerVariants(FEATURE_GROUPS.length);

  return (
    <PageContainer>
      <PageHeader
        titleKey="features:page.title"
        descriptionKey="features:page.description"
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger.container}
        className="grid gap-6 py-4 sm:grid-cols-2"
      >
        {FEATURE_GROUPS.map((group) => (
          <motion.section
            key={group.id}
            variants={stagger.item}
            className="space-y-4 rounded-lg border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <group.icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t(`features:groups.${group.id}.title`)}
              </h2>
            </div>

            <ul className="space-y-3">
              {group.items.map((item) => (
                <li key={item} className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t(`features:groups.${group.id}.items.${item}.title`)}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(`features:groups.${group.id}.items.${item}.description`)}
                  </p>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </motion.div>

      <section className="mx-auto max-w-xl space-y-4 py-12 text-center">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          {t('features:cta.title')}
        </h2>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link
              to={
                isAuthenticated ? DASHBOARD_ROUTES.root : AUTH_ROUTES.register
              }
            >
              {t('features:cta.action')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to={PUBLIC_ROUTES.pricing}>{t('features:cta.pricing')}</Link>
          </Button>
        </div>
      </section>
    </PageContainer>
  );
}
