/**
 * Website SEO Tab (global). Page-level SEO is edited per-page in the Page
 * Editor (Prompt 10 closes what was previously only a typed contract with
 * no editing UI — see `WebsitePageEditorPage`'s "Edit SEO" action).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useServerValidation } from '@forms';
import { useAcademy } from '@features/academy';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { WebsiteImageField } from './WebsiteImageField';
import { LocalizedTextField } from './LocalizedTextField';
import { globalSeoSchema, type GlobalSeoFormData } from '../schemas/website.schemas';
import { buildOrganizationJsonLd } from '../utils/structured-data.utils';
import type { LocalizedText, WebsiteConfiguration } from '@types';

const EMPTY_LOCALIZED: LocalizedText = { en: '', ar: '' };

export interface WebsiteSeoTabProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
}

export function WebsiteSeoTab({ academyId, configuration }: WebsiteSeoTabProps): JSX.Element {
  const { t } = useTranslation();
  const updateConfig = useUpdateWebsiteConfiguration();
  const academyQuery = useAcademy(academyId);
  const [ogImage, setOgImage] = useState(configuration.seo.ogImage);

  const form = useForm<GlobalSeoFormData>({
    resolver: zodResolver(globalSeoSchema),
    values: {
      siteTitle: configuration.seo.siteTitle ?? EMPTY_LOCALIZED,
      metaTitle: configuration.seo.metaTitle ?? EMPTY_LOCALIZED,
      metaDescription: configuration.seo.metaDescription ?? EMPTY_LOCALIZED,
      robotsIndexable: configuration.seo.robotsIndexable ?? true,
      sitemapEnabled: configuration.seo.sitemapEnabled ?? true,
      canonicalBaseUrl: configuration.seo.canonicalBaseUrl ?? '',
    },
  });

  useServerValidation(form, updateConfig.error);

  const onSubmit = (data: GlobalSeoFormData) => {
    updateConfig.mutate(
      {
        academyId,
        payload: { seo: { ...data, ogImage } },
      },
      {
        onSuccess: () => toast({ title: t('website:seo.saved') }),
        onError: () => toast({ title: t('website:seo.saveError'), variant: 'destructive' }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="siteTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <LocalizedTextField
                        id="website-seo-site-title"
                        labelKey="website:seo.siteTitle"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <LocalizedTextField
                        id="website-seo-meta-title"
                        labelKey="website:seo.metaTitle"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <LocalizedTextField
                        id="website-seo-meta-description"
                        labelKey="website:seo.metaDescription"
                        value={field.value}
                        onChange={field.onChange}
                        multiline
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <WebsiteImageField
                id="website-og-image"
                labelKey="website:seo.ogImage"
                value={ogImage}
                onChange={setOgImage}
                academyId={academyId}
              />
              <FormField
                control={form.control}
                name="canonicalBaseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:seo.canonicalBaseUrl')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" placeholder="https://" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('website:seo.canonicalBaseUrlHelp')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="robotsIndexable"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    {t('website:seo.robotsIndexable')}
                  </label>
                )}
              />
              <FormField
                control={form.control}
                name="sitemapEnabled"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    {t('website:seo.sitemapEnabled')}
                  </label>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={updateConfig.isPending}>
                  {updateConfig.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-4" strokeWidth={2} aria-hidden />
                  )}
                  {t('website:common.saveChanges')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {academyQuery.data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('website:seo.structuredDataPreview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              {t('website:seo.structuredDataPreviewHelp')}
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
              {JSON.stringify(buildOrganizationJsonLd(academyQuery.data), null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
