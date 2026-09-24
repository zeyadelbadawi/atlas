/**
 * Profile Preferences Section.
 *
 * Two things live here, and they save differently on purpose.
 *
 * LANGUAGE AND THEME are a form with a Save button: they apply to the
 * whole interface at once, and applying them the instant a select
 * changes would re-render the page — in the other direction, for
 * Arabic — under the person's pointer. On save they apply locally
 * (`useLanguage`/`useTheme`) and persist through `useUpdatePreferences`
 * so the next sign-in starts the same way.
 *
 * EMAIL PREFERENCES are the `CommunicationPreferencesPanel`: a matrix of
 * per-category switches that save on change, optimistically, with a
 * toast. The previous "email"/"push" switches are gone — push was never
 * delivered anywhere, and a switch that does nothing teaches a person
 * that none of the switches do anything.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ErrorState } from '@components/feedback';
import { useToast, useLanguage, useTheme } from '@hooks';
import { CommunicationPreferencesPanel } from '@features/notifications';
import { useUpdatePreferences } from '../hooks';

const preferencesSchema = z.object({
  language: z.enum(['en', 'ar']),
  theme: z.enum(['light', 'dark', 'system']),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

export function ProfilePreferencesSection(): JSX.Element {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { preference, setPreference } = useTheme();
  const updatePreferences = useUpdatePreferences();

  const { handleSubmit, setValue, watch } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: language as 'en' | 'ar',
      theme: preference as 'light' | 'dark' | 'system',
    },
  });

  const formValues = watch();

  const handleFormSubmit = (data: PreferencesFormData) => {
    if (data.language !== language) {
      setLanguage(data.language);
    }
    if (data.theme !== preference) {
      setPreference(data.theme);
    }

    updatePreferences.mutate(
      { language: data.language, theme: data.theme },
      {
        onSuccess: () => {
          toast({
            title: t('profile:success.preferencesUpdated'),
            description: t('profile:success.changesApplied'),
          });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile:sections.preferences.title')}</CardTitle>
        <CardDescription>
          {t('profile:sections.preferences.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {updatePreferences.error ? (
            <ErrorState onRetry={handleSubmit(handleFormSubmit)} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">{t('profile:fields.language')}</Label>
              <Select
                value={formValues.language}
                onValueChange={(value) =>
                  setValue('language', value as 'en' | 'ar', {
                    shouldDirty: true,
                  })
                }
                disabled={updatePreferences.isPending}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    {t('profile:languages.english')}
                  </SelectItem>
                  <SelectItem value="ar">
                    {t('profile:languages.arabic')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">{t('profile:fields.theme')}</Label>
              <Select
                value={formValues.theme}
                onValueChange={(value) =>
                  setValue('theme', value as 'light' | 'dark' | 'system', {
                    shouldDirty: true,
                  })
                }
                disabled={updatePreferences.isPending}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    {t('profile:themes.light')}
                  </SelectItem>
                  <SelectItem value="dark">
                    {t('profile:themes.dark')}
                  </SelectItem>
                  <SelectItem value="system">
                    {t('profile:themes.system')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={updatePreferences.isPending}>
            <Save className="me-2 size-4" aria-hidden />
            {updatePreferences.isPending
              ? t('common:actions.saving')
              : t('common:actions.save')}
          </Button>
        </form>

        <Separator />

        <section
          aria-labelledby="communication-preferences-heading"
          className="space-y-4"
        >
          <div className="space-y-1">
            <h3
              id="communication-preferences-heading"
              className="text-sm font-medium"
            >
              {t('notifications:communication.title')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('notifications:communication.description')}
            </p>
          </div>
          <CommunicationPreferencesPanel />
        </section>
      </CardContent>
    </Card>
  );
}
