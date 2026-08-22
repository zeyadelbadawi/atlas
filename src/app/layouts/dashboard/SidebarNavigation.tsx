/**
 * Sidebar navigation.
 *
 * Renders the declarative navigation configuration. Because entries are data,
 * future modules appear here by registering configuration — this component never
 * needs to change.
 *
 * Collapsed mode keeps the icons and moves the labels into tooltips, so the
 * navigation stays usable rather than becoming a row of unlabelled glyphs.
 */
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isPathActive } from "@app/routes/route-paths";
import type { NavigationItem, NavigationSection } from "@types";
import { cn } from "@utils";

export interface SidebarNavigationProps {
  readonly sections: readonly NavigationSection[];
  /** Hides labels and shows tooltips instead. */
  readonly isCollapsed: boolean;
  /** Invoked after a successful navigation, used to close the mobile drawer. */
  readonly onNavigate?: () => void;
}

export function SidebarNavigation({
  sections,
  isCollapsed,
  onNavigate,
}: SidebarNavigationProps): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();

  const renderItem = (item: NavigationItem): JSX.Element => {
    const label = t(item.labelKey);
    const isActive = isPathActive(
      location.pathname,
      item.path,
      item.matchNestedPaths,
    );

    const link = (
      <NavLink
        to={item.path}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast ease-standard",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          isCollapsed && "justify-center px-0",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        {item.icon && (
          <item.icon
            className="size-[1.125rem] shrink-0"
            strokeWidth={1.75}
            aria-hidden
          />
        )}
        {isCollapsed ? (
          <span className="sr-only">{label}</span>
        ) : (
          <span className="truncate">{label}</span>
        )}
      </NavLink>
    );

    if (!isCollapsed) return <li key={item.id}>{link}</li>;

    return (
      <li key={item.id}>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      </li>
    );
  };

  return (
    <nav
      aria-label={t("navigation:primary")}
      className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4"
    >
      {sections.map((section) => (
        <div key={section.id} className="space-y-1.5">
          {section.labelKey && !isCollapsed ? (
            <h2 className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t(section.labelKey)}
            </h2>
          ) : null}
          <ul className="space-y-1">{section.items.map(renderItem)}</ul>
        </div>
      ))}
    </nav>
  );
}
