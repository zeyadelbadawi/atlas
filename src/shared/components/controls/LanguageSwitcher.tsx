/**
 * Language switcher.
 *
 * Reads every option from the language registry, so adding a language requires
 * no change here. Each language is shown in its own script, which is what makes
 * it findable for a speaker of that language.
 *
 * The trigger names the current language in words ("English" / "العربية",
 * the short code on phones) next to the language mark and a chevron, so it
 * reads as "this changes the language" without a tooltip; an icon alone did
 * not.
 */
import { ChevronDown, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isFeatureEnabled } from '@config';
import { useLanguage } from '@hooks';
import { cn } from '@utils';

export interface LanguageSwitcherProps {
  readonly className?: string;
}

export function LanguageSwitcher({
  className,
}: LanguageSwitcherProps): JSX.Element | null {
  const { t } = useTranslation();
  const { language, availableLanguages, setLanguage } = useLanguage();

  if (!isFeatureEnabled('languageSwitcher')) return null;

  const label = t('common:language.switcher');
  const current =
    availableLanguages.find((option) => option.code === language) ??
    availableLanguages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          data-testid="language-switcher-trigger"
          className={cn(
            'h-11 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground',
            className
          )}
        >
          <Languages
            className="size-[1.125rem] shrink-0"
            strokeWidth={1.75}
            aria-hidden
          />
          {/* "Change language: English" for assistive technology; the
              visible part is the language itself. */}
          <span className="sr-only">{label}: </span>
          {current ? (
            <>
              <span
                lang={current.code}
                dir={current.direction}
                className="hidden text-sm font-medium sm:inline"
              >
                {current.nativeName}
              </span>
              <span
                aria-hidden
                className="text-xs font-semibold uppercase tracking-wide sm:hidden"
              >
                {current.code}
              </span>
              <span className="sr-only sm:hidden" lang={current.code}>
                {current.nativeName}
              </span>
            </>
          ) : null}
          <ChevronDown
            className="size-4 shrink-0 opacity-70"
            strokeWidth={1.75}
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-44" aria-label={label}>
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={(code) => {
            const option = availableLanguages.find(
              (candidate) => candidate.code === code
            );
            if (option) setLanguage(option.code);
          }}
        >
          {availableLanguages.map((option) => (
            <DropdownMenuRadioItem
              key={option.code}
              value={option.code}
              className="min-h-10"
            >
              {/* Shown in its own script so speakers can recognise it. */}
              <span lang={option.code} dir={option.direction}>
                {option.nativeName}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
