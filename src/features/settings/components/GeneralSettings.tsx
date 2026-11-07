/**
 * General Settings Component.
 *
 * Prompt 13 replacement for the Prompt 3A scaffold — the form used to
 * show a success toast on every submit regardless of whether anything
 * was actually persisted (no mutation existed at all). Now backed by
 * `usePlatformSettings`/`useUpdatePlatformSettings`, with real
 * loading/saving/success/error/retry and dirty-state reset/cancel.
 *
 * B1 (UX audit):
 *   - V18 — the backend's length limits are checked before sending and a
 *     400 lands on its field, instead of "Unexpected error".
 *   - V20 — any other failure is ONE inline message with the real reason
 *     (the mutation is `inlineErrors`, so no toast repeats it).
 *   - V27 — leaving with unsaved text warns first, and `SettingsPage`
 *     keeps this tab mounted, so switching tabs keeps the draft.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import { saveViaForm } from '@utils';
import type { PlatformConfiguration } from '@types';
import { usePlatformSettings, useUpdatePlatformSettings } from '../hooks';
import {
  PLATFORM_DESCRIPTION_MAX_LENGTH,
  generalSettingsSchema,
  type GeneralSettingsFormData,
} from '../schemas/settings.schemas';
import { fieldErrorText, hasViolationOn, useFocusFirstViolation } from '@forms';
import { RequiredMark, SaveFailedAlert } from '@forms';

/** API fields this form shows a violation beside, with their labels. */
const FIELD_LABELS = {
  platformName: 'settings:general.platformName',
  platformDescription: 'settings:general.platformDescription',
  supportEmail: 'settings:general.supportEmail',
} as const;

function toFormValues(
  settings: PlatformConfiguration
): GeneralSettingsFormData {
  return {
    platformName: settings.platformName,
    platformDescription: settings.platformDescription ?? '',
    supportEmail: settings.supportEmail ?? '',
  };
}

function toPayload(
  data: GeneralSettingsFormData
): Partial<PlatformConfiguration> {
  return {
    platformName: data.platformName,
    platformDescription: data.platformDescription || undefined,
    supportEmail: data.supportEmail || undefined,
  };
}

export function GeneralSettings(): JSX.Element {
  const { t } = useTranslation();
  const { data: settings, isLoading, error, refetch } = usePlatformSettings();
  const updateSettings = useUpdatePlatformSettings();

  const form = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      platformName: '',
      platformDescription: '',
      supportEmail: '',
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = form;

  useEffect(() => {
    if (settings) {
      // A refetch (after a save, or a reconnect) never wipes what the
      // person is still typing.
      reset(toFormValues(settings), { keepDirtyValues: true });
    }
  }, [settings, reset]);

  useServerValidation(form, updateSettings.error, { labels: FIELD_LABELS });
  useFocusFirstViolation(form, updateSettings.error, FIELD_LABELS);
  const saveFailure =
    updateSettings.error && !hasViolationOn(updateSettings.error, FIELD_LABELS)
      ? updateSettings.error
      : null;

  const onSubmit = (data: GeneralSettingsFormData) => {
    updateSettings.mutate(toPayload(data), {
      onSuccess: (updated) => {
        reset(toFormValues(updated));
      },
    });
  };

  // "Save and leave" in the unsaved-changes dialog: the same save, awaited.
  useUnsavedChanges({
    isDirty,
    onSave: () =>
      saveViaForm({ handleSubmit }, async (data: GeneralSettingsFormData) => {
        try {
          const updated = await updateSettings.mutateAsync(toPayload(data));
          reset(toFormValues(updated));
          return true;
        } catch {
          return false;
        }
      }),
  });

  const handleCancel = () => {
    if (settings) {
      reset(toFormValues(settings));
    }
    updateSettings.reset();
  };

  const descriptionLength = watch('platformDescription')?.length ?? 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:general.title')}</CardTitle>
          <CardDescription>{t('settings:general.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:general.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState kind={error?.kind} onRetry={() => refetch()} />
        </CardContent>
      </Card>
    );
  }

  const nameLabel = t('settings:general.platformName');
  const descriptionLabel = t('settings:general.platformDescription');
  const emailLabel = t('settings:general.supportEmail');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings:general.title')}</CardTitle>
        <CardDescription>{t('settings:general.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* `noValidate`: the app's own message, in the page's language,
            not the browser's English bubble over it (V19). */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="platform-name">
              {nameLabel}
              <RequiredMark />
            </Label>
            <Input
              id="platform-name"
              placeholder={t('settings:general.platformNamePlaceholder')}
              aria-required
              aria-invalid={!!errors.platformName}
              aria-describedby={
                errors.platformName ? 'platform-name-error' : undefined
              }
              {...register('platformName')}
            />
            {errors.platformName ? (
              <p
                id="platform-name-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {fieldErrorText(t, errors.platformName.message, nameLabel)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform-description">{descriptionLabel}</Label>
            <Textarea
              id="platform-description"
              rows={4}
              placeholder={t('settings:general.platformDescriptionPlaceholder')}
              aria-invalid={!!errors.platformDescription}
              aria-describedby={[
                errors.platformDescription
                  ? 'platform-description-error'
                  : null,
                'platform-description-count',
              ]
                .filter(Boolean)
                .join(' ')}
              {...register('platformDescription')}
            />
            <p
              id="platform-description-count"
              className={
                descriptionLength > PLATFORM_DESCRIPTION_MAX_LENGTH
                  ? 'text-xs font-medium text-destructive'
                  : 'text-xs text-muted-foreground'
              }
            >
              {t('settings:general.characterCount', {
                count: descriptionLength,
                max: PLATFORM_DESCRIPTION_MAX_LENGTH,
              })}
            </p>
            {errors.platformDescription ? (
              <p
                id="platform-description-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {fieldErrorText(
                  t,
                  errors.platformDescription.message,
                  descriptionLabel
                )}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-email">{emailLabel}</Label>
            <Input
              id="support-email"
              type="email"
              autoComplete="email"
              placeholder={t('settings:general.supportEmailPlaceholder')}
              aria-invalid={!!errors.supportEmail}
              aria-describedby={
                errors.supportEmail ? 'support-email-error' : undefined
              }
              {...register('supportEmail')}
            />
            {errors.supportEmail ? (
              <p
                id="support-email-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {fieldErrorText(t, errors.supportEmail.message, emailLabel)}
              </p>
            ) : null}
          </div>

          {saveFailure ? (
            <SaveFailedAlert
              error={saveFailure}
              titleKey="settings:messages.notSaved"
              onRetry={handleSubmit(onSubmit)}
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isDirty ? (
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t('settings:actions.cancel')}
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={!isDirty || updateSettings.isPending}
            >
              {updateSettings.isPending
                ? t('settings:actions.saving')
                : t('settings:actions.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
