/**
 * Theme switcher.
 *
 * Offers all three preferences explicitly, including `system`, because a user
 * who chose to follow their operating system needs to see that state reflected
 * rather than inferred.
 */
import { Check, Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isFeatureEnabled } from "@config";
import { useTheme } from "@hooks";
import { THEME_PREFERENCES } from "@types";
import type { ThemePreference } from "@types";
import { cn } from "@utils";

/** Icon and label for each preference. */
const PREFERENCE_PRESENTATION: Record<
  ThemePreference,
  { readonly icon: LucideIcon; readonly labelKey: string }
> = {
  light: { icon: Sun, labelKey: "common:theme.light" },
  dark: { icon: Moon, labelKey: "common:theme.dark" },
  system: { icon: Monitor, labelKey: "common:theme.system" },
};

export interface ThemeSwitcherProps {
  readonly className?: string;
}

export function ThemeSwitcher({
  className,
}: ThemeSwitcherProps): JSX.Element | null {
  const { t } = useTranslation();
  const { preference, resolvedTheme, setPreference } = useTheme();

  if (!isFeatureEnabled("themeSwitcher")) return null;

  const label = t("common:theme.switcher");
  // The trigger shows what is applied, not what was selected, so `system`
  // communicates the actual appearance.
  const TriggerIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={label}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                className,
              )}
            >
              <TriggerIcon
                className="size-[1.125rem]"
                strokeWidth={1.75}
                aria-hidden
              />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="min-w-44">
        {THEME_PREFERENCES.map((option) => {
          const { icon: OptionIcon, labelKey } =
            PREFERENCE_PRESENTATION[option];

          return (
            <DropdownMenuItem
              key={option}
              onSelect={() => setPreference(option)}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <OptionIcon className="size-4" strokeWidth={1.75} aria-hidden />
                {t(labelKey)}
              </span>
              {option === preference ? (
                <Check
                  className="size-4 text-primary"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
