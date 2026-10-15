/**
 * D5-3 — the academy profile's currency follows its country until the
 * person chooses otherwise. The rule itself is pure and documented in
 * `country-currency.utils.ts`; this only holds the one piece of session
 * state it needs — whether the currency is currently overridden — and
 * applies it to the form.
 *
 * Imported by path, not through `hooks/index`, so page tests that mock the
 * academy data hooks keep the real rule.
 */
import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  currencyAfterCountryChange,
  isPickedCurrencyOverride,
  isSavedCurrencyOverride,
  suggestedCurrency,
} from '@utils';
import type { UpdateAcademyProfileFormData } from '../schemas/academy.schemas';

export interface CurrencyFollowsCountry {
  /** Sets the country and, unless the currency is overridden, its default currency. */
  readonly selectCountry: (country: string) => void;
  /** A manual currency pick. */
  readonly selectCurrency: (currency: string) => void;
  /** The country's default when the currency differs from it (the hint), else null. */
  readonly suggestion: string | null;
  readonly acceptSuggestion: () => void;
}

export function useCurrencyFollowsCountry(
  form: UseFormReturn<UpdateAcademyProfileFormData>,
  saved: { readonly country?: string; readonly currency?: string } | undefined
): CurrencyFollowsCountry {
  const [overridden, setOverridden] = useState(false);
  const savedCountry = saved?.country;
  const savedCurrency = saved?.currency;

  // A saved academy whose currency differs from its country's default
  // loads as overridden; re-derived whenever the saved values change.
  useEffect(() => {
    setOverridden(isSavedCurrencyOverride(savedCountry, savedCurrency));
  }, [savedCountry, savedCurrency]);

  const country = form.watch('country');
  const currency = form.watch('currency');
  const suggestion = suggestedCurrency(country, currency);

  const selectCurrency = (next: string) => {
    form.setValue('currency', next, { shouldDirty: true });
    setOverridden(isPickedCurrencyOverride(form.getValues('country'), next));
  };

  const selectCountry = (next: string) => {
    form.setValue('country', next, { shouldDirty: true });
    const current = form.getValues('currency');
    const following = currencyAfterCountryChange(next, current, overridden);
    if (following !== current) {
      form.setValue('currency', following, { shouldDirty: true });
    }
  };

  return {
    selectCountry,
    selectCurrency,
    suggestion,
    acceptSuggestion: () => {
      if (suggestion) selectCurrency(suggestion);
    },
  };
}
