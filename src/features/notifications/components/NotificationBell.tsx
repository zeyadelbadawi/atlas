/**
 * Notification bell.
 *
 * Phase 0 fix — the notification backend, hooks, and a full
 * `NotificationsPage` all already existed and are real; nothing in any
 * dashboard topbar surfaced the unread count ambiently. This widget adds
 * exactly that: a live badge over a bell icon that links to the existing
 * page, reusing `useNotificationSummary()` (already the single source of
 * the unread count, per that hook's own doc comment) rather than
 * introducing a second one.
 *
 * Lives inside this feature (not `shared/components/controls`, where the
 * other topbar widgets live) because it depends on this feature's own
 * hook — `shared/` must never import from a feature (see
 * `OrganizationSwitcher`, which sources the same kind of cross-cutting
 * data from `useAuth()` instead, precisely to avoid that). `DashboardLayout`
 * (the App layer) is the one that composes this feature-owned widget into
 * the shell, the same direction every other App-imports-Feature wiring in
 * this codebase already flows.
 */
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DASHBOARD_ROUTES } from "@app/routes/route-paths";
import { cn } from "@utils";
import { useNotificationSummary } from "../hooks";

export interface NotificationBellProps {
  readonly className?: string;
}

export function NotificationBell({
  className,
}: NotificationBellProps): JSX.Element {
  const { t } = useTranslation();
  const { data } = useNotificationSummary();
  const unreadCount = data?.unread ?? 0;
  const label =
    unreadCount > 0
      ? t("common:notifications.bellUnread", { count: unreadCount })
      : t("common:notifications.bell");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn(
            "relative text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          <Link to={DASHBOARD_ROUTES.notifications}>
            <Bell className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
            {unreadCount > 0 ? (
              <span
                aria-hidden
                className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
