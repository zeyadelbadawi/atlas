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
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@utils';
import type { LocalizedText } from '@types';

const EMPTY: LocalizedText = { en: '', ar: '' };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.en, value?.ar]);
  const Control = multiline ? Textarea : Input;
  const arComplete = local.ar.trim().length > 0;

  const update = (patch: Partial<LocalizedText>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">
        {t(labelKey)}
        {required ? <span className="text-destructive"> *</span> : null}
      </p>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-en`} className="text-xs text-muted-foreground">
          {t('website:editor.languageEnglish')}
        </Label>
        <Control
          id={`${id}-en`}
          {...(multiline ? { rows: 3 } : {})}
          dir="ltr"
          placeholder={placeholderEn}
          value={local.en}
          onChange={(event) => update({ en: event.target.value })}
          onBlur={() => onBlur?.(local)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${id}-ar`} className="text-xs text-muted-foreground">
            {t('website:editor.languageArabic')} ·{' '}
            {t('website:editor.optional')}
          </Label>
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
          </span>
        </div>
        <Control
          id={`${id}-ar`}
          {...(multiline ? { rows: 3 } : {})}
          dir="rtl"
          placeholder={placeholderAr}
          value={local.ar}
          onChange={(event) => update({ ar: event.target.value })}
          onBlur={() => onBlur?.(local)}
        />
      </div>
    </div>
  );
}
