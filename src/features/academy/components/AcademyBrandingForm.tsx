/**
 * Academy Branding Form.
 *
 * Display name, logo and favicon — the form `AcademyBrandingPage` has
 * always shown, extracted so the New Customer Onboarding shell's Branding
 * step renders the SAME form (same validation, same file checks, same
 * `PATCH` contract) rather than a second one.
 *
 * Saving is reported through a toast here and `onSaved` for the caller;
 * whether the onboarding step is now complete is the server's answer
 * (`academy.logoUrl`), re-read by the shell — never assumed from a save.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Loader2, Save, Type, Upload, X } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';
import { useFilePicker, useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import { useUploadMediaAsset } from '@features/media';
import { useUpdateAcademyBranding } from '../hooks';
import {
  updateAcademyBrandingSchema,
  type UpdateAcademyBrandingFormData,
} from '../schemas/academy.schemas';
import type { Academy } from '@types';
import {
  ALLOWED_FAVICON_TYPES,
  ALLOWED_LOGO_TYPES,
  MAX_FAVICON_FILE_SIZE,
  MAX_LOGO_FILE_SIZE,
} from '../constants/academy.constants';

/** Reads a File into a base64 data URL. The logo is then uploaded as a
 * `MediaAsset` (Theme 1 plan §F.4.3: no base64 in the Academy record) and
 * the field holds the returned URL; the favicon keeps the data URL, because
 * `.ico` is not a MediaAsset type. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface AcademyBrandingFormProps {
  readonly academy: Academy;
  /** The secondary action beside Save. Absent, only Save is shown (the onboarding shell has its own Skip/Back). */
  readonly onCancel?: () => void;
  readonly cancelLabelKey?: string;
  readonly submitLabelKey?: string;
  /** Called after a successful save. */
  readonly onSaved?: () => void;
}

export function AcademyBrandingForm({
  academy,
  onCancel,
  cancelLabelKey = 'academy:branding.cancelButton',
  submitLabelKey = 'academy:branding.saveButton',
  onSaved,
}: AcademyBrandingFormProps): JSX.Element {
  const { t } = useTranslation();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(
    null
  );

  const {
    mutateAsync: updateBranding,
    isPending,
    error: mutationError,
  } = useUpdateAcademyBranding();
  const uploadLogo = useUploadMediaAsset();

  const form = useForm<UpdateAcademyBrandingFormData>({
    resolver: zodResolver(updateAcademyBrandingSchema),
    values: {
      name: academy.name,
      logo: academy.logo,
      favicon: academy.favicon,
    },
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
      form.setError('logo', {
        type: 'validation',
        message: 'academy:branding.errors.logoTooLarge',
      });
      logoPicker.clearFiles();
      return;
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      form.setError('logo', {
        type: 'validation',
        message: 'academy:branding.errors.logoInvalidType',
      });
      logoPicker.clearFiles();
      return;
    }

    form.clearErrors('logo');
    const previewUrl = logoPicker.getPreviewUrl(file);
    setLogoPreviewUrl((previous) => {
      if (previous) logoPicker.revokePreviewUrl(previous);
      return previewUrl;
    });

    void readFileAsDataUrl(file)
      .then((dataUrl) =>
        uploadLogo.mutateAsync({
          academyId: academy.id,
          payload: {
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            dataUrl,
          },
        })
      )
      .then((asset) => {
        form.setValue('logo', asset.url, { shouldDirty: true });
      })
      .catch(() => {
        // Nothing is saved: the preview goes back to the stored logo and
        // the field says why, so a failed upload never looks like it worked.
        setLogoPreviewUrl((previous) => {
          if (previous) logoPicker.revokePreviewUrl(previous);
          return null;
        });
        form.setError('logo', {
          type: 'validation',
          message: 'academy:branding.errors.logoUploadFailed',
        });
      })
      .finally(() => logoPicker.clearFiles());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoPicker.files]);

  useEffect(() => {
    const file = faviconPicker.files?.[0];
    if (!file) return;

    if (file.size > MAX_FAVICON_FILE_SIZE) {
      form.setError('favicon', {
        type: 'validation',
        message: 'academy:branding.errors.faviconTooLarge',
      });
      faviconPicker.clearFiles();
      return;
    }
    if (!ALLOWED_FAVICON_TYPES.includes(file.type)) {
      form.setError('favicon', {
        type: 'validation',
        message: 'academy:branding.errors.faviconInvalidType',
      });
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
    try {
      await updateBranding({
        id: academy.id,
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
      onSaved?.();
    } catch (error) {
      toast({
        title: t('academy:branding.error'),
        description: t('errors:generic.description'),
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

  const currentLogo = logoPreviewUrl ?? academy.logo;
  const currentFavicon = faviconPreviewUrl ?? academy.favicon;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Display Name */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type
                className="size-4 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
              {t('academy:branding.displayName')}
            </CardTitle>
            <CardDescription>
              {t('academy:branding.displayNameDescription')}
            </CardDescription>
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
            <CardTitle className="flex items-center gap-2">
              <ImageIcon
                className="size-4 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
              {t('academy:branding.logo')}
            </CardTitle>
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
                        disabled={uploadLogo.isPending}
                      >
                        {uploadLogo.isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : null}
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
            <CardTitle className="flex items-center gap-2">
              <ImageIcon
                className="size-4 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
              {t('academy:branding.favicon')}
            </CardTitle>
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
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              {t(cancelLabelKey)}
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending || uploadLogo.isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('academy:branding.saving')}
              </>
            ) : (
              <>
                <Save className="size-4" strokeWidth={2} aria-hidden />
                {t(submitLabelKey)}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
