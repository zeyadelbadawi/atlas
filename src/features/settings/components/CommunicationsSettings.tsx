/**
 * Communications tab of platform settings (P66).
 *
 * The platform-owner side of emailed sign-in codes and email delivery:
 *
 *  - the OTP policy for management sign-ins, and the default an academy
 *    starts from (each academy may override its own);
 *  - how long "Remember this device" lasts on each surface;
 *  - the local hour digests go out;
 *  - the quota percentages at which an alert is raised;
 *  - which email providers are configured, in what order, and which one
 *    is active — READ-ONLY, and never anything secret: the backend
 *    reports names and a from-address, never a key.
 *
 * Saved as one validated form rather than field-by-field: the two
 * trusted-device windows and the thresholds are the kind of thing an
 * owner adjusts together, and a half-saved pair would be worse than an
 * unsaved one. Client validation mirrors the backend ranges so the
 * common mistakes never leave the browser; server violations still land
 * on their field through `useServerValidation`.
 */
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Save, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorState } from '@components/feedback';
import { useToast } from '@app/providers';
import { useServerValidation } from '@forms';
import {
  usePlatformCommunicationSettings,
  useUpdatePlatformCommunicationSettings,
} from '../hooks';
import {
  communicationSettingsSchema,
  EMAIL_OTP_POLICY_VALUES,
  type CommunicationSettingsFormData,
} from '../schemas/settings.schemas';
import type {
  EmailProviderStatus,
  PlatformCommunicationSettings,
} from '@types';

function toFormValues(
  settings: PlatformCommunicationSettings
): CommunicationSettingsFormData {
  return {
    emailOtpPolicyManagement: settings.emailOtpPolicyManagement,
    emailOtpPolicyAcademyDefault: settings.emailOtpPolicyAcademyDefault,
    trustedDeviceDaysManagement: settings.trustedDeviceDaysManagement,
    trustedDeviceDaysAcademy: settings.trustedDeviceDaysAcademy,
    digestHourLocal: settings.digestHourLocal,
    quotaAlertThresholds: [...settings.quotaAlertThresholds].sort(
      (a, b) => a - b
    ),
  };
}

interface PolicyFieldProps {
  readonly name: 'emailOtpPolicyManagement' | 'emailOtpPolicyAcademyDefault';
  readonly value: CommunicationSettingsFormData[PolicyFieldProps['name']];
  readonly onChange: (value: string) => void;
  readonly disabled: boolean;
}

