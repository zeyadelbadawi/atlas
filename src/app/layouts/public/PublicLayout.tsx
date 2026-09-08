/**
 * Public layout.
 *
 * Wraps unauthenticated marketing and system surfaces. It carries the same
 * brand identity as the product shell so a visitor who signs in experiences one
 * continuous product rather than two different applications.
 */
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AtlasLogo } from "@components/branding";
import { LanguageSwitcher, ThemeSwitcher } from "@components/controls";
import { OfflineNotice } from "@components/feedback";
import { SkipToContentLink } from "@components/navigation";
import { Button } from "@/components/ui/button";
import {
  AUTH_ROUTES,
  DASHBOARD_ROUTES,
  PUBLIC_ROUTES,
} from "@app/routes/route-paths";
import { useAuth, useOnlineStatus } from "@hooks";

/** Id of the main landmark, targeted by the skip link. */
const MAIN_CONTENT_ID = "atlas-public-content";

export function PublicLayout(): JSX.Element {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SkipToContentLink targetId={MAIN_CONTENT_ID} />
      {!isOnline ? <OfflineNotice /> : null}

      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-layout-header max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to={PUBLIC_ROUTES.home}
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <AtlasLogo />
          </Link>

          <nav className="hidden items-center gap-6 sm:flex" aria-label={t("layout:public.nav.product")}>
            <Link
              to={PUBLIC_ROUTES.features}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("layout:public.nav.product")}
            </Link>
            <Link
              to={PUBLIC_ROUTES.pricing}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("layout:public.nav.pricing")}
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeSwitcher />
            {isAuthenticated ? (
              <Button asChild size="sm" className="ms-2">
                <Link to={DASHBOARD_ROUTES.root}>{t("layout:public.nav.getStarted")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="ms-2">
                  <Link to={AUTH_ROUTES.signIn}>{t("layout:public.nav.signIn")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={AUTH_ROUTES.register}>{t("layout:public.nav.getStarted")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            {t("layout:public.footer.rights", {
              year: new Date().getFullYear(),
            })}
          </p>
        </div>
      </footer>
    </div>
  );
}
