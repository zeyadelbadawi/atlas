/**
 * Section tabs.
 *
 * A page's sibling pages are often reachable only through the sidebar —
 * fine at the top level, but once a client is two levels deep (say, on
 * Website Settings) getting to Website Pages meant leaving the page
 * entirely to hunt through the sidebar again, or the (barely discoverable)
 * back button. This renders that feature's own sibling pages as a slim,
 * always-visible strip right under the page title, so moving between
 * closely related pages never requires the sidebar at all.
 *
 * Deliberately plain `<Link>`s, not client state — this is navigation, not
 * a tabbed single page, so the browser's own back/forward and the URL bar
 * behave exactly as a user expects.
 */
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isPathActive } from "@app/routes/route-paths";
import type { NavigationItem } from "@types";
import { cn } from "@utils";

export interface SectionTabsProps {
  readonly items: readonly NavigationItem[];
  readonly className?: string;
}

export function SectionTabs({
  items,
  className,
}: SectionTabsProps): JSX.Element | null {
  const { t } = useTranslation();
  const location = useLocation();

  // A single destination is just the page itself — nothing to switch
  // between, so the strip would only add noise.
  if (items.length < 2) return null;

  return (
    <nav
      aria-label={t("navigation:sectionTabs.label")}
      className={cn(
        "flex flex-wrap gap-1 border-b border-border",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = isPathActive(
          location.pathname,
          item.path,
          item.matchNestedPaths,
        );

        return (
          <Link
            key={item.id}
            to={item.path}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-fast ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {item.icon ? (
              <item.icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            ) : null}
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
