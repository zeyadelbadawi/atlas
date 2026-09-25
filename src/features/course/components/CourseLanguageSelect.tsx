/**
 * The course's languages, as a picker instead of a text box.
 *
 * WHAT THIS REPLACES. A plain `<Input>` that authors were filling in by
 * typing languages separated by commas, with nothing to tell them which
 * spelling the catalogue would recognise — so `English, arabic`,
 * `en/ar` and `English and Arabic` all ended up in the same column, and
 * only one of them meant anything downstream.
 *
 * BUILT FROM THE PARTS ALREADY HERE. `Popover` + `Command` is exactly what
 * `components/ui/combobox.tsx` uses; this is that control with the
 * single-value assumption removed, plus `Badge` for the chosen set. No new
 * visual language, and the trigger keeps the outline-button look every
 * other field-level picker in the form already has.
 *
 * ACCESSIBILITY. The trigger is a real `combobox` with `aria-expanded`;
 * `Command` gives the list arrow-key navigation and type-ahead for free;
 * each selection is a `CommandItem`, so Enter toggles it. Every chosen
 * language has its own remove button with its own accessible name, rather
 * than one ambiguous "×" repeated down the row — and because the chips are
 * siblings of the trigger rather than inside it, there are no nested
 * interactive controls.
 *
 * RTL. Nothing here is side-anchored: the chip row wraps with `gap`, the
 * check mark uses logical `ms-auto`, and the only directional glyph is the
 * chevron, which is vertical.
 *
 * THE LIMIT IS PART OF THE UI, not just a validation message. The column
 * is 35 characters, so the control stops offering languages once the next
 * one would not fit and says why — a form that lets you pick a thing and
 * then refuses to save is worse than one that does not offer it.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@utils';
import {
  COURSE_LANGUAGE_OPTIONS,
  courseLanguageLabel,
  serializeCourseLanguages,
} from '../constants/course-languages';
import { MAX_COURSE_LANGUAGE_LENGTH } from '../constants/course.constants';

export interface CourseLanguageSelectProps {
  /** Canonical tokens — codes, plus any legacy value we chose not to destroy. */
  readonly value: readonly string[];
  readonly onChange: (next: string[]) => void;
  readonly disabled?: boolean;
}

export function CourseLanguageSelect({
  value,
  onChange,
  disabled,
}: CourseLanguageSelectProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const label = (token: string) => courseLanguageLabel(token, i18n.language);

  /**
   * Which options would still fit. Measured against what would actually be
   * written, so the answer cannot drift from the validation rule.
   */
  const tooLongToAdd = useMemo(() => {
    const blocked = new Set<string>();
    for (const option of COURSE_LANGUAGE_OPTIONS) {
      if (value.includes(option.code)) continue;
      const candidate = serializeCourseLanguages([...value, option.code]) ?? '';
      if (candidate.length > MAX_COURSE_LANGUAGE_LENGTH) blocked.add(option.code);
    }
    return blocked;
  }, [value]);

  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((token) => token !== code));
      return;
    }
    if (tooLongToAdd.has(code)) return;
    onChange([...value, code]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn(value.length === 0 && 'text-muted-foreground')}>
              {value.length === 0
                ? t('course:edit.languagePlaceholder')
                : t('course:edit.languageSelected', { count: value.length })}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('course:edit.languageSearch')} />
            <CommandList>
              <CommandEmpty>{t('course:edit.languageEmpty')}</CommandEmpty>
              <CommandGroup>
                {COURSE_LANGUAGE_OPTIONS.map((option) => {
                  const selected = value.includes(option.code);
                  const blocked = !selected && tooLongToAdd.has(option.code);
                  return (
                    <CommandItem
                      key={option.code}
                      value={`${label(option.code)} ${option.englishName} ${option.code}`}
                      disabled={blocked}
                      onSelect={() => toggle(option.code)}
                    >
                      <span className={cn(blocked && 'text-muted-foreground')}>
                        {label(option.code)}
                      </span>
                      {selected ? (
                        <Check className="ms-auto size-4" aria-hidden />
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t('course:edit.languageLabel')}>
          {value.map((token) => (
            <li key={token}>
              <Badge variant="secondary" className="gap-1 ps-2 pe-1">
                {label(token)}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((item) => item !== token))}
                  aria-label={t('course:edit.languageRemove', {
                    language: label(token),
                  })}
                  className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {tooLongToAdd.size > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t('course:edit.languageLimitReached')}
        </p>
      ) : null}
    </div>
  );
}
