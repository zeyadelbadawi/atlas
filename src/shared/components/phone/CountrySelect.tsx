/**
 * A searchable country picker — the phone field's country list on its own
 * (D5-3): the same countries, SVG flags, names in the interface language
 * and the same search (Arabic or English name, or ISO code, with Arabic
 * letter variants folded).
 *
 * The value in and out is an ISO 3166-1 alpha-2 code (`EG`), never a name.
 * A stored value that is not a known code (an address saved as free text
 * before codes were enforced) is shown as it is, so nothing is silently
 * replaced; picking a country swaps it for a code.
 */
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Command as CommandPrimitive } from 'cmdk';
import { Check, ChevronDown, Search } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { CountryFlag } from './CountryFlag';
import { preloadCountryFlags } from './flag-loader';
import { foldForSearch, phoneCountryOptions } from './phone-number';

export interface CountrySelectProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'value' | 'onChange' | 'children' | 'type'
> {
  /** ISO 3166-1 alpha-2 code, or '' for none. */
  readonly value: string;
  readonly onChange: (country: string) => void;
  readonly placeholder?: string;
}

export const CountrySelect = forwardRef<HTMLButtonElement, CountrySelectProps>(
  function CountrySelect(
    { value, onChange, placeholder, disabled, className, ...buttonProps },
    ref
  ) {
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [active, setActive] = useState<string>(value);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const options = useMemo(
      () => phoneCountryOptions(i18n.language),
      [i18n.language]
    );
    const selected = options.find((option) => option.code === value);

    useEffect(() => {
      preloadCountryFlags();
    }, []);

    const choose = (code: string) => {
      onChange(code);
      setOpen(false);
      setSearch('');
    };

    const filtered = search.trim()
      ? options.filter((option) =>
          option.searchText.includes(foldForSearch(search))
        )
      : options;

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setActive(value);
          else setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            {...buttonProps}
            ref={(node) => {
              triggerRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            data-testid="country-select-trigger"
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-start text-sm ring-offset-background',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
          >
            {selected ? <CountryFlag country={selected.code} /> : null}
            <span
              className={cn(
                'flex-1 truncate',
                !value && 'text-muted-foreground'
              )}
            >
              {selected?.name ?? (value || placeholder)}
            </span>
            <ChevronDown className="size-4 opacity-50" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          dir={i18n.dir(i18n.language)}
          align="start"
          className="w-[min(20rem,calc(100vw-2rem))] p-0"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <Command
            shouldFilter={false}
            value={active}
            onValueChange={setActive}
            loop
            label={t('common:country.search')}
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 opacity-50" aria-hidden />
              <CommandPrimitive.Input
                value={search}
                onValueChange={setSearch}
                placeholder={t('common:country.search')}
                className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <CommandList>
              <CommandEmpty>{t('common:country.noResults')}</CommandEmpty>
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem
                    key={option.code}
                    value={option.code}
                    onSelect={() => choose(option.code)}
                    data-testid={`country-option-${option.code}`}
                    data-checked={option.code === value || undefined}
                    className="gap-2"
                  >
                    <CountryFlag country={option.code} />
                    <span className="flex-1 truncate">{option.name}</span>
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        option.code === value ? 'opacity-100' : 'opacity-0'
                      )}
                      aria-hidden
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
);
