/**
 * Website SEO Tab (global). Page-level SEO is edited per-page in the Page
 * Editor (Prompt 10 closes what was previously only a typed contract with
 * no editing UI — see `WebsitePageEditorPage`'s "Edit SEO" action).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
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
import { SaveFailedAlert, hasViolationOn, useServerValidation } from '@forms';
import { useAcademy } from '@features/academy';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { WebsiteImageField } from './WebsiteImageField';
import { LocalizedTextField } from './LocalizedTextField';
import { useLocalizedFormErrors } from './localized-form-errors';
import {
  MAX_SEO_DESCRIPTION_LENGTH,
  MAX_SEO_TITLE_LENGTH,
  MAX_SITE_TITLE_LENGTH,
} from '../constants/website.constants';
import {
  globalSeoSchema,
  type GlobalSeoFormData,
} from '../schemas/website.schemas';
import { buildOrganizationJsonLd } from '../utils/structured-data.utils';
import type { LocalizedText, WebsiteConfiguration } from '@types';

const EMPTY_LOCALIZED: LocalizedText = { en: '', ar: '' };

/** The fields a server violation can land on (anything else is one inline message). */
const SEO_FIELDS = {
  siteTitle: '',
  'siteTitle.en': '',
  'siteTitle.ar': '',
  metaTitle: '',
  'metaTitle.en': '',
  'metaTitle.ar': '',
  metaDescription: '',
  'metaDescription.en': '',
  'metaDescription.ar': '',
  canonicalBaseUrl: '',
  googleSiteVerification: '',
  bingSiteVerification: '',
} as const;

/** The labels a server refusal names its field by (`{{field}}`). */
const SEO_FIELD_LABELS: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    (['siteTitle', 'metaTitle', 'metaDescription'] as const).flatMap((name) =>
      ['', '.en', '.ar'].map((suffix) => [
        `${name}${suffix}`,
        `website:seo.${name}`,
      ])
    )
  ),
  canonicalBaseUrl: 'website:seo.canonicalBaseUrl',
};

export interface WebsiteSeoTabProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
}

export function WebsiteSeoTab({
  academyId,
  configuration,
}: WebsiteSeoTabProps): JSX.Element {
  const { t } = useTranslation();
  const updateConfig = useUpdateWebsiteConfiguration({ inlineErrors: true });
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
      googleSiteVerification: configuration.seo.googleSiteVerification ?? '',
      bingSiteVerification: configuration.seo.bingSiteVerification ?? '',
    },
  });

  useServerValidation(form, updateConfig.error, { labels: SEO_FIELD_LABELS });
  const { errors } = form.formState;
  const siteTitleErrors = useLocalizedFormErrors(
    errors,
    'siteTitle',
    'website:seo.siteTitle'
  );
  const metaTitleErrors = useLocalizedFormErrors(
    errors,
    'metaTitle',
    'website:seo.metaTitle'
  );
  const metaDescriptionErrors = useLocalizedFormErrors(
    errors,
    'metaDescription',
    'website:seo.metaDescription'
  );
  // One message per failure: a violation shows on its field; anything else
  // is one inline alert with the real reason (no toast on top).
  const saveError =
    updateConfig.error && !hasViolationOn(updateConfig.error, SEO_FIELDS)
      ? updateConfig.error
      : null;

  // The share image lives outside the form, so it is compared separately —
  // a new image with no text edits is still unsaved work.
  const savedOgImage = configuration.seo.ogImage;
  const ogImageChanged = (ogImage ?? null) !== (savedOgImage ?? null);

  // Resolves false after a failure it already reported, so the Save button
  // and the unsaved-changes dialog's "Save and leave" share it.
  async function save(data: GlobalSeoFormData): Promise<boolean> {
    try {
      await updateConfig.mutateAsync({
        academyId,
        payload: { seo: { ...data, ogImage } },
      });
      form.reset(data);
      toast({ title: t('website:seo.saved') });
      return true;
    } catch {
      return false;
    }
  }

  const onSubmit = async (data: GlobalSeoFormData) => {
    await save(data);
  };

  // Warns before this editor is left with unsaved work — both on in-app
  // navigation (via the shared registry the route blocker reads) and on
  // tab close or refresh.
  useUnsavedChanges({
    isDirty: form.formState.isDirty || ogImageChanged,
    onSave: () => saveViaForm(form, save),
  });

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
                        maxLength={MAX_SITE_TITLE_LENGTH}
                        errors={siteTitleErrors}
                      />
                    </FormControl>
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
                        maxLength={MAX_SEO_TITLE_LENGTH}
                        errors={metaTitleErrors}
                      />
                    </FormControl>
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
                        maxLength={MAX_SEO_DESCRIPTION_LENGTH}
                        errors={metaDescriptionErrors}
                        multiline
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <WebsiteImageField
                id="website-og-image"
                labelKey="website:seo.ogImage"
                purpose="ogImage"
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
                      <Input
                        {...field}
                        dir="ltr"
                        data-ltr-content
                        placeholder="https://"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('website:seo.canonicalBaseUrlHelp')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {(
                [
                  ['googleSiteVerification', 'google-site-verification'],
                  ['bingSiteVerification', 'msvalidate.01'],
                ] as const
              ).map(([name, metaName]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t(`website:seo.${name}`)}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          dir="ltr"
                          data-ltr-content
                          autoComplete="off"
                          spellCheck={false}
                          placeholder={`<meta name="${metaName}" content="…">`}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {t('website:seo.siteVerificationHelp')}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormField
                control={form.control}
                name="robotsIndexable"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    {t('website:seo.robotsIndexable')}
                  </label>
                )}
              />
              <FormField
                control={form.control}
                name="sitemapEnabled"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    {t('website:seo.sitemapEnabled')}
                  </label>
                )}
              />
              {saveError ? (
                <SaveFailedAlert
                  error={saveError}
                  titleKey="common:form.notSaved"
                  onRetry={() => void form.handleSubmit(onSubmit)()}
                />
              ) : null}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('website:seo.searchEngines')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t('website:seo.searchEnginesHelp')}</p>
          <p>{t('website:seo.searchEnginesSteps')}</p>
        </CardContent>
      </Card>

      {academyQuery.data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('website:seo.structuredDataPreview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              {t('website:seo.structuredDataPreviewHelp')}
            </p>
            <pre
              className="overflow-x-auto rounded-md bg-muted p-3 text-xs"
              dir="ltr"
            >
              {JSON.stringify(
                // The fields the published home page gives search engines
                // (`PublicWebsitePage`): the academy's name, logo,
                // description and contact details.
                buildOrganizationJsonLd({
                  name: academyQuery.data.name,
                  logo: academyQuery.data.logo,
                  description: academyQuery.data.description,
                  contactEmail: academyQuery.data.contactEmail,
                  contactPhone: academyQuery.data.contactPhone,
                }),
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
