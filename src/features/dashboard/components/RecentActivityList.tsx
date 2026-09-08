/**
 * RecentActivityList (Phase 8) — real audit-trail activity, newest first.
 *
 * Every row is a real `audit_log_entries` row the backend already scoped
 * (organization always; academy too, for a Manager's dashboard) — this
 * component never filters, and never sees another scope's rows to filter.
 *
 * `action` is a dotted event name (`course.published`), rendered through
 * a translation key so a user never reads a raw internal identifier. An
 * action with no translation yet falls back to a generic sentence rather
 * than leaking the dotted string — new audited actions can ship from the
 * backend before their copy lands without the UI showing internals.
 */
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { EmptyState } from "@components/feedback";
import type { DashboardActivityItem } from "@types";

export interface RecentActivityListProps {
  readonly items: readonly DashboardActivityItem[];
}

export function RecentActivityList({
  items,
}: RecentActivityListProps): JSX.Element {
  const { t, i18n } = useTranslation();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={History}
        titleKey="dashboard:activity.empty.title"
        descriptionKey="dashboard:activity.empty.description"
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => {
        const actionKey = `dashboard:activity.actions.${item.action}`;
        const hasCopy = i18n.exists(actionKey);

        return (
          <li key={item.id} className="flex flex-col gap-1 py-3">
            <span className="text-sm text-foreground">
              {hasCopy
                ? t(actionKey, {
                    actor: item.actorName,
                    target: item.targetLabel ?? "",
                  })
                : t("dashboard:activity.actions.generic", {
                    actor: item.actorName,
                  })}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(item.occurredAt).toLocaleString(i18n.language)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
