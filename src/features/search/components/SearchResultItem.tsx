/**
 * Search Result Item Component.
 *
 * Individual search result with keyboard navigation support.
 */
import { useTranslation } from "react-i18next";
import { ChevronRight, FileText, User, Settings, Layers } from "lucide-react";
import { cn } from "@utils";
import type { SearchResultItem as SearchResultItemType } from "@types";

export interface SearchResultItemProps {
  readonly item: SearchResultItemType;
  readonly isSelected: boolean;
  readonly onClick: () => void;
  readonly onMouseEnter: () => void;
}

const CATEGORY_ICONS = {
  users: User,
  platform: Layers,
  content: FileText,
  system: Settings,
} as const;

export function SearchResultItem({
  item,
  isSelected,
  onClick,
  onMouseEnter,
}: SearchResultItemProps): JSX.Element {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[item.category];

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-start transition-colors",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 hover:text-accent-foreground",
      )}
      role="option"
      aria-selected={isSelected}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" strokeWidth={2} aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{item.title}</span>
          {item.metadata?.badge ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {item.metadata.badge}
            </span>
          ) : null}
        </div>
        {item.description ? (
          <p className="truncate text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
      </div>

      <ChevronRight
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform",
          isSelected && "translate-x-0.5",
        )}
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
}
