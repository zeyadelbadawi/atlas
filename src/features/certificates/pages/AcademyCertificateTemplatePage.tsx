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
import { useEffect, useRef, useState } from 'react';
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
  certificateService,
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
import { buildCertificatePreviewKey } from '../utils/certificate-preview-key';

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
    // Defensive: an older backend (mid-deploy) may not send `palette` yet.
    // Fall back to the original Atlas design so the editor never crashes.
    primaryColor: template.palette?.primary ?? '#1F4E5F',
    accentColor: template.palette?.accent ?? '#B08A3E',
    textColor: template.palette?.text ?? '#14303A',
    backgroundColor: template.palette?.background ?? '#FCFBF7',
  };
}

/** Curated, print-safe starting palettes (an original-Atlas default first). */
const PALETTE_PRESETS: {
  readonly id: string;
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly textColor: string;
  readonly backgroundColor: string;
}[] = [
  { id: 'atlas', primaryColor: '#1F4E5F', accentColor: '#B08A3E', textColor: '#14303A', backgroundColor: '#FCFBF7' },
  { id: 'charcoal', primaryColor: '#2B2F36', accentColor: '#9A7B4F', textColor: '#1A1D22', backgroundColor: '#FAFAF8' },
  { id: 'navy', primaryColor: '#1B3A5B', accentColor: '#C0A15B', textColor: '#152A3E', backgroundColor: '#FBFCFE' },
  { id: 'burgundy', primaryColor: '#6E1E2B', accentColor: '#C2A05A', textColor: '#2A1418', backgroundColor: '#FDFAF6' },
  { id: 'forest', primaryColor: '#25503C', accentColor: '#B4914A', textColor: '#16281F', backgroundColor: '#FAFCF8' },
];

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

  const watched = form.watch();
  const disabled = !canManage || update.isPending;

  // The live preview is produced by the REAL server-side PDF renderer, so it
  // can never diverge from an issued certificate. All hooks below MUST run
  // unconditionally (before the loading/error early returns) to keep hook
  // order stable across renders (React error #310).
  const [previewLocale, setPreviewLocale] = useState<'en' | 'ar'>(
    i18n.language.startsWith('ar') ? 'ar' : 'en'
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // A content signature of every field that affects the rendered PDF.
  // Computed inline (NOT memoised on object references): react-hook-form keeps
  // the nested `wording` object reference stable across keystrokes, so a memo
  // keyed on `watched.wording` never saw text edits — only the top-level
  // colour strings changed. `form.watch()` re-renders on every field change,
  // and JSON.stringify reads the ACTUAL nested content, so a single typed
  // character in any text field changes this key and drives a fresh preview.
  const previewKey = buildCertificatePreviewKey({
    locale: previewLocale,
    logoUrl: watched.logoUrl,
    signatureUrl: watched.signatureUrl,
    signatoryName: watched.signatoryName,
    signatoryTitle: watched.signatoryTitle,
    wording: watched.wording,
    primaryColor: watched.primaryColor,
    accentColor: watched.accentColor,
    textColor: watched.textColor,
    backgroundColor: watched.backgroundColor,
  });

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setPreviewPending(true);
      setPreviewError(null);
      certificateService
        .previewTemplate(
          academyId,
          {
            logoUrl: watched.logoUrl,
            signatureUrl: watched.signatureUrl,
            signatoryName: watched.signatoryName?.trim() || null,
            signatoryTitle: watched.signatoryTitle?.trim() || null,
            wording: watched.wording,
            primaryColor: watched.primaryColor,
            accentColor: watched.accentColor,
            textColor: watched.textColor,
            backgroundColor: watched.backgroundColor,
          },
          previewLocale
        )
        .then((blob) => {
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = url;
          setPreviewUrl(url);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setPreviewError(apiErrorMessage(t, i18n, err));
        })
        .finally(() => {
          if (!cancelled) setPreviewPending(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // previewKey captures every field that changes the rendered PDF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, canManage, academyId]);

  // Revoke the last object URL when the page unmounts.
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const onSubmit = async (values: CertificateTemplateFormData) => {
    try {
      const saved = await update.mutateAsync({
        name: values.name,
        logoUrl: values.logoUrl,
        signatureUrl: values.signatureUrl,
        signatoryName: values.signatoryName.trim() || null,
        signatoryTitle: values.signatoryTitle.trim() || null,
        wording: values.wording,
        primaryColor: values.primaryColor,
        accentColor: values.accentColor,
        textColor: values.textColor,
        backgroundColor: values.backgroundColor,
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

  const renderColorField = (
    name: 'primaryColor' | 'accentColor' | 'textColor' | 'backgroundColor',
    labelKey: string
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <div className="flex items-center gap-2">
            <FormControl>
              <input
                type="color"
                aria-label={t(labelKey)}
                value={/^#[0-9a-fA-F]{6}$/.test(field.value) ? field.value : '#000000'}
                disabled={disabled}
                onChange={(e) =>
                  field.onChange(e.target.value.toUpperCase())
                }
                className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </FormControl>
            <Input
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
              disabled={disabled}
              spellCheck={false}
              className="font-mono uppercase"
              placeholder="#000000"
            />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const applyPreset = (preset: (typeof PALETTE_PRESETS)[number]) => {
    (['primaryColor', 'accentColor', 'textColor', 'backgroundColor'] as const).forEach(
      (key) =>
        form.setValue(key, preset[key], {
          shouldDirty: true,
          shouldValidate: true,
        })
    );
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

            {/* Colours — four constrained roles, with curated presets. */}
            <Card>
              <CardHeader>
                <CardTitle>{t('certificates:template.colors.title')}</CardTitle>
                <CardDescription>
                  {t('certificates:template.colors.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {PALETTE_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => applyPreset(preset)}
                      className="gap-2"
                    >
                      <span className="flex" aria-hidden>
                        {[preset.primaryColor, preset.accentColor, preset.textColor].map(
                          (c, i) => (
                            <span
                              key={i}
                              className="inline-block size-3 rounded-full border border-border"
                              style={{
                                backgroundColor: c,
                                marginInlineStart: i === 0 ? 0 : -4,
                              }}
                            />
                          )
                        )}
                      </span>
                      {t(`certificates:template.colors.presets.${preset.id}`)}
                    </Button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderColorField('primaryColor', 'certificates:template.colors.primary')}
                  {renderColorField('accentColor', 'certificates:template.colors.accent')}
                  {renderColorField('textColor', 'certificates:template.colors.text')}
                  {renderColorField(
                    'backgroundColor',
                    'certificates:template.colors.background'
                  )}
                </div>
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

          {/* Live preview — the SAME server-side PDF renderer as an issued
              certificate, so it can never diverge from the real document. */}
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t('certificates:template.preview.title')}</CardTitle>
                  <CardDescription>
                    {t('certificates:template.preview.description')}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 rounded-md border border-input p-0.5">
                  {(['en', 'ar'] as const).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setPreviewLocale(loc)}
                      aria-pressed={previewLocale === loc}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        previewLocale === loc
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t(`certificates:template.preview.locale.${loc}`)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="relative overflow-hidden rounded-lg border border-border bg-muted"
                style={{ aspectRatio: '1.414 / 1' }}
                aria-live="polite"
              >
                {previewUrl ? (
                  <iframe
                    key={previewLocale}
                    src={`${previewUrl}#toolbar=0&navpanes=0&view=Fit`}
                    title={t('certificates:template.preview.title')}
                    className="absolute inset-0 h-full w-full"
                  />
                ) : !previewError ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2
                      className="size-6 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                    <span className="sr-only">
                      {t('certificates:template.preview.rendering')}
                    </span>
                  </div>
                ) : null}
                {previewError ? (
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <p
                      className="text-center text-sm text-destructive"
                      role="alert"
                    >
                      {previewError}
                    </p>
                  </div>
                ) : null}
                {previewPending && previewUrl ? (
                  <div className="absolute end-2 top-2 rounded-full bg-background/80 p-1 shadow-sm">
                    <Loader2
                      className="size-4 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {t('certificates:template.preview.rendererNote')}
              </p>
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
