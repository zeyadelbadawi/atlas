/**
 * The watermark code search form (docs/FORENSIC_WATERMARK.md).
 *
 * LIVE, CLIENT-SIDE VALIDATION. As the operator types, the input is
 * normalised exactly as the server will (`normalizeWatermarkCode`: case,
 * separators, O→0, I/L→1, Arabic-Indic digits) and the normalised reading
 * is echoed back. A wrong length, an impossible symbol or a failed check
 * symbol is explained BEFORE anything is sent: a lookup is audited and
 * rate-limited, so a misread must not spend one. While a code is still
 * being typed, a too-short input is shown as progress, not as an error;
 * it becomes an error only on submit.
 *
 * The code is Latin whatever the page language, so the field is LTR,
 * monospace and upper-cased for display, with autocorrect and spellcheck
 * off.
 */
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ScanSearch,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@hooks';
import { cn, formatNumber } from '@utils';
import {
  WATERMARK_CODE_EXAMPLE,
  WATERMARK_CODE_LENGTH,
  formatPartialWatermarkCode,
  invalidWatermarkSymbols,
  normalizeWatermarkCode,
} from '../utils/watermark-code.utils';

const K = 'platform:watermarkLookup';
/** Generous: separators and stray spaces are allowed; the backend reads at most 64. */
const INPUT_MAX_LENGTH = 40;

export interface WatermarkCodeFormProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Called with the NORMALISED code, only when it passes every check. */
  readonly onSubmit: (code: string) => void;
  readonly onClear: () => void;
  readonly isSubmitting: boolean;
  /**
   * Explain every problem at once, as after a submit attempt — for a code
   * that arrived by link (`?code=`) rather than being typed.
   */
  readonly showProblems?: boolean;
}

type Feedback =
  | { readonly tone: 'idle' }
  | { readonly tone: 'progress'; readonly message: string }
  | { readonly tone: 'valid'; readonly message: string }
  | { readonly tone: 'error'; readonly message: string };

export function WatermarkCodeForm({
  value,
  onChange,
  onSubmit,
  onClear,
  isSubmitting,
  showProblems = false,
}: WatermarkCodeFormProps): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const inputId = useId();
  const hintId = useId();
  const feedbackId = useId();
  /** Set by a submit attempt; cleared by the next edit. */
  const [submitAttempted, setAttempted] = useState(false);
  const attempted = submitAttempted || showProblems;

  const result = normalizeWatermarkCode(value);
  const normalized = result.ok ? result.code : result.normalized;
  const total = formatNumber(WATERMARK_CODE_LENGTH, language);
  const typed = formatNumber(normalized.length, language);

  const feedback: Feedback = (() => {
    if (result.ok) {
      return { tone: 'valid', message: t(`${K}.form.valid`) };
    }
    switch (result.problem) {
      case 'empty':
        return attempted
          ? { tone: 'error', message: t(`${K}.form.problems.empty`) }
          : { tone: 'idle' };
      case 'length':
        if (normalized.length > WATERMARK_CODE_LENGTH) {
          return {
            tone: 'error',
            message: t(`${K}.form.problems.tooLong`, { total }),
          };
        }
        // An impossible character is worth saying at once, even mid-typing.
        if (invalidWatermarkSymbols(normalized).length > 0) {
          return {
            tone: 'error',
            message: t(`${K}.form.problems.symbol`, {
              symbols: invalidWatermarkSymbols(normalized).join(' '),
            }),
          };
        }
        return attempted
          ? {
              tone: 'error',
              message: t(`${K}.form.problems.tooShort`, { total, typed }),
            }
          : {
              tone: 'progress',
              message: t(`${K}.form.progress`, { total, typed }),
            };
      case 'symbol':
        return {
          tone: 'error',
          message: t(`${K}.form.problems.symbol`, {
            symbols: invalidWatermarkSymbols(normalized).join(' '),
          }),
        };
      case 'checksum':
        return { tone: 'error', message: t(`${K}.form.problems.checksum`) };
    }
  })();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (result.ok) {
      setAttempted(false);
      onSubmit(result.code);
      return;
    }
    setAttempted(true);
  };

  const isError = feedback.tone === 'error';
  const showReading = normalized.length > 0;

  return (
    <form
      role="search"
      aria-label={t(`${K}.form.label`)}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-3"
    >
      <Label htmlFor={inputId} className="text-sm font-medium">
        {t(`${K}.form.label`)}
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Input
            id={inputId}
            name="code"
            value={value}
            onChange={(event) => {
              setAttempted(false);
              onChange(event.target.value);
            }}
            placeholder={WATERMARK_CODE_EXAMPLE}
            dir="ltr"
            data-ltr-content
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="search"
            maxLength={INPUT_MAX_LENGTH}
            aria-invalid={isError || undefined}
            aria-describedby={`${hintId} ${feedbackId}`}
            className={cn(
              'h-12 pe-10 font-mono text-lg uppercase tracking-[0.2em] placeholder:tracking-[0.2em] placeholder:text-muted-foreground/60 md:text-lg',
              isError && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                setAttempted(false);
                onClear();
              }}
              aria-label={t(`${K}.form.clear`)}
              className="absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-12 sm:min-w-[8.5rem]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <ScanSearch aria-hidden />
          )}
          {isSubmitting ? t(`${K}.form.submitting`) : t(`${K}.form.submit`)}
        </Button>
      </div>

      <p id={hintId} className="text-xs text-muted-foreground">
        {t(`${K}.form.hint`)}{' '}
        <span className="whitespace-nowrap">
          {t(`${K}.form.example`)}{' '}
          <span dir="ltr" data-ltr-content className="font-mono">
            {WATERMARK_CODE_EXAMPLE}
          </span>
        </span>
      </p>

      <div
        className={cn(
          'flex min-h-[1.5rem] flex-wrap items-center gap-x-3 gap-y-1 text-sm',
          feedback.tone === 'error' && 'text-destructive',
          feedback.tone === 'valid' && 'text-success',
          feedback.tone === 'progress' && 'text-muted-foreground'
        )}
        data-testid="watermark-code-feedback"
      >
        {showReading ? (
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <span className="text-muted-foreground">
              {t(`${K}.form.readsAs`)}
            </span>
            <span
              dir="ltr"
              data-ltr-content
              data-testid="watermark-code-reading"
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm tracking-widest"
            >
              {formatPartialWatermarkCode(normalized)}
            </span>
          </span>
        ) : null}
        {feedback.tone === 'progress' ? <span>{feedback.message}</span> : null}
        {/* Only verdicts are announced — not every keystroke's progress. */}
        <span
          id={feedbackId}
          aria-live="polite"
          className="inline-flex items-center gap-1.5"
        >
          {feedback.tone === 'error' ? (
            <AlertCircle className="size-4 shrink-0" aria-hidden />
          ) : feedback.tone === 'valid' ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          ) : null}
          {feedback.tone === 'error' || feedback.tone === 'valid'
            ? feedback.message
            : null}
        </span>
      </div>
    </form>
  );
}
