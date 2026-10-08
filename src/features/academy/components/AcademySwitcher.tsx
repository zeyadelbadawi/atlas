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
 * it). The dropdown opens compact — a header with a search toggle, then the
 * list — with focus on the list, where the arrow keys and Enter choose an
 * academy. The toggle (or typing any character on the list) opens the
 * search field and focuses it; Escape closes the search first and returns
 * focus to the toggle, then closes the dropdown and returns focus to the
 * trigger (Radix Popover + cmdk).
 */
import { Command as CommandPrimitive } from 'cmdk';
import { Building2, Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
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

/** The cmdk value of an academy's option: its name to filter on, its id to stay unique. */
function optionValue(academy: {
  readonly id: string;
  readonly name: string;
}): string {
  return `${academy.name} ${academy.id}`;
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Opening the search moves focus into it, so typing can start at once.
  useEffect(() => {
    const input = inputRef.current;
    if (!searchOpen || !input) return;
    input.focus();
    // A search opened by typing keeps the caret after that character.
    input.setSelectionRange(input.value.length, input.value.length);
  }, [searchOpen]);
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

  const needle = query.trim().toLocaleLowerCase();
  const visibleAcademies = needle
    ? academies.filter((academy) =>
        academy.name.toLocaleLowerCase().includes(needle)
      )
    : academies;

  const handleSelect = (academyId: string) => {
    setOpen(false);
    switchAcademy(academyId);
  };

  const openSearch = (initialQuery = '') => {
    setQuery(initialQuery);
    setSearchOpen(true);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    toggleRef.current?.focus();
  };
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Every opening starts compact, with the whole list.
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
          {/* `dir="auto"`: an academy name is user content in its own
              script — an English name in the Arabic dashboard must keep its
              beginning and lose its END to the ellipsis, not the reverse. */}
          <span
            dir="auto"
            title={currentName ?? undefined}
            className="min-w-0 truncate font-medium ltr:text-left rtl:text-right"
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
        // Focus lands on the list (a listbox with an active option), so the
        // arrows and Enter work at once and typing opens the search.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          listRef.current?.focus();
        }}
        // Escape closes the search first, the dropdown on the next press.
        onEscapeKeyDown={(event) => {
          if (!searchOpen) return;
          event.preventDefault();
          closeSearch();
        }}
      >
        {/* The header sits outside the command root on purpose: Enter on the
            toggle must not also choose the highlighted academy. */}
        <div className="flex min-h-11 items-center justify-between gap-2 border-b border-border pe-1.5 ps-3">
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">
            {t('academy:switcher.title')}
          </p>
          <Button
            ref={toggleRef}
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? searchId : undefined}
            aria-label={t(
              searchOpen
                ? 'academy:switcher.closeSearch'
                : 'academy:switcher.openSearch'
            )}
            data-testid="academy-switcher-search-toggle"
            onClick={() => (searchOpen ? closeSearch() : openSearch())}
          >
            {searchOpen ? (
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            ) : (
              <Search className="size-4" strokeWidth={1.75} aria-hidden />
            )}
          </Button>
        </div>
        <Command
          // Filtered here, not by cmdk: its own filter outlives the field,
          // so closing the search would leave the list filtered.
          shouldFilter={false}
          onKeyDown={(event) => {
            // Type-to-search: a printable key typed on the list opens the
            // search with that character in it.
            if (
              !searchOpen &&
              event.key.length === 1 &&
              event.key !== ' ' &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              event.preventDefault();
              openSearch(event.key);
            }
          }}
        >
          {searchOpen ? (
            <div
              id={searchId}
              className="border-b border-border p-2 motion-safe:duration-150 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1"
            >
              {/* The ring is drawn on the whole field, inset, so it never
                  crosses the icon or the text. */}
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring/40">
                <Search
                  className="size-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <CommandPrimitive.Input
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder={t('academy:switcher.searchPlaceholder')}
                  aria-label={t('academy:switcher.searchPlaceholder')}
                  data-testid="academy-switcher-search"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          ) : null}
          <CommandList
            ref={listRef}
            label={t('academy:switcher.title')}
            // The highlighted option is the focus indicator inside the list.
            className="py-1 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <CommandEmpty>{t('academy:switcher.noAcademies')}</CommandEmpty>
            <CommandGroup>
              {visibleAcademies.map((academy) => {
                const isCurrent = academy.id === currentId;
                return (
                  <CommandItem
                    key={academy.id}
                    // Filtered by name (the id keeps two same-named
                    // academies distinct).
                    value={optionValue(academy)}
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
                      dir="auto"
                      title={academy.name}
                      className={cn(
                        'min-w-0 flex-1 truncate ltr:text-left rtl:text-right',
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
