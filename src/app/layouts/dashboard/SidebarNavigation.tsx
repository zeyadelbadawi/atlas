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
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isPathActive } from '@app/routes/route-paths';
import type { NavigationItem, NavigationSection } from '@types';
import { cn } from '@utils';

export interface SidebarNavigationProps {
  readonly sections: readonly NavigationSection[];
  /** Hides labels and shows tooltips instead. */
  readonly isCollapsed: boolean;
  /** Invoked after a successful navigation, used to close the mobile drawer. */
  readonly onNavigate?: () => void;
  /**
   * True only when an Academy with its own configured brand color is the
   * active scope (see `DashboardSidebar`/`AcademyBrandScope`) — adds a
   * brand-colored start-border indicator to the active item, on top of
   * (never instead of) the existing `bg-sidebar-accent` treatment. Never
   * set for the platform-level dashboard (no active Academy) or an
   * Academy with no custom brand color, so their nav renders identically
   * to before this existed.
   */
  readonly brandAccent?: boolean;
}

export function SidebarNavigation({
  sections,
  isCollapsed,
  onNavigate,
  brandAccent = false,
}: SidebarNavigationProps): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();

  const renderItem = (item: NavigationItem): JSX.Element => {
    const label = t(item.labelKey);
    const isActive = isPathActive(
      location.pathname,
      item.path,
      item.matchNestedPaths
    );

    const link = (
      <NavLink
        to={item.path}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast ease-standard',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
          isCollapsed && 'justify-center px-0',
          isActive
            ? cn(
                'bg-sidebar-accent text-sidebar-accent-foreground',
                // Skipped while collapsed: the rail centers a bare icon with
                // no reading-start gutter for a border indicator to occupy,
                // and avoids fighting the collapsed `justify-center px-0`
                // padding reset above with a second, conflicting padding
                // utility on the same edge.
                brandAccent &&
                  !isCollapsed &&
                  'border-s-2 ps-[calc(0.75rem-2px)] [border-inline-start-color:var(--academy-brand-primary-solid)]'
              )
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
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

    /*
      Phase 12 — NESTED CHILDREN.

      `NavigationItem` has always carried `children` and
      `filterNavigationItems` has always recursed into them, but this
      renderer ignored them, so any nested entry silently disappeared.
      That is why the Add-ons area needs it: `Add-ons > Live Sessions >
      (Sessions | Recordings | Connection)` is a real hierarchy, and
      flattening it into unrelated top-level links is what stops the
      sidebar scaling once a second add-on exists.

      Children render only when the branch is active, so the sidebar stays
      short by default and expands where the user actually is. In the
      collapsed rail there is no room for a second level at all, and the
      parent's tooltip already names the branch — so the sub-list is
      skipped there rather than crushed into the icon gutter.
    */
    const children = item.children ?? [];
    const isBranchActive =
      isActive ||
      children.some((child) =>
        isPathActive(location.pathname, child.path, child.matchNestedPaths)
      );

    if (!isCollapsed) {
      return (
        <li key={item.id}>
          {link}
          {children.length > 0 && isBranchActive ? (
            <ul className="mt-1 space-y-1 border-s border-sidebar-border ms-4 ps-3">
              {children.map(renderItem)}
            </ul>
          ) : null}
        </li>
      );
    }

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
      aria-label={t('navigation:primary')}
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
