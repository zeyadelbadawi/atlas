/**
 * Notification Settings Component.
 *
 * Prompt 13 replacement for the Prompt 3A scaffold — every `<Switch>` was
 * decorative (`defaultChecked`, no `onCheckedChange`, no persistence).
 * Now backed by the real `NotificationPreferences {email, push, sms}`
 * contract (`identity.types.ts`) and a real mutation.
 */
import { useEffect, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@features/notifications';
import type { NotificationPreferences } from '@types';

export function NotificationSettings(): JSX.Element {
  const { t } = useTranslation();
  const { data: preferences, isLoading, error, refetch } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const [draft, setDraft] = useState<NotificationPreferences | undefined>(preferences);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const handleToggle = (channel: keyof NotificationPreferences, value: boolean) => {
    if (!draft) return;
    const next = { ...draft, [channel]: value };
    setDraft(next);
    updatePreferences.mutate(next, { onError: () => setDraft(draft) });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:notifications.title')}</CardTitle>
          <CardDescription>{t('settings:notifications.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !draft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:notifications.title')}</CardTitle>
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
        <CardTitle>{t('settings:notifications.title')}</CardTitle>
        <CardDescription>{t('settings:notifications.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {updatePreferences.error ? (
          <ErrorState onRetry={() => updatePreferences.mutate(draft)} />
        ) : null}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notif-email">{t('settings:notifications.emailNotifications')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('settings:notifications.emailNotificationsDescription')}
            </p>
          </div>
          <Switch
            id="notif-email"
            checked={draft.email}
            onCheckedChange={(checked) => handleToggle('email', checked)}
            disabled={updatePreferences.isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notif-push">{t('settings:notifications.pushNotifications')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('settings:notifications.pushNotificationsDescription')}
            </p>
          </div>
          <Switch
            id="notif-push"
            checked={draft.push}
            onCheckedChange={(checked) => handleToggle('push', checked)}
            disabled={updatePreferences.isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notif-sms">{t('settings:notifications.smsNotifications')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('settings:notifications.smsNotificationsDescription')}
            </p>
          </div>
          <Switch
            id="notif-sms"
            checked={draft.sms}
            onCheckedChange={(checked) => handleToggle('sms', checked)}
            disabled={updatePreferences.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
