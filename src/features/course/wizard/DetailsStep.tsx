/**
 * Wizard step 2 — Details (W6): full description, level, language(s),
 * learning outcomes and requirements — the catalog fields the create form
 * never offered. Saves only what changed.
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COURSE_LEVEL_VALUES, type CourseLevel } from '@types';
import { CourseLanguageSelect } from '../components/CourseLanguageSelect';
import { LinesTextarea, normalizeLines } from '../components/LinesTextarea';
import {
  parseCourseLanguages,
  serializeCourseLanguages,
} from '../constants/course-languages';
import {
  MAX_COURSE_DESCRIPTION_LENGTH,
  MAX_COURSE_LANGUAGE_LENGTH,
  MAX_COURSE_OUTCOME_LENGTH,
  MAX_COURSE_OUTCOMES,
  MAX_COURSE_REQUIREMENT_LENGTH,
  MAX_COURSE_REQUIREMENTS,
} from '../constants/course.constants';
import { useStepSave } from './useStepSave';
import { WizardStepFooter } from './WizardStepFooter';
import type { WizardStepProps } from './wizard-step.types';

const detailsSchema = z.object({
  description: z
    .string()
    .max(MAX_COURSE_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
  level: z
    .enum(['beginner', 'intermediate', 'advanced', 'all_levels'])
    .optional(),
  language: z
    .string()
    .max(MAX_COURSE_LANGUAGE_LENGTH, 'validation:maxLength')
    .optional(),
  outcomes: z
    .array(z.string().max(MAX_COURSE_OUTCOME_LENGTH, 'validation:maxLength'))
    .max(MAX_COURSE_OUTCOMES, 'validation:maxItems'),
  requirements: z
    .array(
      z.string().max(MAX_COURSE_REQUIREMENT_LENGTH, 'validation:maxLength')
    )
    .max(MAX_COURSE_REQUIREMENTS, 'validation:maxItems'),
});

type DetailsValues = z.infer<typeof detailsSchema>;

export function DetailsStep({
  academyId,
  course,
  onBack,
  onNext,
}: WizardStepProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      description: course.description ?? '',
      level: course.level,
      language: course.language ?? '',
      outcomes: course.outcomes ? [...course.outcomes] : [],
      requirements: course.requirements ? [...course.requirements] : [],
    },
  });

  const { save, markSaved, isSaving } = useStepSave({
    academyId,
    courseId: course.id,
    form,
    toPayload: (values, dirty) => ({
      ...(dirty.description ? { description: values.description ?? '' } : {}),
      ...(dirty.level && values.level ? { level: values.level } : {}),
      ...(dirty.language
        ? {
            language:
              serializeCourseLanguages(parseCourseLanguages(values.language)) ??
              '',
          }
        : {}),
      // `LinesTextarea` normalises on blur; again here for a submit that
      // never blurred, so a half-typed blank line never reaches the API.
      ...(dirty.outcomes
        ? { outcomes: normalizeLines(values.outcomes.join('\n')) }
        : {}),
      ...(dirty.requirements
        ? { requirements: normalizeLines(values.requirements.join('\n')) }
        : {}),
    }),
  });

  const onSubmit = async (values: DetailsValues) => {
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('course:create.descriptionLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  placeholder={t('course:create.descriptionPlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('course:edit.levelLabel')}</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value as CourseLevel)
                  }
                  value={field.value ?? ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('course:edit.levelPlaceholder')}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COURSE_LEVEL_VALUES.map((level) => (
                      <SelectItem key={level} value={level}>
                        {t(`course:level.${level}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('course:edit.languageLabel')}</FormLabel>
                <FormControl>
                  <CourseLanguageSelect
                    value={parseCourseLanguages(field.value)}
                    onChange={(next) =>
                      field.onChange(serializeCourseLanguages(next) ?? '')
                    }
                  />
                </FormControl>
                <FormDescription>
                  {t('course:edit.languageHelp')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="outcomes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('course:edit.outcomesLabel')}</FormLabel>
              <FormControl>
                <LinesTextarea
                  rows={4}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('course:edit.outcomesPlaceholder')}
                />
              </FormControl>
              <FormDescription>
                {t('course:edit.onemPerLineHelp')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('course:edit.requirementsLabel')}</FormLabel>
              <FormControl>
                <LinesTextarea
                  rows={4}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('course:edit.requirementsPlaceholder')}
                />
              </FormControl>
              <FormDescription>
                {t('course:edit.onemPerLineHelp')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <WizardStepFooter
          onBack={onBack}
          nextType="submit"
          pending={isSaving}
        />
      </form>
    </Form>
  );
}
