/**
 * Phone number field: a searchable country selector (flag + calling code)
 * joined to a telephone input.
 *
 * DIRECTION. The number and its calling code are left-to-right in every
 * language, so this control — and only this control — is `dir="ltr"`
 * (`data-ltr-content`): in Arabic the calling code still precedes the
 * number, as the number is read. Its label, hint and error stay in the
 * page's direction, and the country list (names in the interface language)
 * opens in it too.
 *
 * KEYBOARD. The selector is a button (Enter/Space/ArrowDown open it); the
 * list is a `cmdk` listbox — type to filter by name in Arabic or English,
 * ISO code or calling code, arrows to move, Enter to choose, Escape to close
 * and return focus to the button.
 *
 * TYPING. ASCII and Arabic-Indic digits are accepted. An international
 * number (`+966…`, pasted or autofilled) or a number of another country that
 * shares the calling code switches the selector to that country instead of
 * failing; a complete number is tidied to its national format on blur.
 */
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Command as CommandPrimitive } from 'cmdk';
import { Check, ChevronDown, Search } from 'lucide-react';
import { getExampleNumber } from 'libphonenumber-js/mobile';
import examples from 'libphonenumber-js/mobile/examples';
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
import {
  PHONE_INPUT_MAX_LENGTH,
  callingCodeOf,
  checkPhone,
  foldForSearch,
  impliedCountry,
  phoneCountryOptions,
  type CountryCode,
} from './phone-number';

export interface PhoneNumberInputProps {
  /** The `id` of the number input — the field's `<Label htmlFor>` points here. */
  readonly id: string;
  readonly country: CountryCode;
  readonly number: string;
  readonly onCountryChange: (country: CountryCode) => void;
  readonly onNumberChange: (number: string) => void;
  readonly onBlur?: () => void;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  /** Ids of the hint/error elements describing the field. */
  readonly describedBy?: string;
  readonly autoFocus?: boolean;
  readonly className?: string;
}

function examplePlaceholder(country: CountryCode): string {
  try {
    return getExampleNumber(country, examples)?.formatNational() ?? '';
  } catch {
    return '';
  }
}

export const PhoneNumberInput = forwardRef<
  HTMLInputElement,
  PhoneNumberInputProps
>(function PhoneNumberInput(
  {
    id,
    country,
    number,
    onCountryChange,
    onNumberChange,
    onBlur,
    invalid,
    disabled,
    describedBy,
    autoFocus,
    className,
  },
  ref
) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  // The highlighted option; opens on the current country.
  const [active, setActive] = useState<string>(country);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const options = useMemo(
    () => phoneCountryOptions(i18n.language),
    [i18n.language]
  );
  const selected = options.find((option) => option.code === country);
  const callingCode = callingCodeOf(country);

  useEffect(() => {
    preloadCountryFlags();
  }, []);

  const choose = (code: CountryCode) => {
    onCountryChange(code);
    setOpen(false);
    setSearch('');
  };

  const handleNumberChange = (value: string) => {
    onNumberChange(value);
    // An explicit international number names its own country.
    if (value.trim().startsWith('+')) {
      const implied = impliedCountry(value, country);
      if (implied) onCountryChange(implied);
    }
  };

  const handleBlur = () => {
    const implied = impliedCountry(number, country);
    const effective = implied ?? country;
    if (implied) onCountryChange(implied);
    const check = checkPhone(number, effective);
    if (check.ok && check.national !== number) onNumberChange(check.national);
    onBlur?.();
  };

  const countryLabel = t('common:phone.countryButton', {
    country: selected?.name ?? country,
    code: `+${callingCode}`,
  });

  return (
    <div
      dir="ltr"
      data-ltr-content
      className={cn(
        'flex w-full items-stretch rounded-md shadow-sm',
        disabled && 'opacity-50',
        className
      )}
    >
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setActive(country);
          else setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-label={countryLabel}
            aria-haspopup="listbox"
            aria-expanded={open}
            data-testid="phone-country-trigger"
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && !open) {
                event.preventDefault();
                setActive(country);
                setOpen(true);
              }
            }}
            className={cn(
              'flex h-10 shrink-0 items-center gap-1.5 rounded-l-md border border-r-0 border-input bg-background px-2.5 text-sm',
              'hover:bg-accent focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed',
              invalid && 'border-destructive'
            )}
          >
            <CountryFlag country={country} />
            <span className="tabular-nums text-foreground">+{callingCode}</span>
            <ChevronDown className="size-3.5 opacity-60" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          // The list is in the interface language and direction.
          dir={i18n.dir(i18n.language)}
          align="start"
          className="w-[min(20rem,calc(100vw-2rem))] p-0"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <Command
            // Filtering is done here, so names match in either language
            // and by calling code, with Arabic letter variants folded.
            shouldFilter={false}
            value={active}
            onValueChange={setActive}
            loop
            // cmdk labels both the search box and the list with this.
            label={t('common:phone.searchCountry')}
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 opacity-50" aria-hidden />
              <CommandPrimitive.Input
                value={search}
                onValueChange={setSearch}
                placeholder={t('common:phone.searchCountry')}
                className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <CommandList>
              <CommandEmpty>{t('common:phone.noCountry')}</CommandEmpty>
              <CommandGroup>
                {(search.trim()
                  ? options.filter((option) =>
                      option.searchText.includes(foldForSearch(search))
                    )
                  : options
                ).map((option) => (
                  <CommandItem
                    key={option.code}
                    value={option.code}
                    onSelect={() => choose(option.code)}
                    data-testid={`phone-country-option-${option.code}`}
                    data-checked={option.code === country || undefined}
                    className="gap-2"
                  >
                    <CountryFlag country={option.code} />
                    <span className="flex-1 truncate">{option.name}</span>
                    <span
                      dir="ltr"
                      data-ltr-content
                      className="tabular-nums text-muted-foreground"
                    >
                      +{option.callingCode}
                    </span>
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        option.code === country ? 'opacity-100' : 'opacity-0'
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
      <input
        ref={ref}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        dir="ltr"
        maxLength={PHONE_INPUT_MAX_LENGTH}
        placeholder={examplePlaceholder(country)}
        value={number}
        onChange={(event) => handleNumberChange(event.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        data-testid="phone-number-input"
        className={cn(
          'flex h-10 w-full min-w-0 rounded-r-md border border-input bg-background px-3 py-2 text-base tabular-nums ring-offset-background md:text-sm',
          'placeholder:text-muted-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed',
          invalid && 'border-destructive'
        )}
      />
    </div>
  );
});
