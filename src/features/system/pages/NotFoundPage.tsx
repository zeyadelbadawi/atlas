/**
 * Not Found page.
 *
 * A missing page must offer a route back rather than stranding the user, so the
 * page always links to a known-good destination.
 */
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@components/layout";
import { PUBLIC_ROUTES } from "@app/routes/route-paths";

export default function NotFoundPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-pill bg-accent text-accent-foreground">
          <Compass className="size-7" strokeWidth={1.75} aria-hidden />
        </span>

        <div className="space-y-2">
          <p className="font-mono text-sm font-medium text-muted-foreground">
            404
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("errors:notFound.title")}
          </h1>
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            {t("errors:notFound.description")}
          </p>
        </div>

        <Button asChild>
          <Link to={PUBLIC_ROUTES.home}>{t("common:actions.goToHome")}</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
