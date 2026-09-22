/**
 * Academy Certificate Template — identity and wording on every certificate
 * (P64 Phase 3 §E.6, D6).
 *
 * The layout is the platform's (the "Issued via Atlas" footer is fixed);
 * what the academy owns is its logo, signature, signatory and the EN/AR
 * wording. Images come from the academy media library — never a typed
 * URL, so the certificate can only ever carry an asset the academy
 * actually holds.
 *
 * Saving does not touch issued certificates: they keep their version
 * until a manager regenerates them, which is the explicit, audited action
 * D7 asks for. The subtitle says so.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Loader2, Save, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { SectionTabs } from '@components/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@app/providers';
import { usePermissions, useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import {
  useCertificateTemplate,
  useUpdateCertificateTemplate,
} from '@features/learning';
import { MediaLibraryDialog } from '@features/media';
import { apiErrorMessage } from '@utils';
import type { CertificateTemplate } from '@types';
import {
  certificateTemplateSchema,
  type CertificateTemplateFormData,
} from '../schemas/certificate-template.schema';
import { getCertificateTabs } from './AcademyCertificatesPage';

type ImageField = 'logoUrl' | 'signatureUrl';

function toFormValues(
  template: CertificateTemplate
): CertificateTemplateFormData {
  return {
    name: template.name,
    logoUrl: template.logoUrl,
    signatureUrl: template.signatureUrl,
    signatoryName: template.signatoryName ?? '',
    signatoryTitle: template.signatoryTitle ?? '',
    wording: {
      en: { title: template.wording.en.title, body: template.wording.en.body },
      ar: { title: template.wording.ar.title, body: template.wording.ar.body },
    },
  };
}

export default function AcademyCertificateTemplatePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { academyId = '' } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();
  const { notifySuccess } = useToast();
  // Owners and managers; the backend answers 403 for anyone else and the
  // page shows the forbidden copy.
  const canManage = hasPermission('academy.website.manage');
  const [picking, setPicking] = useState<ImageField | null>(null);

  const {
    data: template,
    isLoading,
    error: loadError,
    refetch,
  } = useCertificateTemplate(academyId);
  const update = useUpdateCertificateTemplate(academyId);

  const form = useForm<CertificateTemplateFormData>({
    resolver: zodResolver(certificateTemplateSchema),
    values: template ? toFormValues(template) : undefined,
  });

  useServerValidation(form, update.error);
  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    messageKey: 'certificates:template.unsavedChanges',
  });

  const onSubmit = async (values: CertificateTemplateFormData) => {
    try {
      const saved = await update.mutateAsync({
        name: values.name,
        logoUrl: values.logoUrl,
        signatureUrl: values.signatureUrl,
        signatoryName: values.signatoryName.trim() || null,
        signatoryTitle: values.signatoryTitle.trim() || null,
        wording: values.wording,
      });
      form.reset(toFormValues(saved));
      notifySuccess(
        'certificates:template.toast.saved',
        'certificates:template.toast.savedDescription'
      );
    } catch {
      // Field violations land through `useServerValidation`; anything else
      // is rendered below from `update.error`.
    }
  };

  const header = (
    <PageHeader
      titleKey="certificates:template.title"
      descriptionKey="certificates:template.subtitle"
    />
  );

  if (loadError) {
    return (
      <PageContainer>
        {header}
        <SectionTabs items={getCertificateTabs(academyId)} />
        <ErrorState
          kind={loadError.kind}
          requestId={loadError.requestId}
          onRetry={
            loadError.kind === 'forbidden' ? undefined : () => void refetch()
          }
        />
      </PageContainer>
    );
  }

  if (isLoading || !template) {
    return (
      <PageContainer>
        {header}
        <SectionTabs items={getCertificateTabs(academyId)} />
        <div className="space-y-4" role="status" aria-live="polite">
          <span className="sr-only">{t('certificates:template.loading')}</span>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  const watched = form.watch();
  const disabled = !canManage || update.isPending;

  const renderImageField = (
    field: ImageField,
    labelKey: string,
    hintKey: string
  ) => (
    <FormField
      control={form.control}
      name={field}
      render={({ field: { value } }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {value ? (
                <img
                  src={value}
                  alt={t(
                    field === 'logoUrl'
                      ? 'certificates:template.preview.logoAlt'
                      : 'certificates:template.preview.signatureAlt'
                  )}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <ImageIcon
                  className="size-6 text-muted-foreground"
                  aria-hidden
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => setPicking(field)}
              >
                {t(
                  value
                    ? 'certificates:template.actions.replace'
                    : 'certificates:template.actions.choose'
                )}
              </Button>
              {value ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    form.setValue(field, null, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <X className="size-4" aria-hidden />
                  {t('certificates:template.actions.clear')}
                </Button>
              ) : null}
            </div>
          </div>
          <FormDescription>{t(hintKey)}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderWording = (locale: 'en' | 'ar', labelKey: string) => (
    <div className="space-y-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <h3 className="text-sm font-semibold text-foreground">{t(labelKey)}</h3>
      <FormField
        control={form.control}
        name={`wording.${locale}.title`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('certificates:template.fields.wordingTitle')}
            </FormLabel>
            <FormControl>
              <Input {...field} disabled={disabled} lang={locale} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`wording.${locale}.body`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('certificates:template.fields.wordingBody')}
            </FormLabel>
            <FormControl>
              <Textarea {...field} rows={4} disabled={disabled} lang={locale} />
            </FormControl>
            <FormDescription>
              {t('certificates:template.fields.wordingHint')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const previewLocale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const previewWording = watched.wording?.[previewLocale] ?? {
    title: '',
    body: '',
  };

  return (
    <PageContainer>
      {header}
      <SectionTabs items={getCertificateTabs(academyId)} />

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          {t('certificates:template.readOnly')}
        </p>
      ) : null}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
          noValidate
        >
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('certificates:template.fields.name')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} dir="auto" />
                      </FormControl>
                      <FormDescription>
                        {t('certificates:template.fields.nameHint')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {renderImageField(
                  'logoUrl',
                  'certificates:template.fields.logo',
                  'certificates:template.fields.logoHint'
                )}
                {renderImageField(
                  'signatureUrl',
                  'certificates:template.fields.signature',
                  'certificates:template.fields.signatureHint'
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="signatoryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('certificates:template.fields.signatoryName')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} disabled={disabled} dir="auto" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="signatoryTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('certificates:template.fields.signatoryTitle')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} disabled={disabled} dir="auto" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-8 pt-6 md:grid-cols-2">
                {renderWording('en', 'certificates:template.fields.wordingEn')}
                {renderWording('ar', 'certificates:template.fields.wordingAr')}
              </CardContent>
            </Card>

            {update.error && update.error.kind !== 'validation' ? (
              <p className="text-sm text-destructive" role="alert">
                {apiErrorMessage(t, i18n, update.error)}
              </p>
            ) : null}

            {canManage ? (
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={update.isPending || !form.formState.isDirty}
                >
                  {update.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-4" aria-hidden />
                  )}
                  {t('certificates:template.actions.save')}
                </Button>
              </div>
            ) : null}
          </div>

          {/* Preview — how the wording reads on the standard layout. */}
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>{t('certificates:template.preview.title')}</CardTitle>
              <CardDescription>
                {t('certificates:template.preview.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="flex flex-col items-center gap-4 rounded-lg border-2 border-border bg-card p-6 text-center"
                dir={previewLocale === 'ar' ? 'rtl' : 'ltr'}
                lang={previewLocale}
                aria-live="polite"
              >
                {watched.logoUrl ? (
                  <img
                    src={watched.logoUrl}
                    alt={t('certificates:template.preview.logoAlt')}
                    className="max-h-16 max-w-[10rem] object-contain"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {t('certificates:template.preview.noLogo')}
                  </span>
                )}
                <p className="font-display text-xl font-bold text-foreground">
                  {previewWording.title || '…'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {previewWording.body || '…'}
                </p>
                <p className="font-display text-lg font-semibold text-foreground">
                  {t('certificates:template.preview.learnerPlaceholder')}
                </p>
                <p className="text-sm text-foreground">
                  {t('certificates:template.preview.coursePlaceholder')}
                </p>
                <div className="mt-2 flex flex-col items-center gap-1">
                  {watched.signatureUrl ? (
                    <img
                      src={watched.signatureUrl}
                      alt={t('certificates:template.preview.signatureAlt')}
                      className="max-h-12 max-w-[8rem] object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t('certificates:template.preview.noSignature')}
                    </span>
                  )}
                  {watched.signatoryName ? (
                    <p
                      className="text-sm font-medium text-foreground"
                      dir="auto"
                    >
                      {watched.signatoryName}
                    </p>
                  ) : null}
                  {watched.signatoryTitle ? (
                    <p className="text-xs text-muted-foreground" dir="auto">
                      {watched.signatoryTitle}
                    </p>
                  ) : null}
                </div>
                <p className="mt-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  {t('certificates:template.preview.footer')}
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      <MediaLibraryDialog
        academyId={academyId}
        open={picking !== null}
        onOpenChange={(open) => !open && setPicking(null)}
        onSelect={(asset) => {
          if (!picking) return;
          form.setValue(picking, asset.url, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />
    </PageContainer>
  );
}
