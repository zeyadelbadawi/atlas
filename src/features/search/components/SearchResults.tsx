/**
 * Search Results Component.
 *
 * Displays grouped search results with keyboard navigation.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, SearchX } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SearchResultItem } from "./SearchResultItem";
import type {
  SearchResults as SearchResultsType,
  SearchResultItem as SearchResultItemType,
} from "@types";

export interface SearchResultsProps {
  readonly results: SearchResultsType | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
  readonly onResultSelect?: (item: SearchResultItemType) => void;
}

export function SearchResults({
  results,
  isLoading,
  error,
  onRetry,
  onResultSelect,
}: SearchResultsProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Flatten all results for keyboard navigation
  const allItems = useMemo(
    () => results?.groups.flatMap((group) => group.items) ?? [],
    [results],
  );

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleItemClick = useCallback(
    (item: SearchResultItemType): void => {
      if (onResultSelect) {
        onResultSelect(item);
      } else if (item.path) {
        navigate(item.path);
      }
    },
    [navigate, onResultSelect],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (allItems.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          handleItemClick(allItems[selectedIndex]);
          break;
        case "Escape":
          event.preventDefault();
          // Clear selection or close search
          setSelectedIndex(0);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [allItems, selectedIndex, handleItemClick]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2
          className="size-8 animate-spin text-muted-foreground"
          strokeWidth={2}
        />
        <p className="mt-4 text-sm text-muted-foreground">
          {t("search:loading")}
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="size-6 text-destructive" strokeWidth={2} />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          {t("search:error.title")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("search:error.message")}
        </p>
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4">
          {t("search:error.retry")}
        </Button>
      </div>
    );
  }

  // Empty state
  if (!results || results.totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-3">
          <SearchX className="size-6 text-muted-foreground" strokeWidth={2} />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          {t("search:empty.title")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("search:empty.message")}
        </p>
      </div>
    );
  }

  // Results display
  let currentItemIndex = 0;

  return (
    <ScrollArea ref={scrollAreaRef} className="h-[400px]">
      <div className="space-y-6 p-4" role="listbox">
        {results.groups.map((group) => (
          <div key={group.category}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t(group.categoryLabelKey)} ({group.items.length})
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const itemIndex = currentItemIndex++;
                return (
                  <SearchResultItem
                    key={item.id}
                    item={item}
                    isSelected={selectedIndex === itemIndex}
                    onClick={() => handleItemClick(item)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
