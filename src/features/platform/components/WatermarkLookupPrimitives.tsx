/**
 * Small building blocks of the watermark lookup result
 * (docs/FORENSIC_WATERMARK.md): a labelled field row, a left-to-right
 * technical value with an optional copy button, and a country with its
 * flag and localized name.
 *
 * BIDI. Every Latin technical value (code, IP, email, phone, user agent,
 * ids) is isolated left-to-right with `dir="ltr"` + `data-ltr-content`, so
 * an Arabic page never reorders `192.0.2.1` or `7K3QM-X9TR7`; names and
 * titles use `dir="auto"`; localized dates are left to the page direction.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountryFlag } from '@components/phone';
import { useCopyToClipboard, useLanguage } from '@hooks';
import { cn, formatCountryName } from '@utils';

const K = 'platform:watermarkLookup';

/**
 * Copies one value; a polite live region tells screen readers it worked
 * (the same pattern as the billing and DNS-record copy buttons).
 */
export function WatermarkCopyButton({
  value,
  label,
  testId,
}: {
  readonly value: string;
  /** Accessible name, e.g. "Copy session ID". */
  readonly label: string;
  readonly testId?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const { hasCopied, copy } = useCopyToClipboard();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={label}
        title={label}
        data-testid={testId}
        onClick={() => void copy(value)}
      >
        {hasCopied ? (
          <Check className="size-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {hasCopied ? t('common:actions.copied') : ''}
      </span>
    </>
  );
}

/** "Not recorded", muted — never an empty cell or a bare dash without meaning. */
export function NotRecorded(): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className="text-muted-foreground">
      {t(`${K}.values.notRecorded`)}
    </span>
  );
}

/** A Latin technical value, isolated left-to-right, optionally copyable. */
export function LtrValue({
  value,
  copyLabel,
  mono = false,
  testId,
}: {
  readonly value: string | null | undefined;
  readonly copyLabel?: string;
  readonly mono?: boolean;
  readonly testId?: string;
}): JSX.Element {
  if (!value) return <NotRecorded />;
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1">
      <span
        dir="ltr"
        data-ltr-content
        data-testid={testId}
        className={cn(
          'min-w-0 break-all',
          mono && 'font-mono text-[0.8125rem]'
        )}
      >
        {value}
      </span>
      {copyLabel ? (
        <WatermarkCopyButton value={value} label={copyLabel} />
      ) : null}
    </span>
  );
}

/** A name or title (any script). */
export function TextValue({
  value,
}: {
  readonly value: string | null | undefined;
}): JSX.Element {
  if (!value) return <NotRecorded />;
  return (
    <span className="min-w-0 break-words" dir="auto">
      {value}
    </span>
  );
}

/** A localized date-time, or "Not recorded". */
export function DateValue({
  value,
  format,
}: {
  readonly value: string | null | undefined;
  readonly format: (value: string) => string;
}): JSX.Element {
  if (!value) return <NotRecorded />;
  return <time dateTime={value}>{format(value)}</time>;
}

/**
 * `🇪🇬 Egypt (EG)` — the flag as the project's SVG `CountryFlag` (flag
 * emoji render as two letters on Windows), the name from
 * `Intl.DisplayNames` in the page language, and the raw code LTR. An
 * unrecognised code is shown as-is rather than as an invented place.
 */
export function CountryValue({
  country,
}: {
  readonly country: string | null | undefined;
}): JSX.Element {
  const { language } = useLanguage();
  if (!country) return <NotRecorded />;
  const code = country.toUpperCase();
  const name = formatCountryName(code, language);
  return (
    <span className="inline-flex items-center gap-2">
      {name ? <CountryFlag country={code} /> : null}
      <span>
        {name ? <span>{name} </span> : null}
        <span dir="ltr" data-ltr-content className="text-muted-foreground">
          {name ? `(${code})` : code}
        </span>
      </span>
    </span>
  );
}

/** A label/value list; on narrow screens each label sits above its value. */
export function FieldList({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(7rem,auto)_1fr]">
      {children}
    </dl>
  );
}

export function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="-mt-2 min-w-0 text-foreground sm:mt-0">{children}</dd>
    </div>
  );
}
