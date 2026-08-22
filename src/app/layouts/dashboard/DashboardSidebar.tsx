/**
 * Dashboard sidebar.
 *
 * On desktop it is a persistent rail whose collapsed state is remembered across
 * sessions. Below the sidebar breakpoint the same navigation is presented as a
 * drawer, because a permanent sidebar would consume most of a phone screen.
 */
import { useMemo } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AtlasLogo } from "@components/branding";
import { getDashboardNavigation, filterNavigationItems } from "@app/navigation";
import { useAuth, useLanguage, usePlatform } from "@hooks";
import { cn } from "@utils";
import { SidebarNavigation } from "./SidebarNavigation";

export interface DashboardSidebarProps {
  readonly isCollapsed: boolean;
  readonly onToggleCollapsed: () => void;
  /** True when the viewport is below the sidebar breakpoint. */
  readonly isMobile: boolean;
  readonly isDrawerOpen: boolean;
  readonly onDrawerOpenChange: (isOpen: boolean) => void;
}

export function DashboardSidebar({
  isCollapsed,
  onToggleCollapsed,
  isMobile,
  isDrawerOpen,
  onDrawerOpenChange,
}: DashboardSidebarProps): JSX.Element {
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const { isAuthenticated, user, organization } = useAuth();
  const { activeAcademyId, isFeatureEnabled } = usePlatform();

  // Navigation is filtered by the same fail-closed permission/role logic used
  // everywhere else in Atlas, so a hidden platform-owner or academy entry here
  // matches what RouteGuard would also refuse at the route itself.
  const sections = useMemo(() => {
    const filterContext = { isAuthenticated, user, organization, isFeatureEnabled };
    return getDashboardNavigation(activeAcademyId)
      .map((section) => ({
        ...section,
        items: filterNavigationItems(section.items, filterContext),
      }))
      .filter((section) => section.items.length > 0);
  }, [activeAcademyId, isAuthenticated, user, organization, isFeatureEnabled]);

  const brandRow = (
    <div
      className={cn(
        "flex h-layout-header shrink-0 items-center border-b border-sidebar-border px-3",
        isCollapsed && !isMobile ? "justify-center" : "justify-between",
      )}
    >
      <AtlasLogo size="sm" markOnly={isCollapsed && !isMobile} />

      {!isMobile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label={t(
            isCollapsed
              ? "navigation:sidebar.expand"
              : "navigation:sidebar.collapse",
          )}
          aria-expanded={!isCollapsed}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            isCollapsed && "absolute end-2 top-3.5",
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen
              className="size-[1.125rem] rtl:-scale-x-100"
              strokeWidth={1.75}
              aria-hidden
            />
          ) : (
            <PanelLeftClose
              className="size-[1.125rem] rtl:-scale-x-100"
              strokeWidth={1.75}
              aria-hidden
            />
          )}
        </Button>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isDrawerOpen} onOpenChange={onDrawerOpenChange}>
        <SheetContent
          // The drawer enters from the reading-start edge in both directions.
          side={isRtl ? "right" : "left"}
          className="w-layout-sidebar border-sidebar-border bg-sidebar p-0"
        >
          {/* Required for an accessible name on the dialog. */}
          <SheetTitle className="sr-only">{t("navigation:primary")}</SheetTitle>
          <div className="flex h-full flex-col">
            {brandRow}
            <SidebarNavigation
              sections={sections}
              isCollapsed={false}
              onNavigate={() => onDrawerOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 flex-col border-e border-sidebar-border bg-sidebar transition-[width] duration-normal ease-standard lg:flex",
        isCollapsed ? "w-layout-sidebar-collapsed" : "w-layout-sidebar",
      )}
    >
      {brandRow}
      <SidebarNavigation
        sections={sections}
        isCollapsed={isCollapsed}
      />
    </aside>
  );
}
