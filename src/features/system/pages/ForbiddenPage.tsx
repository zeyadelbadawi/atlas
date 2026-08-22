/**
 * Forbidden page.
 *
 * A permission failure is distinct from a missing page: the resource exists, but
 * this account may not see it. Saying so — and pointing to the administrator —
 * is more useful than a generic error.
 */
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@components/layout";
import { PUBLIC_ROUTES } from "@app/routes/route-paths";

export default function ForbiddenPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-pill bg-warning-surface text-warning">
          <ShieldAlert className="size-7" strokeWidth={1.75} aria-hidden />
        </span>

        <div className="space-y-2">
          <p className="font-mono text-sm font-medium text-muted-foreground">
            403
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("errors:forbidden.title")}
          </h1>
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            {t("errors:forbidden.description")}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link to={PUBLIC_ROUTES.home}>{t("common:actions.goToHome")}</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
