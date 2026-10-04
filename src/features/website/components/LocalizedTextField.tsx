/**
 * Localized Text Field.
 *
 * The ONE control every bilingual section/CTA/navigation field renders
 * through (`SectionConfigForm`'s `ScalarField`, `CtaFieldEditor`,
 * `WebsiteNavigationTab`, `AuthPageCopyDialog`) — English and Arabic
 * always both visible, stacked, never a hidden tab a non-technical Owner
 * could miss and accidentally ship an English-only "bilingual" site
 * (see the Bilingual Academy Websites specification, "make the easiest
 * action the correct action"). English is marked required (the one
 * always-complete language); Arabic is explicitly labeled optional, with
 * a small status chip reflecting whether it's actually been filled in —
 * the same "English ✓ Complete / Arabic ⚠ Incomplete" language the rest
 * of the CMS uses, applied at the single-field level instead of only a
 * whole-page summary.
 *
 * Uncontrolled-with-default, matching the two real call-site shapes in
 * this codebase rather than forcing one onto the other:
 *   - `onChange` fires on every keystroke — `SectionConfigForm`'s live
 *     inline preview needs this to update as the admin types.
 *   - `onBlur` fires once focus leaves either language's field —
 *     `WebsiteNavigationTab`/`AuthPageCopyDialog` persist on blur, the
 *     same "no dedicated save button, no per-keystroke request" pattern
 *     every other field in that tab already uses.
 * A consumer uses whichever it needs; neither is required.
 *
 * CONTENT LIMITS. With `maxLength`, each language shows a live counter
 * ("64 / 70") and, once over, a destructive counter plus an actionable
 * message. The limit is deliberately NOT the input's `maxLength`
 * attribute: that would silently cut pasted text, and hide the end of
 * text saved before a limit tightened — the author has to see all of it
 * to shorten it well. Saving is what the limit blocks (`SectionConfigForm`
 * validates with the same schema). Characters are counted exactly as zod
 * counts them — `string.length`, UTF-16 code units — so the counter and
 * the save check can never disagree; every Arabic diacritic (tashkeel) is
 * a character of its own.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isAcceptableForLanguage } from '@/shared/validation/script-validation.utils';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@utils';
import type { LocalizedText } from '@types';

const EMPTY: LocalizedText = { en: '', ar: '' };

/** A validation message already translated by the caller, per language. */
export type LocalizedFieldErrors = Partial<Record<keyof LocalizedText, string>>;

export interface LocalizedTextFieldProps {
  readonly id: string;
  readonly labelKey: string;
  readonly value?: Partial<LocalizedText>;
  readonly onChange?: (value: LocalizedText) => void;
  readonly onBlur?: (value: LocalizedText) => void;
  readonly multiline?: boolean;
  readonly required?: boolean;
  readonly placeholderEn?: string;
  readonly placeholderAr?: string;
  /** Characters per language — see this file's doc comment ("Content limits"). */
  readonly maxLength?: number;
  /** Save-time messages (e.g. required) to show under each language. Over-limit text is reported by the field itself from `maxLength`. */
  readonly errors?: LocalizedFieldErrors;
}

/** `string.length`, the count zod's `.max()` checks — see this file's doc comment. */
function characterCount(text: string): number {
  return text.length;
}

