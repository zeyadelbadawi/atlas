/**
 * Search input.
 *
 * Any listing that can exceed the search threshold must offer search. Input is
 * debounced so a request is issued once the user pauses rather than on every
 * keystroke, and a clear affordance appears only when there is something to clear.
 */
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@hooks";
import { cn } from "@utils";

export interface SearchInputProps {
  /** Current committed value, owned by the caller. */
  readonly value: string;
  /** Invoked with the debounced value. */
  readonly onValueChange: (value: string) => void;
  /** Translation key for the accessible label and placeholder. */
  readonly labelKey?: string;
  readonly debounceMs?: number;
  readonly className?: string;
}

export function SearchInput({
  value,
  onValueChange,
  labelKey = "common:actions.search",
  debounceMs,
  className,
}: SearchInputProps): JSX.Element {
  const { t } = useTranslation();

  // Local state keeps typing responsive; the debounced value drives the caller.
  const [draft, setDraft] = useState(value);
  const debouncedDraft = useDebounce(draft, debounceMs);

  useEffect(() => {
    if (debouncedDraft !== value) onValueChange(debouncedDraft);
    // `value` is intentionally omitted: reacting to it would echo the caller's
    // own update back and fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft, onValueChange]);

  // Reset the draft when the caller clears the value externally.
  useEffect(() => {
    if (value === "" && draft !== "") setDraft("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const label = t(labelKey);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <Input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label={label}
        placeholder={label}
        className="ps-9 pe-9"
      />
      {draft.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setDraft("")}
          aria-label={t("common:actions.clearSearch")}
          className="absolute end-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
