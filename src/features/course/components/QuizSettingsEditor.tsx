/**
 * Quiz Settings Editor (P64 Phase 3 §E.1; W7 essentials + advanced split).
 *
 * The settings half of the quiz builder: two presets (Practice / Exam)
 * that FILL the fields, the ESSENTIAL settings (passing score, max
 * attempts, time limit, "required for completion") always visible, and
 * everything else behind an "Advanced options" disclosure
 * (`QUIZ_ADVANCED_SETTING_KEYS`) in the same five grouped cards as before
 * — timing and availability, attempts and grading, results and review,
 * integrity, progression. Every field carries a one-line description that
 * says what the server ENFORCES versus what it merely RECORDS, and the
 * integrity copy never claims to prevent anything (design review rule 9).
 *
 * The advanced panel stays mounted while collapsed (values are kept and
 * always submitted) and OPENS BY ITSELF when:
 *   - an existing quiz is opened with a customised advanced value
 *     (`customisedAdvancedSettings`, judged against both untouched
 *     baselines — the Practice preset and the server defaults);
 *   - a client or server validation error lands on an advanced field
 *     (focus then moves to that field);
 *   - the author picks the Exam preset (it sets integrity and full screen).
 *
 * Reads and writes the settings fields of the enclosing
 * `QuizAuthoringFormData` form through `useFormContext`, the same way
 * `QuizQuestionsEditor` does for `questions`. The two converters at the
 * bottom are the page boundary: minutes ↔ seconds and `datetime-local`
 * ↔ ISO, with `null` clearing a date or a limit on the server.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormContext, useWatch, type FieldPath } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CalendarClock,
  Eye,
  Flag,
  Gauge,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@utils';
import {
  ASSESSMENT_LATE_POLICIES,
  MAX_QUIZ_MAX_VIOLATIONS,
  MAX_QUIZ_QUESTIONS,
  MAX_QUIZ_TIME_LIMIT_MINUTES,
  MIN_QUIZ_MAX_VIOLATIONS,
  MIN_QUIZ_TIME_LIMIT_MINUTES,
  QUIZ_ADVANCED_SETTING_KEYS,
  QUIZ_DISCLOSURES,
  QUIZ_GRADING_POLICIES,
  QUIZ_LAYOUTS,
  QUIZ_MODES,
  QUIZ_SETTINGS_PRESETS,
  QUIZ_SETTINGS_PRESET_KEYS,
  customisedAdvancedSettings,
  sameQuizSetting,
  type QuizAuthoringFormData,
  type QuizSettingsFormData,
  type QuizSettingsPresetName,
} from '@features/learning';
import type { QuizSettingsAuthoring, QuizSettingsInput } from '@types';
import { toDateTimeLocalValue } from './AssignmentFormDialog';
import { AdvancedOptionsDisclosure } from './AdvancedOptionsDisclosure';

type SettingsField = FieldPath<QuizAuthoringFormData>;

const PRESET_NAMES: readonly QuizSettingsPresetName[] = ['practice', 'exam'];

/**
 * Read at CALL time, never captured at module scope: `@features/learning`
 * can reach this module through its own barrel, and inside that import
 * cycle a module-scope copy of the binding is `undefined` (the same trap
 * `emptyQuizValues` documents).
 */
function isAdvancedKey(key: string): boolean {
  return (QUIZ_ADVANCED_SETTING_KEYS as readonly string[]).includes(key);
}

