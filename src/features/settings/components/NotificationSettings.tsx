/**
 * Notification Settings — the PLATFORM-WIDE DEFAULTS.
 *
 * What a new account starts with, shown through the same
 * `CommunicationPreferencesMatrix` a person sees on their own profile, so
 * an operator setting the default looks at exactly the rows the person
 * will. The locked categories are locked here too — a platform cannot
 * default anyone out of security mail — and only the engagement row is
 * a real control.
 *
 * THE DATA LAYER IS UNCHANGED: `useNotificationPreferences` and its
 * mutation still carry the legacy `{email, push, sms}` triple, and this
 * page maps the matrix's engagement email switch onto `email`. Digest,
 * reminders and language have no backing field on this contract, so
 * those controls are switched off rather than rendered as switches that
 * would save nothing. `push` and `sms` are no longer shown: neither
 * channel is delivered anywhere, and a default for a channel that does
 * not exist is not a setting.
 */
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorState } from '@components/feedback';
import {
  CommunicationPreferencesMatrix,
  CommunicationPreferencesMatrixSkeleton,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@features/notifications';
import type {
  CommunicationPreferences,
  CommunicationPreferencesUpdate,
  NotificationPreferences,
} from '@types';

/** The legacy triple, viewed as the matrix's shape. */
function toMatrixValue(
  preferences: NotificationPreferences
): CommunicationPreferences {
  return {
    language: 'en',
    categories: {
      security: { email: true, locked: true },
      transactional: { email: true, locked: true },
      lifecycle: { email: true, locked: true, reminders: true },
      engagement: { email: preferences.email, digest: 'immediate' },
      // No operational default exists on this contract; the row is absent.
      operational: null,
    },
  };
}

export function NotificationSettings(): JSX.Element {
  const { t } = useTranslation();
  const {
    data: preferences,
    isLoading,
    error,
    refetch,
  } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const handleChange = (update: CommunicationPreferencesUpdate) => {
    if (!preferences || !update.engagement) return;
    updatePreferences.mutate({
      ...preferences,
      email: update.engagement.email,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('notifications:communication.defaultsTitle')}</CardTitle>
        <CardDescription>
          {t('notifications:communication.defaultsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <CommunicationPreferencesMatrixSkeleton />
        ) : error || !preferences ? (
          <ErrorState
            titleKey="notifications:communication.loadFailed"
            onRetry={() => refetch()}
          />
        ) : (
          <>
            {updatePreferences.error ? (
              <ErrorState
                titleKey="notifications:communication.saveFailed"
                onRetry={() => updatePreferences.reset()}
              />
            ) : null}
            <CommunicationPreferencesMatrix
              mode="defaults"
              value={toMatrixValue(preferences)}
              onChange={handleChange}
              isPending={updatePreferences.isPending}
              showLanguage={false}
              showDigest={false}
              showReminders={false}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
