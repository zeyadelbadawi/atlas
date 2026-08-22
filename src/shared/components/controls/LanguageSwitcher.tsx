/**
 * Language switcher.
 *
 * Reads every option from the language registry, so adding a language requires
 * no change here. Each language is shown in its own script, which is what makes
 * it findable for a speaker of that language.
 */
import { Check, Languages } from "lucide-react";
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
import { useLanguage } from "@hooks";
import { cn } from "@utils";

export interface LanguageSwitcherProps {
  readonly className?: string;
}

export function LanguageSwitcher({
  className,
}: LanguageSwitcherProps): JSX.Element | null {
  const { t } = useTranslation();
  const { language, availableLanguages, setLanguage } = useLanguage();

  if (!isFeatureEnabled("languageSwitcher")) return null;

  const label = t("common:language.switcher");

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
              <Languages
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
        {availableLanguages.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onSelect={() => setLanguage(option.code)}
            className="flex items-center justify-between gap-3"
          >
            {/* Shown in its own script so speakers can recognise it. */}
            <span lang={option.code} dir={option.direction}>
              {option.nativeName}
            </span>
            {option.code === language ? (
              <Check
                className="size-4 text-primary"
                strokeWidth={2}
                aria-hidden
              />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
