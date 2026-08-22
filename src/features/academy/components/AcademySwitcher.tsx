/**
 * Academy Switcher Component.
 *
 * Allows users to switch between multiple academies.
 */
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePlatform } from "@hooks";
import { cn } from "@utils";
import type { Academy } from "@types";
import { useState } from "react";

export interface AcademySwitcherProps {
  readonly academies: readonly Academy[];
  readonly currentAcademy: Academy;
}

export function AcademySwitcher({
  academies,
  currentAcademy,
}: AcademySwitcherProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const { setActiveAcademy } = usePlatform();

  const handleSelect = (academyId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("academyId", academyId);
    navigate(`?${newParams.toString()}`, { replace: true });
    setActiveAcademy(academyId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <span className="truncate">{currentAcademy.name}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder={t("academy:switcher.selectAcademy")}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>{t("academy:switcher.noAcademies")}</CommandEmpty>
            <CommandGroup>
              {academies.map((academy) => (
                <CommandItem
                  key={academy.id}
                  value={academy.id}
                  onSelect={() => handleSelect(academy.id)}
                >
                  <span className="truncate">{academy.name}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentAcademy.id === academy.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
