/**
 * Dashboard layout.
 *
 * The authenticated application shell: persistent navigation, a topbar, and a
 * scrollable content region. Every business module added by later prompts renders
 * inside this shell, which is what makes separately built modules feel like one
 * product.
 */
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OfflineNotice } from "@components/feedback";
import { SkipToContentLink } from "@components/navigation";
import { STORAGE_KEYS } from "@constants";
import { SIDEBAR_BREAKPOINT } from "@tokens";
import {
  useBreakpoint,
  useDisclosure,
  useLocalStorage,
  useOnlineStatus,
} from "@hooks";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";

/** Id of the main landmark, targeted by the skip link. */
const MAIN_CONTENT_ID = "atlas-dashboard-content";

export function DashboardLayout(): JSX.Element {
  const { t } = useTranslation();
  const { isBelow } = useBreakpoint();
  const isOnline = useOnlineStatus();

  // Remembered across sessions: a user who collapsed the rail expects it to
  // stay collapsed the next time they sign in.
  const { value: isCollapsed, setValue: setIsCollapsed } = useLocalStorage(
    STORAGE_KEYS.sidebarCollapsed,
    false,
  );

  const drawer = useDisclosure(false);
  const isMobile = isBelow(SIDEBAR_BREAKPOINT);

  return (
    <div className="flex min-h-dvh bg-surface">
      <SkipToContentLink targetId={MAIN_CONTENT_ID} />

      <DashboardSidebar
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed((previous) => !previous)}
        isMobile={isMobile}
        isDrawerOpen={drawer.isOpen}
        onDrawerOpenChange={drawer.setOpen}
      />

      {/* `min-w-0` lets wide content scroll inside the flex row instead of
          stretching the shell and breaking the layout. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar onOpenNavigation={drawer.open} isMobile={isMobile} />
        {!isOnline ? <OfflineNotice /> : null}

        <main
          id={MAIN_CONTENT_ID}
          aria-label={t("layout:dashboard.contentLabel")}
          className="flex-1 bg-background"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
