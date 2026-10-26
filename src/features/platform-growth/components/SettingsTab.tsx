/**
 * G1 — Settings tab: the season, the owner's weekly capacity and the
 * hiring thresholds that the Capacity tab measures against. Saved with
 * the version it was loaded at; a 409 keeps what was typed and offers to
 * load the newer version. Leaving the page (or the app) with unsaved
 * changes asks first (`useUnsavedChanges`); switching tabs keeps the draft.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { ErrorState } from '@components/feedback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@app/providers';
import { useDateFormatter, useLanguage, useUnsavedChanges } from '@hooks';
import { formatNumber, toErrorsNamespaceKey } from '@utils';
import type { ApiError } from '@api';
import {
  useGrowthSettings,
  useUpdateGrowthSettings,
} from '../hooks/usePlatformGrowth';
import type { GrowthSettings, GrowthSettingsFields } from '../types';
import {
  K,
  SETTINGS_LIMITS,
  isStaleError,
  settingsChanges,
  settingsDraftOf,
  validateSettings,
  type SettingsDraft,
} from '../utils/growth.utils';
import { Field } from './parts';

type FieldName = keyof GrowthSettingsFields;
type NumericField = keyof typeof SETTINGS_LIMITS;

const SECTIONS: readonly {
  readonly id: string;
  readonly fields: readonly FieldName[];
}[] = [
  { id: 'season', fields: ['seasonStart', 'seasonEnd'] },
  {
    id: 'capacity',
    fields: [
      'weeklyOwnerHours',
      'onboardingCapPerWeek',
      'minutesPerOnboarding',
      'supportMinutesPerPayingOrgPerWeek',
    ],
  },
  { id: 'hiring', fields: ['hireWarnPayingOrgs', 'hireNowPayingOrgs'] },
];

const FIELD_ORDER = SECTIONS.flatMap((section) => section.fields);

/** The draft moved onto a newer saved version: untouched fields follow it. */
export function rebaseDraft(
  draft: SettingsDraft,
  before: SettingsDraft,
  after: SettingsDraft
): SettingsDraft {
  const next = { ...draft };
  for (const field of FIELD_ORDER) {
    if (draft[field] === before[field]) next[field] = after[field];
  }
  return next;
}

