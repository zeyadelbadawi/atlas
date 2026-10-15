/**
 * D5-3 — the academy currency drives the currency a NEW course price starts
 * in (`defaultPriceCurrency`: the academy's, or the platform default when
 * the academy holds a legacy value no new price may use).
 *
 * A course that already has a currency keeps it — the price form only
 * falls back to this when the course has none (a free course turning
 * paid). Nothing is converted, and changing the academy currency never
 * rewrites an existing price.
 */
import { useEffect } from 'react';
import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from 'react-hook-form';
import { useAcademy } from '@/features/academy/hooks';
import { defaultPriceCurrency } from '@utils';

export function useAcademyPriceCurrency(academyId: string): string {
  const { data: academy } = useAcademy(academyId);
  return defaultPriceCurrency(academy?.currency);
}

/**
 * Keeps an untouched `pricingCurrency` field on `fallback` (the academy's
 * default) while the price has no currency of its own. The academy may load
 * after the form, so the field's default is moved — never a value the
 * person picked. It is re-applied when the field appears (the currency
 * field only renders for a paid price, and an unrendered field cannot be
 * reset) and, via `resetKey`, after the form is reset from fresh data.
 */
export function usePriceCurrencyDefault<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  fallback: string,
  ownCurrency: string | undefined,
  resetKey?: unknown
): void {
  const pricingType = form.watch('pricingType' as Path<TValues>);
  useEffect(() => {
    if (ownCurrency) return;
    const name = 'pricingCurrency' as Path<TValues>;
    if (form.getFieldState(name).isDirty) return;
    form.resetField(name, {
      defaultValue: fallback as PathValue<TValues, Path<TValues>>,
    });
    // `form` is stable for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallback, ownCurrency, resetKey, pricingType]);
}
