/**
 * B0 (UX audit) — the error summary at the top of a form.
 *
 * After a failed submit it lists every problem in the form, each one a link
 * that moves focus to the field it belongs to, and it takes focus itself so
 * a keyboard or screen-reader user lands on it. Inline errors under each
 * field stay; this complements them.
 *
 * It shows when a submit failed with two or more problems, or with any
 * problem the form cannot show beside a field (a server violation on a
 * field the form does not render, or a form-level `root` error) — those
 * would otherwise be invisible.
 */
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn, humanizeFieldName } from '@utils';
import { resolveValidationMessage } from './form.utils';

export interface FormErrorSummaryProps<TValues extends FieldValues> {
  readonly form: UseFormReturn<TValues>;
  /** Translation keys of the field labels, by field path (`address.city`). */
  readonly fieldLabels?: Readonly<Record<string, string>>;
  readonly className?: string;
}

export interface SummaryItem {
  /** Field path, or `null` for a form-level error. */
  readonly name: string | null;
  readonly message: string;
}

/** Flattens React Hook Form's nested error tree into `path → message`. */
export function flattenFormErrors(
  errors: FieldErrors,
  prefix = ''
): { name: string | null; message: string }[] {
  const items: { name: string | null; message: string }[] = [];
  for (const [key, value] of Object.entries(errors)) {
    if (!value || typeof value !== 'object') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const node = value as { message?: unknown; type?: unknown; ref?: unknown };
    if (typeof node.message === 'string' && node.message.length > 0) {
      // `root` and `root.*` are form-level errors, never a field.
      const isRoot = path === 'root' || path.startsWith('root.');
      items.push({ name: isRoot ? null : path, message: node.message });
      continue;
    }
    items.push(...flattenFormErrors(value as FieldErrors, path));
  }
  return items;
}

/** The control a field path renders as, if it is on the page. */
function findControl(name: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  // Field paths are `a.b.0.c`; only a quote or backslash needs escaping.
  const safe = name.replace(/["\\]/g, '\\$&');
  return document.querySelector<HTMLElement>(`[name="${safe}"]`);
}

export function FormErrorSummary<TValues extends FieldValues>({
  form,
  fieldLabels,
  className,
}: FormErrorSummaryProps<TValues>): JSX.Element | null {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { errors, submitCount, isSubmitting } = form.formState;

  const items = useMemo<SummaryItem[]>(
    () =>
      flattenFormErrors(errors as FieldErrors).map(({ name, message }) => {
        const labelKey = name ? fieldLabels?.[name] : undefined;
        const label = labelKey ? t(labelKey) : name ? humanizeFieldName(name) : '';
        const text = resolveValidationMessage(message, t, { field: label }) ?? message;
        return { name, message: label && !text.includes(label) ? `${label}: ${text}` : text };
      }),
    [errors, fieldLabels, t]
  );

  const hasOrphan = items.some((item) => item.name === null || !findControl(item.name));
  const visible = submitCount > 0 && !isSubmitting && (items.length >= 2 || (items.length > 0 && hasOrphan));

  // Land on the summary after each failed submit (not on every keystroke).
  // Deferred one tick: React Hook Form focuses the first invalid field right
  // after a failed submit; the summary must win so it is read first.
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => ref.current?.focus(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount, visible]);

  if (!visible) return null;

  const focusField = (name: string): void => {
    try {
      form.setFocus(name as never);
    } catch {
      /* not registered with the form — fall back to the DOM */
    }
    const control = findControl(name);
    if (control && document.activeElement !== control) control.focus();
    control?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="form-error-summary-title"
      data-testid="form-error-summary"
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm outline-none',
        'focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
        className
      )}
    >
      <p
        id="form-error-summary-title"
        className="flex items-center gap-2 font-semibold text-destructive"
      >
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        {t('common:form.errorSummary.title', { count: items.length })}
      </p>
      <ul className="mt-2 list-disc space-y-1 ps-6 text-foreground">
        {items.map((item, index) => (
          <li key={`${item.name ?? 'form'}-${index}`}>
            {item.name && findControl(item.name) ? (
              <button
                type="button"
                onClick={() => focusField(item.name as string)}
                className="text-start underline underline-offset-2 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {item.message}
              </button>
            ) : (
              item.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
