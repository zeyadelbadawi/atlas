/**
 * Security Settings Component.
 *
 * Prompt 13 replacement for the Prompt 3A scaffold — the `<Switch>` and
 * `<Select>` were both decorative (no `checked`/`onCheckedChange`, no
 * `onValueChange`, no persistence). Now backed by the same
 * `usePlatformSettings`/`useUpdatePlatformSettings` contract
 * `GeneralSettings` uses, saving immediately on change like
 * `NotificationSettings`.
 */
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { usePlatformSettings, useUpdatePlatformSettings } from '../hooks';
import type { PlatformSessionTimeout } from '@types';

const SESSION_TIMEOUT_VALUES: readonly PlatformSessionTimeout[] = [15, 30, 60, 'never'];

export function SecuritySettings(): JSX.Element {
  const { t } = useTranslation();
  const { data: settings, isLoading, error, refetch } = usePlatformSettings();
  const updateSettings = useUpdatePlatformSettings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:security.title')}</CardTitle>
          <CardDescription>{t('settings:security.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:security.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState onRetry={() => refetch()} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:security.title')}</CardTitle>
          <CardDescription>{t('settings:security.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {updateSettings.error ? <ErrorState onRetry={() => updateSettings.reset()} /> : null}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="two-factor">{t('settings:security.twoFactorAuth')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings:security.twoFactorAuthDescription')}
              </p>
            </div>
            <Switch
              id="two-factor"
              checked={settings.twoFactorRequired}
              onCheckedChange={(checked) => updateSettings.mutate({ twoFactorRequired: checked })}
              disabled={updateSettings.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('settings:security.sessionTimeout')}</Label>
            <Select
              value={String(settings.sessionTimeoutMinutes)}
              onValueChange={(value) =>
                updateSettings.mutate({
                  sessionTimeoutMinutes: (value === 'never' ? 'never' : Number(value)) as PlatformSessionTimeout,
                })
              }
              disabled={updateSettings.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TIMEOUT_VALUES.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {t(`settings:security.timeout${value === 'never' ? 'Never' : value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
