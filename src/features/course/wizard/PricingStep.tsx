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
import { DEFAULT_COURSE_PRICING_CURRENCY } from '../constants/course.constants';
import { useStepSave } from './useStepSave';
import { WizardStepFooter } from './WizardStepFooter';
import type { WizardStepProps } from './wizard-step.types';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR'] as const;

const pricingSchema = z
  .object({
    visibility: z.enum(['public', 'private']),
    pricingType: z.enum(['free', 'paid']),
    pricingAmount: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce.number().min(0, 'validation:min').optional()
    ),
    pricingCurrency: z.string().optional(),
  })
  .refine(
    (data) =>
      data.pricingType !== 'paid' ||
      (typeof data.pricingAmount === 'number' && data.pricingAmount > 0),
    { message: 'course:validation.priceRequired', path: ['pricingAmount'] }
  );

type PricingValues = z.infer<typeof pricingSchema>;

export function PricingStep({
  academyId,
  course,
  onBack,
  onNext,
}: WizardStepProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm<PricingValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      visibility: course.visibility,
      pricingType: course.pricing.type,
      pricingAmount: course.pricing.amount,
      pricingCurrency:
        course.pricing.currency ?? DEFAULT_COURSE_PRICING_CURRENCY,
    },
  });
  const pricingType = form.watch('pricingType');

  const { save, markSaved, isSaving } = useStepSave({
    academyId,
    courseId: course.id,
    form,
    toPayload: (values, dirty) => {
      const pricingChanged =
        dirty.pricingType || dirty.pricingAmount || dirty.pricingCurrency;
      const pricing: CoursePricing =
        values.pricingType === 'paid'
          ? {
              type: 'paid',
              amount: values.pricingAmount,
              currency:
                values.pricingCurrency || DEFAULT_COURSE_PRICING_CURRENCY,
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
                    <FormLabel>{t('course:create.priceLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        dir="ltr"
                        data-ltr-content
                        placeholder={t('course:create.pricePlaceholder')}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
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
                        {CURRENCIES.map((currency) => (
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

        <WizardStepFooter
          onBack={onBack}
          nextType="submit"
          pending={isSaving}
        />
      </form>
    </Form>
  );
}