function SettingsForm({
  settings,
  onReload,
}: {
  readonly settings: GrowthSettings;
  readonly onReload: () => Promise<unknown>;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const { notifySuccess, notifyError } = useToast();
  const update = useUpdateGrowthSettings();
  const [saved, setSaved] = useState<GrowthSettings>(settings);
  const [draft, setDraft] = useState<SettingsDraft>(() =>
    settingsDraftOf(settings)
  );
  const [submitted, setSubmitted] = useState(false);
  const [conflict, setConflict] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // A newer version arriving from the server (after a reload) becomes the
  // baseline. Fields the owner had not touched take the newer values;
  // fields they changed keep what they typed.
  const savedRef = useRef(saved);
  savedRef.current = saved;
  useEffect(() => {
    const previous = savedRef.current;
    if (previous.version === settings.version) return;
    const before = settingsDraftOf(previous);
    const after = settingsDraftOf(settings);
    setDraft((existing) => rebaseDraft(existing, before, after));
    setSaved(settings);
  }, [settings]);

  const errors = validateSettings(draft);
  const shown = submitted ? errors : {};
  const changes = useMemo(() => settingsChanges(draft, saved), [draft, saved]);
  const baseline = settingsDraftOf(saved);
  const dirty = FIELD_ORDER.some((field) => draft[field] !== baseline[field]);

  async function save(): Promise<boolean> {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return false;
    }
    if (Object.keys(changes).length === 0) return true;
    try {
      const next = await update.mutateAsync({
        ...changes,
        version: saved.version,
      });
      markSaved();
      setSaved(next);
      setDraft(settingsDraftOf(next));
      setSubmitted(false);
      setConflict(false);
      return true;
    } catch (error) {
      const apiError = error as ApiError;
      if (isStaleError(apiError)) {
        setConflict(true);
      } else {
        notifyError(
          `${K}common.failed`,
          apiError.messageKey
            ? toErrorsNamespaceKey(apiError.messageKey)
            : undefined
        );
      }
      return false;
    }
  }

  const { markSaved } = useUnsavedChanges({
    isDirty: dirty,
    onSave: save,
  });

  const reloadLatest = async () => {
    await onReload();
    setConflict(false);
  };

  const discard = () => {
    setDraft(settingsDraftOf(saved));
    setSubmitted(false);
  };

  const limitsOf = (field: NumericField) => ({
    min: formatNumber(SETTINGS_LIMITS[field].min, language),
    max: formatNumber(SETTINGS_LIMITS[field].max, language),
  });

  const renderField = (field: FieldName) => {
    const error = shown[field] ? t(`${K}${shown[field]}`) : undefined;
    if (field === 'seasonStart' || field === 'seasonEnd') {
      return (
        <Field
          key={field}
          id={`growth-${field}`}
          label={t(`${K}settings.fields.${field}.label`)}
          hint={t(`${K}settings.fields.${field}.hint`)}
          error={error}
        >
          <Input
            type="date"
            className="h-11"
            value={draft[field]}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                [field]: event.target.value,
              }))
            }
          />
        </Field>
      );
    }
    const limits = SETTINGS_LIMITS[field];
    return (
      <Field
        key={field}
        id={`growth-${field}`}
        label={t(`${K}settings.fields.${field}.label`)}
        hint={t(`${K}settings.fields.${field}.hint`, limitsOf(field))}
        error={error}
      >
        <Input
          type="number"
          inputMode={field === 'weeklyOwnerHours' ? 'decimal' : 'numeric'}
          min={limits.min}
          max={limits.max}
          step={limits.step}
          dir="ltr"
          className="h-11"
          value={draft[field]}
          onChange={(event) =>
            setDraft((current) => ({ ...current, [field]: event.target.value }))
          }
        />
      </Field>
    );
  };

  const errorFields = FIELD_ORDER.filter((field) => shown[field]);

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save().then((ok) => {
          if (ok) notifySuccess(`${K}settings.toasts.saved`);
        });
      }}
    >
      {conflict ? (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>{t(`${K}common.conflictTitle`)}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{t(`${K}settings.conflictBody`)}</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => void reloadLatest()}
            >
              <RotateCcw className="size-4" aria-hidden />
              {t(`${K}settings.reload`)}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {errorFields.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive-surface p-4 text-sm"
        >
          <p className="font-semibold text-destructive">
            {t(`${K}settings.errorSummary`)}
          </p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            {errorFields.map((field) => (
              <li key={field}>
                <a
                  href={`#growth-${field}`}
                  className="text-foreground underline underline-offset-2"
                >
                  {t(`${K}settings.fields.${field}.label`)}:{' '}
                  {t(`${K}${shown[field]}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t(`${K}settings.sections.${section.id}.title`)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(`${K}settings.sections.${section.id}.description`)}
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {section.fields.map(renderField)}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {saved.updatedByName
            ? t(`${K}settings.lastSavedBy`, {
                date: fmt.dateTime(saved.updatedAt),
                name: saved.updatedByName,
              })
            : t(`${K}settings.lastSaved`, {
                date: fmt.dateTime(saved.updatedAt),
              })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={!dirty || update.isPending}
            onClick={discard}
          >
            {t(`${K}settings.discard`)}
          </Button>
          <Button
            type="submit"
            className="min-h-11"
            disabled={update.isPending || conflict}
          >
            {update.isPending ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : null}
            {t(`${K}settings.save`)}
          </Button>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {dirty ? t(`${K}settings.unsaved`) : ''}
      </p>
    </form>
  );
}

export function SettingsTab(): JSX.Element {
  const settings = useGrowthSettings();
  if (settings.error) {
    return (
      <ErrorState
        kind={settings.error.kind}
        onRetry={() => void settings.refetch()}
      />
    );
  }
  if (settings.isLoading || !settings.data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }
  return (
    <SettingsForm
      settings={settings.data}
      onReload={() => settings.refetch()}
    />
  );
}