function PolicyField({
  name,
  value,
  onChange,
  disabled,
}: PolicyFieldProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">
        {t(`settings:communications.${name}.label`)}
      </legend>
      <p className="text-xs text-muted-foreground">
        {t(`settings:communications.${name}.description`)}
      </p>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        aria-label={t(`settings:communications.${name}.label`)}
        className="flex flex-wrap gap-3"
      >
        {EMAIL_OTP_POLICY_VALUES.map((policy) => (
          <div key={policy} className="flex items-center gap-2">
            <RadioGroupItem value={policy} id={`${name}-${policy}`} />
            <Label htmlFor={`${name}-${policy}`} className="font-normal">
              {t(`settings:communications.otpPolicies.${policy}`)}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

function ProviderStatusList({
  providers,
}: {
  readonly providers: readonly EmailProviderStatus[];
}): JSX.Element {
  const { t } = useTranslation();

  if (providers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('settings:communications.providers.none')}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {providers.map((provider, index) => (
        <li
          key={`${provider.active ?? 'none'}-${index}`}
          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">
              {t('settings:communications.providers.order')}:{' '}
              <span className="font-normal" dir="ltr">
                {provider.order.length > 0
                  ? provider.order.join(' → ')
                  : t('settings:communications.providers.noOrder')}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('settings:communications.providers.active')}:{' '}
              <span dir="ltr">
                {provider.active ??
                  t('settings:communications.providers.noneActive')}
              </span>
              {' · '}
              {t('settings:communications.providers.fromEmail')}:{' '}
              <span dir="ltr">
                {provider.fromEmail ??
                  t('settings:communications.providers.noFromEmail')}
              </span>
            </p>
          </div>
          <Badge variant={provider.configured ? 'secondary' : 'outline'}>
            {provider.configured
              ? t('settings:communications.providers.configured')
              : t('settings:communications.providers.notConfigured')}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function CommunicationsSettings(): JSX.Element {
  const { t } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = usePlatformCommunicationSettings();
  const update = useUpdatePlatformCommunicationSettings();
  const [thresholdDraft, setThresholdDraft] = useState('');
  const [thresholdDraftError, setThresholdDraftError] = useState<string | null>(
    null
  );

  const form = useForm<CommunicationSettingsFormData>({
    resolver: zodResolver(communicationSettingsSchema),
    defaultValues: {
      emailOtpPolicyManagement: 'new_device',
      emailOtpPolicyAcademyDefault: 'new_device',
      trustedDeviceDaysManagement: 90,
      trustedDeviceDaysAcademy: 90,
      digestHourLocal: 8,
      quotaAlertThresholds: [],
    },
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
  } = form;

  useEffect(() => {
    if (settings) reset(toFormValues(settings));
  }, [settings, reset]);

  useServerValidation(form, update.error ?? null);

  const thresholds = watch('quotaAlertThresholds');
  const isSaving = update.isPending;

  const addThreshold = (): void => {
    const parsed = Number(thresholdDraft.trim());
    if (
      thresholdDraft.trim() === '' ||
      !Number.isInteger(parsed) ||
      parsed < 1 ||
      parsed > 100
    ) {
      setThresholdDraftError(
        'settings:communications.errors.quotaThresholdRange'
      );
      return;
    }
    const current = getValues('quotaAlertThresholds');
    if (current.includes(parsed)) {
      setThresholdDraftError(
        'settings:communications.errors.quotaThresholdsUnique'
      );
      return;
    }
    setValue(
      'quotaAlertThresholds',
      [...current, parsed].sort((a, b) => a - b),
      { shouldDirty: true, shouldValidate: true }
    );
    setThresholdDraft('');
    setThresholdDraftError(null);
  };

  const removeThreshold = (value: number): void => {
    setValue(
      'quotaAlertThresholds',
      getValues('quotaAlertThresholds').filter((item) => item !== value),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onSubmit = (data: CommunicationSettingsFormData): void => {
    update.mutate(data, {
      onSuccess: (saved) => {
        reset(toFormValues(saved));
        notifySuccess('settings:communications.saved');
      },
      onError: (err) => {
        // Field violations land on their inputs via `useServerValidation`;
        // anything else gets the generic failure.
        if (err.kind !== 'validation') {
          notifyError('settings:communications.saveFailed');
        }
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:communications.title')}</CardTitle>
          <CardDescription>
            {t('settings:communications.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" aria-busy>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:communications.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState kind={error?.kind} onRetry={() => refetch()} />
        </CardContent>
      </Card>
    );
  }

  // Deployment configuration, not stored data, until these become
  // editable server-side — shown as-is, never offered for saving.
  const readOnly = settings.editable === false;

  const fieldError = (message: string | undefined): JSX.Element | null =>
    message ? (
      <p className="text-sm text-destructive" role="alert">
        {t(message)}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:communications.title')}</CardTitle>
          <CardDescription>
            {t('settings:communications.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {readOnly ? (
            <Alert role="status">
              <AlertDescription>
                {t('settings:communications.readOnlyNotice')}
              </AlertDescription>
            </Alert>
          ) : null}
          {update.error && update.error.kind !== 'validation' ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                {t('settings:communications.saveFailed')}
              </AlertDescription>
            </Alert>
          ) : null}

          <Controller
            control={control}
            name="emailOtpPolicyManagement"
            render={({ field }) => (
              <PolicyField
                name="emailOtpPolicyManagement"
                value={field.value}
                onChange={field.onChange}
                disabled={isSaving || readOnly}
              />
            )}
          />

          <Controller
            control={control}
            name="emailOtpPolicyAcademyDefault"
            render={({ field }) => (
              <PolicyField
                name="emailOtpPolicyAcademyDefault"
                value={field.value}
                onChange={field.onChange}
                disabled={isSaving || readOnly}
              />
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trusted-device-days-management">
                {t('settings:communications.trustedDeviceDaysManagement')}
              </Label>
              <Input
                id="trusted-device-days-management"
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                step={1}
                disabled={isSaving || readOnly}
                aria-invalid={!!errors.trustedDeviceDaysManagement}
                aria-describedby="trusted-device-days-hint"
                {...register('trustedDeviceDaysManagement')}
              />
              {fieldError(errors.trustedDeviceDaysManagement?.message)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="trusted-device-days-academy">
                {t('settings:communications.trustedDeviceDaysAcademy')}
              </Label>
              <Input
                id="trusted-device-days-academy"
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                step={1}
                disabled={isSaving || readOnly}
                aria-invalid={!!errors.trustedDeviceDaysAcademy}
                aria-describedby="trusted-device-days-hint"
                {...register('trustedDeviceDaysAcademy')}
              />
              {fieldError(errors.trustedDeviceDaysAcademy?.message)}
            </div>
            <p
              id="trusted-device-days-hint"
              className="text-xs text-muted-foreground sm:col-span-2"
            >
              {t('settings:communications.trustedDeviceDaysHint')}
            </p>
          </div>

          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="digest-hour-local">
              {t('settings:communications.digestHourLocal')}
            </Label>
            <Input
              id="digest-hour-local"
              type="number"
              inputMode="numeric"
              min={0}
              max={23}
              step={1}
              disabled={isSaving || readOnly}
              aria-invalid={!!errors.digestHourLocal}
              aria-describedby="digest-hour-hint"
              {...register('digestHourLocal')}
            />
            <p id="digest-hour-hint" className="text-xs text-muted-foreground">
              {t('settings:communications.digestHourHint')}
            </p>
            {fieldError(errors.digestHourLocal?.message)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings:communications.quota.title')}</CardTitle>
          <CardDescription>
            {t('settings:communications.quota.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul
            className="flex flex-wrap gap-2"
            aria-label={t('settings:communications.quota.listLabel')}
          >
            {thresholds.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                {t('settings:communications.quota.empty')}
              </li>
            ) : (
              thresholds.map((value) => (
                <li key={value}>
                  <Badge
                    variant="secondary"
                    className="gap-1 ps-2.5 pe-1 text-sm font-normal"
                  >
                    <span dir="ltr">{value}%</span>
                    <button
                      type="button"
                      className="rounded-pill p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      onClick={() => removeThreshold(value)}
                      disabled={isSaving || readOnly}
                      aria-label={t('settings:communications.quota.remove', {
                        value,
                      })}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </Badge>
                </li>
              ))
            )}
          </ul>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-2">
              <Label htmlFor="quota-threshold-draft">
                {t('settings:communications.quota.addLabel')}
              </Label>
              <Input
                id="quota-threshold-draft"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                step={1}
                className="w-32"
                value={thresholdDraft}
                disabled={isSaving || readOnly}
                aria-invalid={!!thresholdDraftError}
                aria-describedby="quota-threshold-draft-error"
                onChange={(event) => {
                  setThresholdDraft(event.target.value);
                  setThresholdDraftError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addThreshold();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addThreshold}
              disabled={isSaving || readOnly}
            >
              <Plus className="me-2 size-4" aria-hidden />
              {t('settings:communications.quota.add')}
            </Button>
          </div>
          <div id="quota-threshold-draft-error">
            {fieldError(thresholdDraftError ?? undefined)}
            {fieldError(errors.quotaAlertThresholds?.message)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings:communications.providers.title')}</CardTitle>
          <CardDescription>
            {t('settings:communications.providers.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderStatusList providers={settings.providerStatus} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3" hidden={readOnly}>
        <Button
          type="button"
          variant="outline"
          onClick={() => reset(toFormValues(settings))}
          disabled={!isDirty || isSaving}
        >
          {t('settings:actions.cancel')}
        </Button>
        <Button type="submit" disabled={!isDirty || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('settings:actions.saving')}
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden />
              {t('settings:actions.save')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
