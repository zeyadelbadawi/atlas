/**
 * Search Bar Component.
 *
 * Main search input with keyboard shortcuts and focus management.
 */
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "@components/data-display";

export interface SearchBarProps {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly isLoading: boolean;
  readonly placeholder?: string;
}

export function SearchBar({
  query,
  onQueryChange,
  isLoading,
  placeholder,
}: SearchBarProps): JSX.Element {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder || t("search:placeholder")}
          aria-label={t("search:ariaLabel")}
          disabled={isLoading}
          className="h-12 w-full rounded-lg border border-input bg-background ps-11 pe-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("search:hint")}</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
    </div>
  );
}
