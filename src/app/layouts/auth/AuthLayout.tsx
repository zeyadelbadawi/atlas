/**
 * Authentication layout.
 *
 * A split composition: the form occupies the primary column, while a brand panel
 * carries the product promise on wide viewports. The panel is hidden below `lg`
 * so a phone shows only the task the user came to complete.
 *
 * No authentication logic lives here — this layout only provides the frame the
 * authentication module will render into.
 */
import { Outlet } from "react-router-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { AtlasLogo } from "@components/branding";
import { LanguageSwitcher, ThemeSwitcher } from "@components/controls";
import { OfflineNotice } from "@components/feedback";
import { PUBLIC_ROUTES } from "@app/routes/route-paths";
import { useOnlineStatus } from "@hooks";

/** Translation keys for the brand panel's supporting points. */
const HIGHLIGHT_KEYS = [
  "layout:auth.highlights.unified",
  "layout:auth.highlights.bilingual",
  "layout:auth.highlights.enterprise",
] as const;

export function AuthLayout(): JSX.Element {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[1fr_minmax(28rem,36rem)]">
      {/*
        Brand panel. Placed first in the DOM but visually assigned to the second
        column, so keyboard users reach the form before the decorative content.
      */}
      <aside className="relative hidden overflow-hidden bg-brand-800 p-10 text-brand-50 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, hsl(var(--brand-600) / 0.9), transparent 55%), radial-gradient(circle at 80% 70%, hsl(var(--brand-500) / 0.55), transparent 60%)",
          }}
          aria-hidden
        />

        <div className="relative">
          <Link
            to={PUBLIC_ROUTES.home}
            className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800"
          >
            <AtlasLogo size="lg" className="text-brand-50" />
          </Link>
        </div>

        <div className="relative space-y-8">
          <p className="max-w-md font-display text-2xl font-semibold leading-snug">
            {t("layout:auth.brandPromise")}
          </p>

          <ul className="space-y-3">
            {HIGHLIGHT_KEYS.map((key) => (
              <li
                key={key}
                className="flex items-start gap-3 text-sm text-brand-100"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill bg-brand-50/15">
                  <Check className="size-3" strokeWidth={2.5} aria-hidden />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">
          {t("layout:public.footer.rights", { year: new Date().getFullYear() })}
        </p>
      </aside>

      <div className="flex min-h-dvh flex-col lg:col-start-1 lg:row-start-1">
        {!isOnline ? <OfflineNotice /> : null}

        <header className="flex h-layout-header items-center justify-between px-4 sm:px-6">
          <Link
            to={PUBLIC_ROUTES.home}
            className="rounded-md lg:invisible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <AtlasLogo size="sm" />
          </Link>

          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
