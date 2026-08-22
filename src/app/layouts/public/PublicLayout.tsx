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
import { PUBLIC_ROUTES } from "@app/routes/route-paths";
import { useOnlineStatus } from "@hooks";

/** Id of the main landmark, targeted by the skip link. */
const MAIN_CONTENT_ID = "atlas-public-content";

export function PublicLayout(): JSX.Element {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

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

          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeSwitcher />
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
