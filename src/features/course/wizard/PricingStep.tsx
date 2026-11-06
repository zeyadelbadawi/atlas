/**
 * Wizard step 6 — Pricing and access (W6): visibility, free/paid, price
 * and currency. A paid course needs a positive price and a currency — the
 * same rule checkout and the readiness check apply. Certificates and the
 * completion rule stay on the course Settings page.
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FieldHelp } from '@components/feedback';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CoursePricing } from '@types';
import {
  useAcademyPriceCurrency,
  usePriceCurrencyDefault,
} from '../hooks/useAcademyPriceCurrency';
import { useStepSave } from './useStepSave';
import { WizardStepFooter } from './WizardStepFooter';
import type { WizardStepProps } from './wizard-step.types';
import { currencyOptions } from '@utils';
import { RequiredMark, SaveFailedAlert } from '@forms';
import {
  MAX_COURSE_PRICE,
  pricingIssue,
  priceAmountFromInput,
  priceInputFromAmount,
} from '../utils/price-input.utils';

const pricingSchema = z
  .object({
    visibility: z.enum(['public', 'private']),
    pricingType: z.enum(['free', 'paid']),
    // B3 (V02/V14) — the typed text, read by `parsePriceInput`: sub-unit
    // precision, "1e3", a thousands separator and anything above the
    // maximum are refused with a message; "12,50" reads as 12.50.
    pricingAmount: z.union([z.string(), z.number()]).optional(),
    pricingCurrency: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const issue = pricingIssue(data);
    if (issue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue,
        path: ['pricingAmount'],
      });
    }
  });

type PricingValues = z.infer<typeof pricingSchema>;

export function PricingStep({
  academyId,
  course,
  onBack,
  onNext,
}: WizardStepProps): JSX.Element {
  const { t } = useTranslation();
  // D5-3 — a course with no price currency yet starts in the academy's;
  // one that has a currency keeps it.
  const academyCurrency = useAcademyPriceCurrency(academyId);
  const form = useForm<PricingValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      visibility: course.visibility,
      pricingType: course.pricing.type,
      pricingAmount: priceInputFromAmount(course.pricing.amount),
      pricingCurrency: course.pricing.currency ?? academyCurrency,
    },
  });
  usePriceCurrencyDefault(form, academyCurrency, course.pricing.currency);
  const pricingType = form.watch('pricingType');

  const { save, markSaved, isSaving, saveFailure } = useStepSave({
    academyId,
    courseId: course.id,
    form,
    fields: ['visibility', 'pricingType', 'pricingAmount', 'pricingCurrency'],
    toPayload: (values, dirty) => {
      const pricingChanged =
        dirty.pricingType || dirty.pricingAmount || dirty.pricingCurrency;
      const pricing: CoursePricing =
        values.pricingType === 'paid'
          ? {
              type: 'paid',
              amount: priceAmountFromInput(values.pricingAmount),
              currency: values.pricingCurrency || academyCurrency,
            }
          : { type: 'free' };
      return {
        ...(dirty.visibility ? { visibility: values.visibility } : {}),
        ...(pricingChanged ? { pricing } : {}),
      };
    },
  });

  const onSubmit = async (values: PricingValues) => {
    if (!(await save(values))) return;
    markSaved();
    onNext();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <FormField
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <FormItem className="sm:max-w-xs">
              <FormLabel className="flex items-center gap-1.5">
                {t('course:create.visibilityLabel')}
                <FieldHelp contentKey="course:create.help.visibility" />
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="public">
                    {t('course:visibility.public')}
                  </SelectItem>
                  <SelectItem value="private">
                    {t('course:visibility.private')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="pricingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  {t('course:create.pricingTypeLabel')}
                  <FieldHelp contentKey="course:create.help.pricingType" />
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="free">
                      {t('course:pricing.free')}
                    </SelectItem>
                    <SelectItem value="paid">
                      {t('course:pricing.paid')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {pricingType === 'paid' ? (
            <>
              <FormField
                control={form.control}
                name="pricingAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('course:create.priceLabel')}
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        aria-required
                        dir="ltr"
                        data-ltr-content
                        placeholder={t('course:create.pricePlaceholder')}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('course:create.priceHelp', {
                        max: MAX_COURSE_PRICE.toLocaleString('en-US'),
                      })}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricingCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('course:create.currencyLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencyOptions(field.value).map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : null}
        </div>

        {saveFailure ? (
          <SaveFailedAlert
            error={saveFailure}
            titleKey="common:form.notSaved"
            onRetry={() => void form.handleSubmit(onSubmit)()}
          />
        ) : null}
        <WizardStepFooter
          onBack={onBack}
          nextType="submit"
          pending={isSaving}
        />
      </form>
    </Form>
  );
}