export function LocalizedTextField({
  id,
  labelKey,
  value,
  onChange,
  onBlur,
  multiline,
  required,
  placeholderEn,
  placeholderAr,
  maxLength,
  errors,
}: LocalizedTextFieldProps): JSX.Element {
  const { t } = useTranslation();
  const [local, setLocal] = useState<LocalizedText>({ ...EMPTY, ...value });
  // Re-syncs whenever the CONTENT (not just the reference) of `value`
  // changes externally — e.g. a fully-controlled consumer like
  // `WebsitePageSeoDialog`'s react-hook-form field resetting to a
  // different page's saved values. A no-op for the `onBlur`-style
  // consumers (`WebsiteNavigationTab`), whose `value` only ever changes to
  // exactly what this field itself just reported.
  useEffect(() => {
    setLocal({ en: value?.en ?? '', ar: value?.ar ?? '' });
  }, [value?.en, value?.ar]);
  const Control = multiline ? Textarea : Input;
  const arComplete = local.ar.trim().length > 0;

  /*
   * LANGUAGE HINTS, NOT BLOCKING ERRORS.
   *
   * Each half warns when its content is predominantly the OTHER script —
   * the common real mistake is pasting the English copy into the Arabic
   * box and never noticing. It is shown as a warning rather than a
   * validation failure because the check is a heuristic: a legitimate
   * entry that happens to be mostly a brand name ("Atlas Pro 2026") would
   * otherwise be impossible to save. See `script-validation.utils.ts` for
   * everything it deliberately tolerates.
   */
  const enLooksWrong = !isAcceptableForLanguage(local.en, 'en');
  const arLooksWrong = !isAcceptableForLanguage(local.ar, 'ar');

  const update = (patch: Partial<LocalizedText>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange?.(next);
  };

  const renderLanguage = (
    language: keyof LocalizedText,
    label: ReactNode,
    status: ReactNode,
    looksWrong: boolean
  ) => {
    const inputId = `${id}-${language}`;
    const text = local[language];
    const count = characterCount(text);
    const over = maxLength !== undefined && count > maxLength;
    const error = errors?.[language];
    const blocking = over || Boolean(error);
    const counterId = `${inputId}-count`;
    const messageId = `${inputId}-message`;
    const languageId = `${inputId}-language`;
    const describedBy = [
      maxLength !== undefined ? counterId : null,
      blocking ? messageId : null,
      looksWrong ? languageId : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={inputId} className="text-xs text-muted-foreground">
            {label}
          </Label>
          <div className="flex items-center gap-3">
            {status}
            {maxLength !== undefined ? (
              <span
                id={counterId}
                data-testid={counterId}
                className={cn(
                  'text-xs tabular-nums',
                  over
                    ? 'font-medium text-destructive'
                    : 'text-muted-foreground'
                )}
              >
                {/* Always "count / max", left to right, in either UI direction. */}
                <span dir="ltr" aria-hidden>
                  {t('website:editor.characterCount', {
                    count,
                    max: maxLength,
                  })}
                </span>
                <span className="sr-only">
                  {t('website:editor.characterCountLabel', {
                    count,
                    max: maxLength,
                  })}
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <Control
          id={inputId}
          {...(multiline ? { rows: 3 } : {})}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          placeholder={language === 'ar' ? placeholderAr : placeholderEn}
          value={text}
          onChange={(event) => update({ [language]: event.target.value })}
          onBlur={() => onBlur?.(local)}
          className={cn(
            blocking && 'border-destructive focus-visible:ring-destructive'
          )}
          aria-invalid={blocking || looksWrong || undefined}
          aria-describedby={describedBy || undefined}
          data-field-error={blocking || undefined}
        />
        {blocking ? (
          <p
            id={messageId}
            data-testid={messageId}
            className="text-xs text-destructive"
          >
            {over ? t('website:editor.shortenTo', { count: maxLength }) : error}
          </p>
        ) : null}
        {looksWrong ? (
          <p
            id={languageId}
            data-testid={languageId}
            className="text-xs text-warning"
          >
            {language === 'ar'
              ? t('validation:language.expectedArabic')
              : t('validation:language.expectedEnglish')}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">
        {t(labelKey)}
        {required ? <span className="text-destructive"> *</span> : null}
      </p>

      {renderLanguage(
        'en',
        t('website:editor.languageEnglish'),
        null,
        enLooksWrong
      )}

      {renderLanguage(
        'ar',
        <>
          {t('website:editor.languageArabic')} · {t('website:editor.optional')}
        </>,
        <span
          className={cn(
            'flex items-center gap-1 text-xs',
            arComplete ? 'text-success' : 'text-muted-foreground'
          )}
        >
          {arComplete ? (
            <CheckCircle2 className="size-3.5" aria-hidden />
          ) : null}
          {arComplete
            ? t('website:editor.translationComplete')
            : t('website:editor.translationIncomplete')}
        </span>,
        arLooksWrong
      )}
    </div>
  );
}
