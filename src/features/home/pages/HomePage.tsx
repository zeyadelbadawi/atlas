/**
 * Public home page.
 *
 * Communicates what Atlas is and routes a visitor into the product. It contains
 * no business logic: the module pages introduced by later prompts will provide
 * the substance behind these entry points.
 */
import { ArrowRight, Globe2, LayoutDashboard, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@components/layout";
import { AUTH_ROUTES, DASHBOARD_ROUTES } from "@app/routes/route-paths";
import { RISE_VARIANTS, createStaggerVariants } from "@motion";

/** Foundation capabilities surfaced on the landing page. */
const CAPABILITY_KEYS: readonly {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly titleKey: string;
  readonly descriptionKey: string;
}[] = [
  {
    id: "unified",
    icon: LayoutDashboard,
    titleKey: "home:capabilities.unified.title",
    descriptionKey: "home:capabilities.unified.description",
  },
  {
    id: "bilingual",
    icon: Globe2,
    titleKey: "home:capabilities.bilingual.title",
    descriptionKey: "home:capabilities.bilingual.description",
  },
  {
    id: "enterprise",
    icon: ShieldCheck,
    titleKey: "home:capabilities.enterprise.title",
    descriptionKey: "home:capabilities.enterprise.description",
  },
];

export default function HomePage(): JSX.Element {
  const { t } = useTranslation();
  const stagger = createStaggerVariants(CAPABILITY_KEYS.length);

  return (
    <PageContainer>
      <motion.section
        initial="hidden"
        animate="visible"
        variants={RISE_VARIANTS}
        className="space-y-6 py-8 text-center lg:py-16"
      >
        <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("home:hero.eyebrow")}
        </span>

        <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          {t("home:hero.title")}
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground">
          {t("home:hero.description")}
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to={DASHBOARD_ROUTES.root}>
              {t("home:hero.primaryAction")}
              <ArrowRight
                className="size-4 rtl:-scale-x-100"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to={AUTH_ROUTES.signIn}>
              {t("home:hero.secondaryAction")}
            </Link>
          </Button>
        </div>
      </motion.section>

      <motion.ul
        initial="hidden"
        animate="visible"
        variants={stagger.container}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {CAPABILITY_KEYS.map((capability) => (
          <motion.li
            key={capability.id}
            variants={stagger.item}
            className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-xs"
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <capability.icon
                className="size-5"
                strokeWidth={1.75}
                aria-hidden
              />
            </span>
            <h2 className="font-display text-base font-semibold text-foreground">
              {t(capability.titleKey)}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(capability.descriptionKey)}
            </p>
          </motion.li>
        ))}
      </motion.ul>
    </PageContainer>
  );
}