export function QuizSettingsEditor(): JSX.Element {
  const { t } = useTranslation();
  const { control, setValue, getValues, setFocus, formState } =
    useFormContext<QuizAuthoringFormData>();

  const values = useWatch({ control });

  // Opened by itself for an edited quiz that already customises an
  // advanced setting; the author can still collapse it afterwards.
  const [advancedOpen, setAdvancedOpen] = useState(
    () => customisedAdvancedSettings(getValues()).length > 0
  );

  // An error on a hidden field must never be invisible: open the panel and
  // move focus to the first such field. Keyed on the error set, so a
  // second failed submit with the same error re-focuses it too.
  const advancedErrorKeys = Object.keys(formState.errors).filter(isAdvancedKey);
  const advancedErrorSignature = `${formState.submitCount}:${advancedErrorKeys.join(',')}`;
  const lastSignature = useRef('');
  useEffect(() => {
    if (advancedErrorKeys.length === 0) return;
    if (lastSignature.current === advancedErrorSignature) return;
    lastSignature.current = advancedErrorSignature;
    setAdvancedOpen(true);
    const hasEssentialError = Object.keys(formState.errors).some(
      (key) => !isAdvancedKey(key)
    );
    if (hasEssentialError) return; // React Hook Form already focused that one.
    const first = QUIZ_ADVANCED_SETTING_KEYS.find((key) =>
      advancedErrorKeys.includes(key)
    );
    if (!first) return;
    // After the panel is shown (focus cannot land in a hidden element).
    requestAnimationFrame(() => {
      try {
        setFocus(first);
      } catch {
        // Not every control is focusable through RHF (e.g. a Select); the
        // open panel and its inline message are the fallback.
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedErrorSignature]);

  const activePreset = PRESET_NAMES.find((name) =>
    QUIZ_SETTINGS_PRESET_KEYS.every((key) =>
      sameQuizSetting(values[key], QUIZ_SETTINGS_PRESETS[name][key])
    )
  );

  const applyPreset = (name: QuizSettingsPresetName) => {
    const preset = QUIZ_SETTINGS_PRESETS[name];
    QUIZ_SETTINGS_PRESET_KEYS.forEach((key) => {
      setValue(key, preset[key], { shouldDirty: true, shouldValidate: true });
    });
    // Exam turns on integrity and full screen — show the author what it set.
    if (name === 'exam') setAdvancedOpen(true);
  };

  const customisedCount = customisedAdvancedSettings(values).length;
  const integrityMode = values.integrityMode ?? 'off';
  const hasTimeLimit =
    values.timeLimitMinutes !== undefined &&
    values.timeLimitMinutes !== null &&
    String(values.timeLimitMinutes) !== '';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-display text-base font-semibold text-foreground">
          {t('course:quizAuthoring.settings.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('course:quizAuthoring.settings.presetsHelp')}
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t('course:quizAuthoring.settings.presetsLabel')}
        >
          {PRESET_NAMES.map((name) => {
            const Icon = name === 'practice' ? BookOpen : ShieldCheck;
            const active = activePreset === name;
            return (
              <Button
                key={name}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                aria-pressed={active}
                onClick={() => applyPreset(name)}
              >
                <Icon className="size-4" strokeWidth={2} aria-hidden />
                {t(`course:quizAuthoring.settings.presets.${name}.label`)}
              </Button>
            );
          })}
        </div>
        {activePreset ? (
          <p className="text-xs text-muted-foreground">
            {t(
              `course:quizAuthoring.settings.presets.${activePreset}.description`
            )}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t('course:quizAuthoring.settings.presets.custom')}
          </p>
        )}
      </div>

      {/* Essentials — always visible. */}
      <SettingsCard
        icon={<Gauge className="size-4" strokeWidth={1.75} aria-hidden />}
        titleKey="course:quizAuthoring.settings.essentials.title"
        descriptionKey="course:quizAuthoring.settings.essentials.description"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberSetting
            name="passingScore"
            labelKey="course:quizAuthoring.editor.passingScoreLabel"
            descriptionKey="course:quizAuthoring.settings.fields.passingScore.description"
            min={0}
            max={100}
            placeholderKey="course:quizAuthoring.settings.fields.passingScore.placeholder"
          />
          <NumberSetting
            name="maxAttempts"
            labelKey="course:quizAuthoring.editor.maxAttemptsLabel"
            descriptionKey="course:quizAuthoring.settings.fields.maxAttempts.description"
            min={1}
            placeholderKey="course:quizAuthoring.settings.fields.maxAttempts.placeholder"
          />
          <NumberSetting
            name="timeLimitMinutes"
            labelKey="course:quizAuthoring.settings.fields.timeLimit.label"
            descriptionKey="course:quizAuthoring.settings.fields.timeLimit.description"
            min={MIN_QUIZ_TIME_LIMIT_MINUTES}
            max={MAX_QUIZ_TIME_LIMIT_MINUTES}
            placeholderKey="course:quizAuthoring.settings.fields.timeLimit.placeholder"
          />
        </div>
        <SwitchSetting
          name="requiredForCompletion"
          labelKey="course:quizAuthoring.settings.fields.requiredForCompletion.label"
          descriptionKey="course:quizAuthoring.settings.fields.requiredForCompletion.description"
        />
      </SettingsCard>

      <AdvancedOptionsDisclosure
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        label={t('course:quizAuthoring.settings.advanced.toggle')}
        summary={
          customisedCount > 0
            ? t('course:quizAuthoring.settings.advanced.customised', {
                count: customisedCount,
              })
            : undefined
        }
        testId="quiz-advanced-options"
      >
        <p className="text-sm text-muted-foreground">
          {t('course:quizAuthoring.settings.advanced.description')}
        </p>

        {/* Timing and availability */}
        <SettingsCard
          icon={
            <CalendarClock className="size-4" strokeWidth={1.75} aria-hidden />
          }
          titleKey="course:quizAuthoring.settings.timing.title"
          descriptionKey="course:quizAuthoring.settings.timing.description"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectSetting
              name="mode"
              labelKey="course:quizAuthoring.settings.fields.mode.label"
              descriptionKey="course:quizAuthoring.settings.fields.mode.description"
              options={QUIZ_MODES}
              optionKeyPrefix="course:quizAuthoring.settings.fields.mode.options"
            />
            <SelectSetting
              name="latePolicy"
              labelKey="course:quizAuthoring.settings.fields.latePolicy.label"
              descriptionKey="course:quizAuthoring.settings.fields.latePolicy.description"
              options={ASSESSMENT_LATE_POLICIES}
              optionKeyPrefix="course:quizAuthoring.settings.fields.latePolicy.options"
            />
            <DateTimeSetting
              name="availableFrom"
              labelKey="course:quizAuthoring.settings.fields.availableFrom.label"
              descriptionKey="course:quizAuthoring.settings.fields.availableFrom.description"
            />
            <DateTimeSetting
              name="availableUntil"
              labelKey="course:quizAuthoring.settings.fields.availableUntil.label"
              descriptionKey="course:quizAuthoring.settings.fields.availableUntil.description"
            />
            <DateTimeSetting
              name="dueAt"
              labelKey="course:quizAuthoring.settings.fields.dueAt.label"
              descriptionKey="course:quizAuthoring.settings.fields.dueAt.description"
            />
          </div>
          <SwitchSetting
            name="hideTimer"
            labelKey="course:quizAuthoring.settings.fields.hideTimer.label"
            descriptionKey="course:quizAuthoring.settings.fields.hideTimer.description"
            disabled={!hasTimeLimit}
          />
        </SettingsCard>

        {/* Attempts and grading */}
        <SettingsCard
          icon={
            <ListChecks className="size-4" strokeWidth={1.75} aria-hidden />
          }
          titleKey="course:quizAuthoring.settings.attempts.title"
          descriptionKey="course:quizAuthoring.settings.attempts.description"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectSetting
              name="gradingPolicy"
              labelKey="course:quizAuthoring.settings.fields.gradingPolicy.label"
              descriptionKey="course:quizAuthoring.settings.fields.gradingPolicy.description"
              options={QUIZ_GRADING_POLICIES}
              optionKeyPrefix="course:quizAuthoring.settings.fields.gradingPolicy.options"
            />
            <NumberSetting
              name="questionsPerAttempt"
              labelKey="course:quizAuthoring.settings.fields.questionsPerAttempt.label"
              descriptionKey="course:quizAuthoring.settings.fields.questionsPerAttempt.description"
              min={1}
              max={MAX_QUIZ_QUESTIONS}
              placeholderKey="course:quizAuthoring.settings.fields.questionsPerAttempt.placeholder"
            />
          </div>
          <SwitchSetting
            name="shuffleQuestions"
            labelKey="course:quizAuthoring.settings.fields.shuffleQuestions.label"
            descriptionKey="course:quizAuthoring.settings.fields.shuffleQuestions.description"
          />
          <SwitchSetting
            name="shuffleOptions"
            labelKey="course:quizAuthoring.settings.fields.shuffleOptions.label"
            descriptionKey="course:quizAuthoring.settings.fields.shuffleOptions.description"
          />
        </SettingsCard>

        {/* Results and review */}
        <SettingsCard
          icon={<Eye className="size-4" strokeWidth={1.75} aria-hidden />}
          titleKey="course:quizAuthoring.settings.results.title"
          descriptionKey="course:quizAuthoring.settings.results.description"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectSetting
              name="layout"
              labelKey="course:quizAuthoring.settings.fields.layout.label"
              descriptionKey="course:quizAuthoring.settings.fields.layout.description"
              options={QUIZ_LAYOUTS}
              optionKeyPrefix="course:quizAuthoring.settings.fields.layout.options"
            />
            <SelectSetting
              name="showScore"
              labelKey="course:quizAuthoring.settings.fields.showScore.label"
              descriptionKey="course:quizAuthoring.settings.fields.showScore.description"
              options={QUIZ_DISCLOSURES}
              optionKeyPrefix="course:quizAuthoring.settings.disclosure"
            />
            <SelectSetting
              name="showAnswers"
              labelKey="course:quizAuthoring.settings.fields.showAnswers.label"
              descriptionKey="course:quizAuthoring.settings.fields.showAnswers.description"
              options={QUIZ_DISCLOSURES}
              optionKeyPrefix="course:quizAuthoring.settings.disclosure"
            />
          </div>
          <SwitchSetting
            name="showExplanations"
            labelKey="course:quizAuthoring.settings.fields.showExplanations.label"
            descriptionKey="course:quizAuthoring.settings.fields.showExplanations.description"
          />
        </SettingsCard>

        {/* Integrity */}
        <SettingsCard
          icon={
            <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden />
          }
          titleKey="course:quizAuthoring.settings.integrity.title"
          descriptionKey="course:quizAuthoring.settings.integrity.description"
        >
          <FormField
            control={control}
            name="integrityMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t(
                    'course:quizAuthoring.settings.fields.integrityMode.label'
                  )}
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="sm:max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(['off', 'monitor', 'warn', 'strict'] as const).map(
                      (mode) => (
                        <SelectItem key={mode} value={mode}>
                          {t(
                            `course:quizAuthoring.settings.fields.integrityMode.options.${mode}`
                          )}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t(
                    `course:quizAuthoring.settings.fields.integrityMode.descriptions.${integrityMode}`
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {integrityMode !== 'off' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberSetting
                  name="maxViolations"
                  labelKey="course:quizAuthoring.settings.fields.maxViolations.label"
                  descriptionKey={
                    integrityMode === 'strict'
                      ? 'course:quizAuthoring.settings.fields.maxViolations.descriptionStrict'
                      : integrityMode === 'warn'
                        ? 'course:quizAuthoring.settings.fields.maxViolations.descriptionWarn'
                        : 'course:quizAuthoring.settings.fields.maxViolations.descriptionMonitor'
                  }
                  min={MIN_QUIZ_MAX_VIOLATIONS}
                  max={MAX_QUIZ_MAX_VIOLATIONS}
                />
              </div>
              <SwitchSetting
                name="requireFullscreen"
                labelKey="course:quizAuthoring.settings.fields.requireFullscreen.label"
                descriptionKey="course:quizAuthoring.settings.fields.requireFullscreen.description"
              />
            </>
          ) : (
            <p
              className="text-sm text-muted-foreground"
              data-testid="fullscreen-requires-integrity"
            >
              {t(
                'course:quizAuthoring.settings.fields.requireFullscreen.offHint'
              )}
            </p>
          )}
        </SettingsCard>

        {/* Progression */}
        <SettingsCard
          icon={<Flag className="size-4" strokeWidth={1.75} aria-hidden />}
          titleKey="course:quizAuthoring.settings.progression.title"
          descriptionKey="course:quizAuthoring.settings.progression.description"
        >
          <SwitchSetting
            name="requiredToProgress"
            labelKey="course:quizAuthoring.settings.fields.requiredToProgress.label"
            descriptionKey="course:quizAuthoring.settings.fields.requiredToProgress.description"
          />
        </SettingsCard>
      </AdvancedOptionsDisclosure>
    </div>
  );
}

/* ---------- building blocks ---------- */

interface SettingsCardProps {
  readonly icon: ReactNode;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly children: ReactNode;
}

function SettingsCard({
  icon,
  titleKey,
  descriptionKey,
  children,
}: SettingsCardProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-muted-foreground">{icon}</span>
          {t(titleKey)}
        </CardTitle>
        <CardDescription>{t(descriptionKey)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

interface SelectSettingProps {
  readonly name: SettingsField;
  readonly labelKey: string;
  readonly descriptionKey: string;
  readonly options: readonly string[];
  /** `${optionKeyPrefix}.${value}` is the label of each option. */
  readonly optionKeyPrefix: string;
}

function SelectSetting({
  name,
  labelKey,
  descriptionKey,
  options,
  optionKeyPrefix,
}: SelectSettingProps): JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<QuizAuthoringFormData>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={String(field.value ?? '')}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`${optionKeyPrefix}.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>{t(descriptionKey)}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface NumberSettingProps {
  readonly name: SettingsField;
  readonly labelKey: string;
  readonly descriptionKey: string;
  readonly min?: number;
  readonly max?: number;
  readonly placeholderKey?: string;
}

function NumberSetting({
  name,
  labelKey,
  descriptionKey,
  min,
  max,
  placeholderKey,
}: NumberSettingProps): JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<QuizAuthoringFormData>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={1}
              placeholder={placeholderKey ? t(placeholderKey) : undefined}
              {...field}
              value={
                field.value === undefined || field.value === null
                  ? ''
                  : String(field.value)
              }
            />
          </FormControl>
          <FormDescription>{t(descriptionKey)}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface DateTimeSettingProps {
  readonly name: SettingsField;
  readonly labelKey: string;
  readonly descriptionKey: string;
}

function DateTimeSetting({
  name,
  labelKey,
  descriptionKey,
}: DateTimeSettingProps): JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<QuizAuthoringFormData>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              {...field}
              value={String(field.value ?? '')}
            />
          </FormControl>
          <FormDescription>{t(descriptionKey)}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface SwitchSettingProps {
  readonly name: SettingsField;
  readonly labelKey: string;
  readonly descriptionKey: string;
  readonly disabled?: boolean;
}

function SwitchSetting({
  name,
  labelKey,
  descriptionKey,
  disabled,
}: SwitchSettingProps): JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<QuizAuthoringFormData>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            'flex items-center justify-between gap-4 rounded-md border border-border p-3',
            disabled && 'opacity-60'
          )}
        >
          <div className="space-y-0.5">
            <FormLabel>{t(labelKey)}</FormLabel>
            <FormDescription>{t(descriptionKey)}</FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={!!field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              aria-label={t(labelKey)}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

/* ---------- page-boundary converters ---------- */

function toIsoOrNull(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** The stored settings block → form values (minutes, `datetime-local`). */
export function quizSettingsToFormValues(
  settings: QuizSettingsAuthoring
): QuizSettingsFormData {
  return {
    mode: settings.mode,
    timeLimitMinutes:
      settings.timeLimitSeconds === null
        ? undefined
        : Math.round(settings.timeLimitSeconds / 60),
    availableFrom: settings.availableFrom
      ? toDateTimeLocalValue(settings.availableFrom)
      : '',
    availableUntil: settings.availableUntil
      ? toDateTimeLocalValue(settings.availableUntil)
      : '',
    dueAt: settings.dueAt ? toDateTimeLocalValue(settings.dueAt) : '',
    latePolicy: settings.latePolicy,
    gradingPolicy: settings.gradingPolicy,
    shuffleQuestions: settings.shuffleQuestions,
    shuffleOptions: settings.shuffleOptions,
    questionsPerAttempt: settings.questionsPerAttempt ?? undefined,
    layout: settings.layout,
    showScore: settings.showScore,
    showAnswers: settings.showAnswers,
    showExplanations: settings.showExplanations,
    integrityMode: settings.integrityMode,
    maxViolations: settings.maxViolations,
    requireFullscreen: settings.requireFullscreen,
    requiredToProgress: settings.requiredToProgress,
    requiredForCompletion: settings.requiredForCompletion,
    hideTimer: settings.hideTimer,
  };
}

/**
 * Form values → the flat settings the create/update payload carries.
 * Every setting is sent; `null` clears the time limit, a date or the
 * per-attempt question count on the server.
 */
export function quizSettingsFormToPayload(
  data: QuizSettingsFormData
): QuizSettingsInput {
  return {
    mode: data.mode,
    timeLimitSeconds:
      data.timeLimitMinutes === undefined ? null : data.timeLimitMinutes * 60,
    availableFrom: toIsoOrNull(data.availableFrom),
    availableUntil: toIsoOrNull(data.availableUntil),
    dueAt: toIsoOrNull(data.dueAt),
    latePolicy: data.latePolicy,
    gradingPolicy: data.gradingPolicy,
    shuffleQuestions: data.shuffleQuestions,
    shuffleOptions: data.shuffleOptions,
    questionsPerAttempt: data.questionsPerAttempt ?? null,
    layout: data.layout,
    showScore: data.showScore,
    showAnswers: data.showAnswers,
    showExplanations: data.showExplanations,
    integrityMode: data.integrityMode,
    maxViolations: data.maxViolations,
    requireFullscreen: data.requireFullscreen,
    requiredToProgress: data.requiredToProgress,
    requiredForCompletion: data.requiredForCompletion,
    hideTimer: data.hideTimer,
  };
}
