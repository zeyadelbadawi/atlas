/**
 * Website Language Tab (B0-WEB-02).
 *
 * The site's main language: the one it serves at its main address. English
 * (every site until now, and the default) keeps Arabic under `/ar`; Arabic
 * moves English under `/en`. Saved to the working copy like every other
 * site-wide setting and live at the next publish, so an owner can add
 * their Arabic text first. The API decides who may change it (the same
 * managing roles as every website setting) and validates the value.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save } from 'lucide-react';
import { useUnsavedChanges } from '@hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { useUpdateWebsiteConfiguration } from '../hooks';
import {
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  isPublicWebsiteLocale,
  resolveDefaultLocale,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import type { WebsiteConfiguration } from '@types';

export interface WebsiteLanguageTabProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
}

export function WebsiteLanguageTab({
  academyId,
  configuration,
}: WebsiteLanguageTabProps): JSX.Element {
  const { t } = useTranslation();
  const updateConfig = useUpdateWebsiteConfiguration();
  const saved = resolveDefaultLocale(configuration.defaultLocale);
  const [selected, setSelected] = useState<PublicWebsiteLocale>(saved);
  const isDirty = selected !== saved;

  async function save(): Promise<boolean> {
    try {
      await updateConfig.mutateAsync({
        academyId,
        payload: { defaultLocale: selected },
      });
      toast({ title: t('website:language.saved') });
      return true;
    } catch {
      toast({ title: t('website:language.saveError'), variant: 'destructive' });
      return false;
    }
  }

  useUnsavedChanges({ isDirty, onSave: save });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('website:language.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {t('website:language.description')}
        </p>

        <RadioGroup
          value={selected}
          onValueChange={(value) => {
            if (isPublicWebsiteLocale(value)) setSelected(value);
          }}
          aria-label={t('website:language.title')}
          className="gap-3"
        >
          {PUBLIC_WEBSITE_LOCALES.map((locale) => {
            const itemId = `website-default-locale-${locale}`;
            return (
              <div
                key={locale}
                className="flex items-start gap-3 rounded-md border border-border p-3"
              >
                <RadioGroupItem id={itemId} value={locale} className="mt-1" />
                <Label htmlFor={itemId} className="space-y-1 font-normal">
                  <span
                    className="block text-sm font-medium text-foreground"
                    lang={locale}
                  >
                    {PUBLIC_WEBSITE_LOCALE_LABELS[locale]}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(`website:language.option.${locale}`)}
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
          <li>{t('website:language.required')}</li>
          <li>{t('website:language.redirects')}</li>
          <li>{t('website:language.publish')}</li>
        </ul>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={!isDirty || updateConfig.isPending}
          >
            {updateConfig.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" strokeWidth={2} aria-hidden />
            )}
            {t('website:common.saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
