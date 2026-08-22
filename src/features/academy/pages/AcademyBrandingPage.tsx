/**
 * Academy Branding Page.
 *
 * Manage academy visual identity including logo, favicon, and display name.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, Upload, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from '@/hooks/use-toast';
import { useFilePicker, useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useAcademy, useUpdateAcademyBranding } from '../hooks';
import {
  updateAcademyBrandingSchema,
  type UpdateAcademyBrandingFormData,
} from '../schemas/academy.schemas';
import {
  ALLOWED_FAVICON_TYPES,
  ALLOWED_LOGO_TYPES,
  MAX_FAVICON_FILE_SIZE,
  MAX_LOGO_FILE_SIZE,
} from '../constants/academy.constants';

/** Reads a File into a base64 data URL, the string shape the branding PATCH
 * contract accepts for `logo`/`favicon` — there is no separate media-upload
 * endpoint in this codebase, so this is the value the field must hold. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function AcademyBrandingPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(
    null
  );

  const {
    data: academy,
    isLoading,
    error: loadError,
    refetch,
  } = useAcademy(academyId ?? '');
  const {
    mutateAsync: updateBranding,
    isPending,
    error: mutationError,
  } = useUpdateAcademyBranding();

  const form = useForm<UpdateAcademyBrandingFormData>({
    resolver: zodResolver(updateAcademyBrandingSchema),
    values: academy
      ? {
          name: academy.name,
          logo: academy.logo,
          favicon: academy.favicon,
        }
      : undefined,
  });

  useServerValidation(form, mutationError);
  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    messageKey: 'academy:branding.unsavedChanges',
  });

  const logoPicker = useFilePicker({ accept: ALLOWED_LOGO_TYPES.join(',') });
  const faviconPicker = useFilePicker({
    accept: ALLOWED_FAVICON_TYPES.join(','),
  });

  // Validates the picked file against the academy's declared branding
  // constraints, then converts it into the string value the branding PATCH
  // contract expects. Revokes the previous transient preview on every change.
  useEffect(() => {
    const file = logoPicker.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_FILE_SIZE) {
      form.setError('logo', { type: 'validation', message: 'academy:branding.errors.logoTooLarge' });
      logoPicker.clearFiles();
      return;
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      form.setError('logo', { type: 'validation', message: 'academy:branding.errors.logoInvalidType' });
      logoPicker.clearFiles();
      return;
    }

    form.clearErrors('logo');
    const previewUrl = logoPicker.getPreviewUrl(file);
    setLogoPreviewUrl((previous) => {
      if (previous) logoPicker.revokePreviewUrl(previous);
      return previewUrl;
    });

    void readFileAsDataUrl(file).then((dataUrl) => {
      form.setValue('logo', dataUrl, { shouldDirty: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoPicker.files]);

  useEffect(() => {
    const file = faviconPicker.files?.[0];
    if (!file) return;

    if (file.size > MAX_FAVICON_FILE_SIZE) {
      form.setError('favicon', { type: 'validation', message: 'academy:branding.errors.faviconTooLarge' });
      faviconPicker.clearFiles();
      return;
    }
    if (!ALLOWED_FAVICON_TYPES.includes(file.type)) {
      form.setError('favicon', { type: 'validation', message: 'academy:branding.errors.faviconInvalidType' });
      faviconPicker.clearFiles();
      return;
    }

    form.clearErrors('favicon');
    const previewUrl = faviconPicker.getPreviewUrl(file);
    setFaviconPreviewUrl((previous) => {
      if (previous) faviconPicker.revokePreviewUrl(previous);
      return previewUrl;
    });

    void readFileAsDataUrl(file).then((dataUrl) => {
      form.setValue('favicon', dataUrl, { shouldDirty: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faviconPicker.files]);

  // Revoke any outstanding object URLs on unmount to avoid leaking them.
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) logoPicker.revokePreviewUrl(logoPreviewUrl);
      if (faviconPreviewUrl) faviconPicker.revokePreviewUrl(faviconPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: UpdateAcademyBrandingFormData) => {
    if (!academyId) return;

    try {
      await updateBranding({
        id: academyId,
        payload: {
          name: data.name,
          logo: data.logo,
          favicon: data.favicon,
        },
      });
      toast({
        title: t('academy:branding.success'),
        description: t('common:states.success.description'),
      });
    } catch (error) {
      toast({
        title: t('academy:branding.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleRemoveLogo = () => {
    if (logoPreviewUrl) logoPicker.revokePreviewUrl(logoPreviewUrl);
    setLogoPreviewUrl(null);
    logoPicker.clearFiles();
    form.setValue('logo', undefined, { shouldDirty: true });
  };

  const handleRemoveFavicon = () => {
    if (faviconPreviewUrl) faviconPicker.revokePreviewUrl(faviconPreviewUrl);
    setFaviconPreviewUrl(null);
    faviconPicker.clearFiles();
    form.setValue('favicon', undefined, { shouldDirty: true });
  };

  const handleCancel = () => {
    navigate(DASHBOARD_ROUTES.academy + `?academyId=${academyId}`);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (loadError || !academy) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="academy:branding.title"
          descriptionKey="academy:branding.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const currentLogo = logoPreviewUrl ?? academy.logo;
  const currentFavicon = faviconPreviewUrl ?? academy.favicon;

  return (
    <PageContainer>
      <PageHeader
        title={academy.name}
        titleKey="academy:branding.title"
        descriptionKey="academy:branding.subtitle"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Display Name */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:branding.displayName')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academy:create.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:branding.logo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="logo"
                render={() => (
                  <FormItem>
                    <FormLabel>{t('academy:branding.logo')}</FormLabel>
                    <FormDescription>
                      {t('academy:branding.logoHelp')}
                    </FormDescription>

                    {currentLogo ? (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <img
                            src={currentLogo}
                            alt="Academy logo"
                            className="h-24 w-auto rounded-lg border border-border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -end-2 -top-2 size-6 rounded-full"
                            onClick={handleRemoveLogo}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={logoPicker.openFilePicker}
                        >
                          {t('academy:branding.changeLogo')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={logoPicker.openFilePicker}
                      >
                        <Upload className="size-4" strokeWidth={2} aria-hidden />
                        {t('academy:branding.uploadLogo')}
                      </Button>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Favicon */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:branding.favicon')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="favicon"
                render={() => (
                  <FormItem>
                    <FormLabel>{t('academy:branding.favicon')}</FormLabel>
                    <FormDescription>
                      {t('academy:branding.faviconHelp')}
                    </FormDescription>

                    {currentFavicon ? (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <img
                            src={currentFavicon}
                            alt="Academy favicon"
                            className="h-12 w-auto rounded border border-border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -end-2 -top-2 size-6 rounded-full"
                            onClick={handleRemoveFavicon}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={faviconPicker.openFilePicker}
                        >
                          {t('academy:branding.changeFavicon')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={faviconPicker.openFilePicker}
                      >
                        <Upload className="size-4" strokeWidth={2} aria-hidden />
                        {t('academy:branding.uploadFavicon')}
                      </Button>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              {t('academy:branding.cancelButton')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('academy:branding.saving')}
                </>
              ) : (
                <>
                  <Save className="size-4" strokeWidth={2} aria-hidden />
                  {t('academy:branding.saveButton')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  );
}
