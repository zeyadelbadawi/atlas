/**
 * Academy Switcher (W5).
 *
 * Lives in the dashboard top bar, so the active academy is visible and
 * switchable from every screen (it used to exist only on the academy
 * dashboard). It shows the CURRENT academy — the one the URL addresses — and
 * the caller's role in it, and lists only the academies the caller staffs
 * (the server filters `GET /academies`; the organization owner sees all).
 *
 * Choosing an academy goes through `useSwitchAcademy`: a pushed navigation
 * to the same screen in the other academy, which the unsaved-changes dialog
 * can intercept and Back/Forward can replay.
 *
 * Keyboard: the trigger is a combobox button (Enter/Space/ArrowDown open
 * it); the list supports type-to-filter, arrow keys and Enter; Escape
 * closes and returns focus to the trigger (Radix Popover + cmdk).
 */
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePlatform } from '@hooks';
import { cn } from '@utils';
import type { AcademyStaffRole } from '@types';
import { useAcademies } from '../hooks/useAcademies';
import { useSwitchAcademy } from '../hooks/useSwitchAcademy';
import { useAcademyScope } from '../scope/academy-scope.context';

export interface AcademySwitcherProps {
  readonly className?: string;
  /**
   * `topbar` (default): compact, in the desktop top bar. `bar`: full width,
   * in the slim academy bar under the top bar on phones, where the top bar
   * has no room left at 390 px.
   */
  readonly variant?: 'topbar' | 'bar';
}

function RoleBadge({
  role,
  className,
}: {
  readonly role: AcademyStaffRole;
  readonly className?: string;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <span
      data-testid="academy-role-badge"
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground',
        className
      )}
    >
      {t(`academy:switcher.roles.${role}`)}
    </span>
  );
}

export function AcademySwitcher({
  className,
  variant = 'topbar',
}: AcademySwitcherProps): JSX.Element | null {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data } = useAcademies();
  const {
    academyId: scopeAcademyId,
    membership,
    lostAcademyIds,
  } = useAcademyScope();
  const { activeAcademyId } = usePlatform();
  const { switchAcademy } = useSwitchAcademy();

  const academies = (data?.items ?? []).filter(
    (academy) =>
      academy.status !== 'archived' && !lostAcademyIds.has(academy.id)
  );
  if (academies.length === 0) return null;

  const currentId = scopeAcademyId ?? activeAcademyId;
  const current = academies.find((academy) => academy.id === currentId);
  const currentName = membership?.academy.name ?? current?.name;
  const currentRole: AcademyStaffRole | undefined =
    (scopeAcademyId ? membership?.role : undefined) ?? current?.viewerRole;

  const handleSelect = (academyId: string) => {
    setOpen(false);
    switchAcademy(academyId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={
            currentName
              ? t('academy:switcher.triggerLabel', { name: currentName })
              : t('academy:switcher.selectAcademy')
          }
          data-testid="academy-switcher"
          className={cn(
            'min-w-0 gap-2 px-2 text-foreground',
            variant === 'bar'
              ? 'h-11 w-full justify-start'
              : 'h-9 max-w-[18rem]',
            className
          )}
        >
          <Building2
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <span
            className="min-w-0 truncate font-medium"
            data-testid="academy-switcher-current"
          >
            {currentName ?? t('academy:switcher.selectAcademy')}
          </span>
          {currentRole ? (
            <RoleBadge
              role={currentRole}
              className={
                variant === 'bar' ? 'ms-auto' : 'hidden xl:inline-flex'
              }
            />
          ) : null}
          <ChevronsUpDown
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] p-0"
      >
        {currentName && currentRole ? (
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-muted-foreground">
              {t('academy:switcher.yourRole')}
            </span>
            <RoleBadge role={currentRole} />
          </div>
        ) : null}
        <Command>
          <CommandInput
            placeholder={t('academy:switcher.searchPlaceholder')}
            aria-label={t('academy:switcher.searchPlaceholder')}
            className="h-10"
          />
          <CommandList>
            <CommandEmpty>{t('academy:switcher.noAcademies')}</CommandEmpty>
            <CommandGroup heading={t('academy:switcher.title')}>
              {academies.map((academy) => {
                const isCurrent = academy.id === currentId;
                return (
                  <CommandItem
                    key={academy.id}
                    // Filtered by name (the id keeps two same-named
                    // academies distinct).
                    value={`${academy.name} ${academy.id}`}
                    onSelect={() => handleSelect(academy.id)}
                    aria-current={isCurrent ? 'true' : undefined}
                    data-testid={`academy-switcher-option-${academy.id}`}
                    className="min-h-11 gap-2"
                  >
                    <Check
                      className={cn(
                        'size-4 shrink-0 text-primary',
                        isCurrent ? 'opacity-100' : 'opacity-0'
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate',
                        isCurrent && 'font-semibold'
                      )}
                    >
                      {academy.name}
                    </span>
                    {academy.viewerRole ? (
                      <RoleBadge role={academy.viewerRole} />
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
