/**
 * General Settings Component.
 *
 * Prompt 13 replacement for the Prompt 3A scaffold — the form used to
 * show a success toast on every submit regardless of whether anything
 * was actually persisted (no mutation existed at all). Now backed by
 * `usePlatformSettings`/`useUpdatePlatformSettings`, with real
 * loading/saving/success/error/retry and dirty-state reset/cancel.
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
import { usePlatformSettings, useUpdatePlatformSettings } from '../hooks';
import { generalSettingsSchema, type GeneralSettingsFormData } from '../schemas/settings.schemas';

export function GeneralSettings(): JSX.Element {
  const { t } = useTranslation();
  const { data: settings, isLoading, error, refetch } = usePlatformSettings();
  const updateSettings = useUpdatePlatformSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: { platformName: '', platformDescription: '', supportEmail: '' },
  });

  useEffect(() => {
    if (settings) {
      reset({
        platformName: settings.platformName,
        platformDescription: settings.platformDescription ?? '',
        supportEmail: settings.supportEmail ?? '',
      });
    }
  }, [settings, reset]);

  const onSubmit = (data: GeneralSettingsFormData) => {
    updateSettings.mutate(
      {
        platformName: data.platformName,
        platformDescription: data.platformDescription || undefined,
        supportEmail: data.supportEmail || undefined,
      },
      {
        onSuccess: (updated) => {
          reset({
            platformName: updated.platformName,
            platformDescription: updated.platformDescription ?? '',
            supportEmail: updated.supportEmail ?? '',
          });
        },
      }
    );
  };

  const handleCancel = () => {
    if (settings) {
      reset({
        platformName: settings.platformName,
        platformDescription: settings.platformDescription ?? '',
        supportEmail: settings.supportEmail ?? '',
      });
    }
  };

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
          <ErrorState onRetry={() => refetch()} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings:general.title')}</CardTitle>
        <CardDescription>{t('settings:general.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {updateSettings.error ? <ErrorState onRetry={handleSubmit(onSubmit)} /> : null}

          <div className="space-y-2">
            <Label htmlFor="platform-name">{t('settings:general.platformName')}</Label>
            <Input
              id="platform-name"
              placeholder={t('settings:general.platformNamePlaceholder')}
              {...register('platformName')}
            />
            {errors.platformName ? (
              <p className="text-sm text-destructive">{t(errors.platformName.message ?? '')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform-description">
              {t('settings:general.platformDescription')}
            </Label>
            <Textarea
              id="platform-description"
              rows={4}
              placeholder={t('settings:general.platformDescriptionPlaceholder')}
              {...register('platformDescription')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-email">{t('settings:general.supportEmail')}</Label>
            <Input
              id="support-email"
              type="email"
              placeholder={t('settings:general.supportEmailPlaceholder')}
              {...register('supportEmail')}
            />
            {errors.supportEmail ? (
              <p className="text-sm text-destructive">{t(errors.supportEmail.message ?? '')}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            {isDirty ? (
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t('settings:actions.cancel')}
              </Button>
            ) : null}
            <Button type="submit" disabled={!isDirty || updateSettings.isPending}>
              {updateSettings.isPending ? t('settings:actions.saving') : t('settings:actions.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
