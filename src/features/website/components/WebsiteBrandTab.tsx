/**
 * Website Brand Tab (Theme 1 plan §F.4.3 step 5, §F.4.5).
 *
 * The Brand Studio: upload or replace the logo, see the proposed palette
 * on the Academy's real home page, regenerate, adjust, accept, save. The
 * palette's seeds ARE the website's colours — the backend re-derives every
 * role, validates the full contrast matrix and writes the legacy colour
 * fields equal to the seeds, so themes that don't use the palette keep
 * working. The dark-background logo variant stays here too.
 *
 * The logo itself is the Academy's (Academy branding), uploaded as a
 * MediaAsset — the same field the Academy Branding page edits.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useUpdateAcademyBranding } from '@features/academy';
import { useUploadMediaAsset } from '@features/media';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { WebsiteImageField } from './WebsiteImageField';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { BrandStudio } from '../brand-studio/BrandStudio';
import { BrandPreviewFrame } from '../brand-studio/BrandPreviewFrame';
import { brandPreviewSample } from '../brand-studio/brand-preview-sample';
import { toPaletteInput, useBrandStudio } from '../brand-studio/useBrandStudio';
import { useLogoChangeCheck } from '../brand-studio/useLogoChangeCheck';
import { isUsablePalette } from '../theme-packs/brand-palette.utils';
import type { WebsiteConfiguration, WebsitePage } from '@types';

export interface WebsiteBrandTabProps {
  readonly academyId: string;
  readonly academyName?: string;
  readonly academyLogo?: string;
  readonly configuration: WebsiteConfiguration;
  readonly pages?: readonly WebsitePage[];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function WebsiteBrandTab({
  academyId,
  academyName = '',
  academyLogo,
  configuration,
  pages = [],
}: WebsiteBrandTabProps): JSX.Element {
  const { t } = useTranslation();
  const theme = getWebsiteTheme(configuration.themeKey);
  const updateConfig = useUpdateWebsiteConfiguration();
  const uploadLogo = useUploadMediaAsset();
  const updateBranding = useUpdateAcademyBranding();
  const storedPalette = isUsablePalette(configuration.brand.palette)
    ? configuration.brand.palette
    : undefined;
  const studio = useBrandStudio({ theme, initialPalette: storedPalette });
  const [logoUrl, setLogoUrl] = useState(academyLogo);
  // §F.4.6: the logo was replaced elsewhere since this palette was built.
  // Offer a review; the stored palette is never overwritten without Save.
  const logoChange = useLogoChangeCheck(
    logoUrl,
    studio.draft.extraction?.logoFingerprint
  );
  const [logoChangeDismissed, setLogoChangeDismissed] = useState(false);
  const showLogoChange =
    logoChange.changed && !!logoChange.logo && !logoChangeDismissed;

  const saveBrand = (brand: Partial<WebsiteConfiguration['brand']>) =>
    updateConfig.mutate(
      { academyId, payload: { brand } },
      {
        onSuccess: () => toast({ title: t('website:brand.saved') }),
        onError: () =>
          toast({
            title: t('website:brand.saveError'),
            variant: 'destructive',
          }),
      }
    );

  const onLogoPicked = async (file: File) => {
    try {
      const asset = await uploadLogo.mutateAsync({
        academyId,
        payload: {
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          dataUrl: await readFileAsDataUrl(file),
        },
      });
      await updateBranding.mutateAsync({
        id: academyId,
        payload: { logo: asset.url },
      });
      setLogoUrl(asset.url);
    } catch {
      toast({
        title: t('website:brandStudio.logoSaveError'),
        variant: 'destructive',
      });
    }
  };

  const home = pages.find((page) => page.coreType === 'home');
  const sample = brandPreviewSample(academyName);
  const isSaving = updateConfig.isPending;
  const isLogoBusy = uploadLogo.isPending || updateBranding.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('website:brandStudio.title')}
          </CardTitle>
          <CardDescription>
            {t('website:brandStudio.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showLogoChange ? (
            <div
              role="status"
              className="flex flex-col gap-3 rounded-md bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {t('website:brandStudio.logoChanged.title')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('website:brandStudio.logoChanged.description')}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (logoChange.logo)
                      void studio.actions.analyzeFile(logoChange.logo);
                  }}
                >
                  <RefreshCw className="size-4" aria-hidden />
                  {t('website:brandStudio.logoChanged.preview')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setLogoChangeDismissed(true)}
                >
                  {t('website:brandStudio.logoChanged.keep')}
                </Button>
              </div>
            </div>
          ) : null}
          <BrandStudio
            studio={studio}
            logoPreviewUrl={logoUrl}
            onLogoPicked={(file) => void onLogoPicked(file)}
            renderPreview={(palette) => (
              <BrandPreviewFrame
                palette={palette}
                themeKey={configuration.themeKey}
                academyId={academyId}
                academyName={academyName}
                academyLogo={logoUrl}
                configuration={configuration}
                pages={home ? pages : [sample.page]}
                page={home ?? sample.page}
              />
            )}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button
              type="button"
              onClick={() =>
                saveBrand({
                  palette: toPaletteInput(studio.draft) as unknown as Record<
                    string,
                    unknown
                  >,
                })
              }
              disabled={!studio.validation.valid || isSaving}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {t('website:brandStudio.save')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {studio.draft.status === 'confirmed'
                ? t('website:brandStudio.statusConfirmed')
                : t('website:brandStudio.statusProposed')}
            </p>
            {isLogoBusy ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('website:brandStudio.savingLogo')}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <WebsiteImageField
            id="website-dark-logo"
            labelKey="website:brand.darkLogo"
            purpose="darkLogo"
            value={configuration.brand.darkLogo}
            onChange={(darkLogo) => saveBrand({ darkLogo })}
            aspectClassName="aspect-video bg-neutral-900"
            academyId={academyId}
          />
          <p className="text-sm text-muted-foreground">
            {t('website:brand.darkLogoHelp')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
