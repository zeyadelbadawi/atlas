/**
 * Visual Identity (Task G) — the one place an Academy's look is edited:
 * its name, logo, favicon, website colours and dark-background logo, with
 * ONE "Save Visual Identity".
 *
 * WHY ONE PAGE. The logo used to be uploaded in two places (Academy
 * Branding, and the Website settings' Brand tab), the colours were saved
 * by a third button after a separate "Accept palette", and the logo went
 * live at once while the colours waited in the website draft — visitors
 * saw a new logo on the old colours. Here nothing is saved until "Save
 * Visual Identity", everything is saved together (one transaction, see
 * `PUT academies/:id/visual-identity`), and it is live on save.
 *
 * WHAT WAS WRONG WITH THE BRAND TAB, AND HOW THIS AVOIDS IT:
 *  - the logo URL was frozen at mount, and the "logo changed" offer was
 *    computed against it — from the second upload on it named the OLD
 *    logo. The offer now compares only the SAVED logo with the logo the
 *    SAVED palette came from, and is hidden while a new logo is pending;
 *  - "Keep my colours" was remembered forever. It now applies to the one
 *    logo it was given for;
 *  - two quick uploads could finish out of order and the older one won.
 *    Each upload carries a ticket; only the latest is kept;
 *  - an analysis that threw left the studio "analyzing" for good
 *    (`useBrandStudio` now reports it as a failure).
 *
 * The onboarding wizard keeps its own approve step (`SetupBrandStudio`).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { ImageIcon, Loader2, RefreshCw, Save, Upload, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useFilePicker, useUnsavedChanges } from '@hooks';
import {
  ALLOWED_FAVICON_TYPES,
  MAX_ACADEMY_NAME_LENGTH,
  MAX_FAVICON_FILE_SIZE,
  getAcademyAdminTabs,
  useAcademy,
} from '@features/academy';
import { useUploadMediaAsset } from '@features/media';
import { RequestServiceCard } from '@features/customer-requests';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type {
  Academy,
  BreadcrumbItem,
  SaveVisualIdentityPayload,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';
import {
  useSaveVisualIdentity,
  useWebsiteConfiguration,
  useWebsitePages,
} from '../hooks';
import { WebsiteImageField } from '../components/WebsiteImageField';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { BrandStudio } from '../brand-studio/BrandStudio';
import { BrandPreviewFrame } from '../brand-studio/BrandPreviewFrame';
import { brandPreviewSample } from '../brand-studio/brand-preview-sample';
import {
  toPaletteInput,
  useBrandStudio,
  type BrandPaletteDraft,
} from '../brand-studio/useBrandStudio';
import { useLogoChangeCheck } from '../brand-studio/useLogoChangeCheck';
import { isUsablePalette } from '../theme-packs/brand-palette.utils';
import { stableJsonKey } from '../utils/stable-json.utils';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** What the palette draft saves as — its status is not an edit (Save confirms it). */
function paletteKey(draft: BrandPaletteDraft): string {
  return stableJsonKey({ ...toPaletteInput(draft), status: undefined });
}

interface SavedIdentity {
  readonly name: string;
  readonly logo?: string;
  readonly favicon?: string;
  readonly darkLogo?: string;
  readonly palette: string;
  /** The fingerprint of the logo the saved palette came from. */
  readonly paletteLogoFingerprint?: string;
}

export default function VisualIdentityPage(): JSX.Element {
  const { academyId = '' } = useParams<{ academyId: string }>();
  const academyQuery = useAcademy(academyId);
  const configQuery = useWebsiteConfiguration(academyId);
  const pagesQuery = useWebsitePages(academyId, {
    query: { pagination: { page: 1, pageSize: 50 } },
  });

  if (academyQuery.isLoading || configQuery.isLoading || pagesQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!academyQuery.data || !configQuery.data) {
    return (
      <PageContainer>
        <PageHeader titleKey="website:visualIdentity.title" />
        <ErrorState
          onRetry={() => {
            void academyQuery.refetch();
            void configQuery.refetch();
            void pagesQuery.refetch();
          }}
        />
      </PageContainer>
    );
  }

  return (
    <VisualIdentityEditor
      key={academyQuery.data.id}
      academy={academyQuery.data}
      configuration={configQuery.data}
      pages={pagesQuery.data?.items ?? []}
    />
  );
}

interface VisualIdentityEditorProps {
  readonly academy: Academy;
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
}

export function VisualIdentityEditor({
  academy,
  configuration,
  pages,
}: VisualIdentityEditorProps): JSX.Element {
  const { t } = useTranslation();
  const academyId = academy.id;
  const theme = getWebsiteTheme(configuration.themeKey);
  const storedPalette = isUsablePalette(configuration.brand.palette)
    ? configuration.brand.palette
    : undefined;
  const studio = useBrandStudio({ theme, initialPalette: storedPalette });
  const saveIdentity = useSaveVisualIdentity();
  const uploadLogo = useUploadMediaAsset();

  const [name, setName] = useState(academy.name);
  const [logo, setLogo] = useState<string | undefined>(academy.logo);
  const [favicon, setFavicon] = useState<string | undefined>(academy.favicon);
  const [darkLogo, setDarkLogo] = useState<string | undefined>(
    configuration.brand.darkLogo
  );
  const [saved, setSaved] = useState<SavedIdentity>(() => ({
    name: academy.name,
    logo: academy.logo,
    favicon: academy.favicon,
    darkLogo: configuration.brand.darkLogo,
    palette: paletteKey(studio.draft),
    paletteLogoFingerprint: storedPalette?.extraction?.logoFingerprint,
  }));
  const [nameError, setNameError] = useState(false);

  // Only the latest logo upload may land (see the doc comment).
  const uploadTicket = useRef(0);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const currentPaletteKey = useMemo(
    () => paletteKey(studio.draft),
    [studio.draft]
  );
  const changes = {
    name: name.trim() !== saved.name,
    logo: logo !== saved.logo,
    favicon: favicon !== saved.favicon,
    darkLogo: (darkLogo ?? '') !== (saved.darkLogo ?? ''),
    palette: currentPaletteKey !== saved.palette,
  };
  const isDirty = Object.values(changes).some(Boolean);

  // §F.4.6: the SAVED logo is not the one the SAVED palette came from (it
  // was replaced during onboarding, say). Never while a new logo is
  // pending — that one is analysed as it is picked.
  const logoChange = useLogoChangeCheck(
    changes.logo ? undefined : saved.logo,
    saved.paletteLogoFingerprint
  );
  const [keptColoursFor, setKeptColoursFor] = useState<string | undefined>();
  const showLogoChange =
    logoChange.changed && !!logoChange.logo && keptColoursFor !== saved.logo;

  const onLogoPicked = async (file: File) => {
    const ticket = ++uploadTicket.current;
    setIsUploadingLogo(true);
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
      if (uploadTicket.current === ticket) setLogo(asset.url);
    } catch {
      if (uploadTicket.current === ticket) {
        toast({
          title: t('website:brandStudio.logoSaveError'),
          variant: 'destructive',
        });
      }
    } finally {
      if (uploadTicket.current === ticket) setIsUploadingLogo(false);
    }
  };

  const faviconPicker = useFilePicker({
    accept: ALLOWED_FAVICON_TYPES.join(','),
  });
  useEffect(() => {
    const file = faviconPicker.files?.[0];
    if (!file) return;
    faviconPicker.clearFiles();
    if (
      file.size > MAX_FAVICON_FILE_SIZE ||
      !ALLOWED_FAVICON_TYPES.includes(file.type)
    ) {
      toast({
        title: t(
          file.size > MAX_FAVICON_FILE_SIZE
            ? 'academy:branding.errors.faviconTooLarge'
            : 'academy:branding.errors.faviconInvalidType'
        ),
        variant: 'destructive',
      });
      return;
    }
    void readFileAsDataUrl(file).then(setFavicon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faviconPicker.files]);

  // A new logo's palette is still being worked out: saving now would put
  // the new logo live on the old colours — the very mismatch this page
  // exists to prevent.
  const isAnalysingLogo = studio.analysis.kind === 'analyzing';

  const save = async (): Promise<boolean> => {
    if (saveIdentity.isPending || isUploadingLogo || isAnalysingLogo)
      return false;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      return false;
    }
    if (changes.palette && !studio.validation.valid) return false;

    const brand: NonNullable<SaveVisualIdentityPayload['brand']> = {
      ...(changes.palette
        ? {
            palette: toPaletteInput({
              ...studio.draft,
              status: 'confirmed',
            }) as unknown as Record<string, unknown>,
          }
        : {}),
      ...(changes.darkLogo ? { darkLogo: darkLogo ?? '' } : {}),
    };
    const payload: SaveVisualIdentityPayload = {
      ...(changes.name ? { name: trimmed } : {}),
      ...(changes.logo ? { logo: logo ?? null } : {}),
      ...(changes.favicon ? { favicon: favicon ?? null } : {}),
      ...(Object.keys(brand).length > 0 ? { brand } : {}),
      expectedUpdatedAt: configuration.updatedAt,
    };

    try {
      const result = await saveIdentity.mutateAsync({ academyId, payload });
      const savedPalette = isUsablePalette(result.configuration.brand.palette)
        ? result.configuration.brand.palette
        : undefined;
      // The Save IS the approval: the draft is the confirmed palette now.
      studio.actions.accept();
      setSaved({
        name: result.academy.name,
        logo: result.academy.logo,
        favicon: result.academy.favicon,
        darkLogo: result.configuration.brand.darkLogo,
        palette: currentPaletteKey,
        paletteLogoFingerprint: savedPalette?.extraction?.logoFingerprint,
      });
      toast({ title: t('website:visualIdentity.saved') });
      return true;
    } catch (error) {
      const conflict = (error as { kind?: string }).kind === 'conflict';
      toast({
        title: t(
          conflict
            ? 'website:visualIdentity.conflict'
            : 'website:visualIdentity.saveError'
        ),
        variant: 'destructive',
      });
      return false;
    }
  };

  useUnsavedChanges({
    isDirty,
    messageKey: 'website:visualIdentity.unsavedChanges',
    onSave: save,
  });

  const home = pages.find((page) => page.coreType === 'home');
  const sample = brandPreviewSample(name);
  const isSaving = saveIdentity.isPending;
  const canSave =
    isDirty &&
    !isSaving &&
    !isUploadingLogo &&
    !isAnalysingLogo &&
    (!changes.palette || studio.validation.valid);

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      label: academy.name,
      path: DASHBOARD_ROUTES.academy,
    },
    { labelKey: 'website:visualIdentity.title' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={academy.name}
        titleKey="website:visualIdentity.title"
        descriptionKey="website:visualIdentity.subtitle"
        breadcrumbs={breadcrumbs}
      />

      <SectionTabs items={getAcademyAdminTabs(academyId)} />

      <div className="space-y-6 pb-24">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('website:visualIdentity.basicsTitle')}
            </CardTitle>
            <CardDescription>
              {t('academy:branding.displayNameDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visual-identity-name">
                {t('academy:create.nameLabel')}
              </Label>
              <Input
                id="visual-identity-name"
                value={name}
                maxLength={MAX_ACADEMY_NAME_LENGTH}
                aria-invalid={nameError}
                aria-describedby={
                  nameError ? 'visual-identity-name-error' : undefined
                }
                onChange={(event) => {
                  setName(event.target.value);
                  if (event.target.value.trim()) setNameError(false);
                }}
              />
              {nameError ? (
                <p
                  id="visual-identity-name-error"
                  className="text-sm text-destructive"
                >
                  {t('website:visualIdentity.nameRequired')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {t('academy:branding.favicon')}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
                  {favicon ? (
                    <img
                      src={favicon}
                      alt=""
                      className="size-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={faviconPicker.openFilePicker}
                >
                  <Upload className="size-4" aria-hidden />
                  {favicon
                    ? t('academy:branding.changeFavicon')
                    : t('academy:branding.uploadFavicon')}
                </Button>
                {favicon ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFavicon(undefined)}
                  >
                    <X className="size-4" aria-hidden />
                    {t('academy:branding.removeFavicon')}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('academy:branding.faviconHelp')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('website:visualIdentity.logoAndColoursTitle')}
            </CardTitle>
            <CardDescription>
              {t('website:visualIdentity.logoAndColoursDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {showLogoChange ? (
              <div
                role="status"
                data-testid="visual-identity-logo-changed"
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
                      setKeptColoursFor(saved.logo);
                    }}
                  >
                    <RefreshCw className="size-4" aria-hidden />
                    {t('website:brandStudio.logoChanged.preview')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setKeptColoursFor(saved.logo)}
                  >
                    {t('website:brandStudio.logoChanged.keep')}
                  </Button>
                </div>
              </div>
            ) : null}
            <BrandStudio
              studio={studio}
              showAccept={false}
              logoPreviewUrl={logo}
              onLogoPicked={(file) => void onLogoPicked(file)}
              renderPreview={(palette) => (
                <BrandPreviewFrame
                  palette={palette}
                  themeKey={configuration.themeKey}
                  academyId={academyId}
                  academyName={name.trim() || academy.name}
                  academyLogo={logo}
                  configuration={configuration}
                  pages={home ? pages : [sample.page]}
                  page={home ?? sample.page}
                />
              )}
            />
            {logo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // A pending upload must not bring the removed logo back.
                  uploadTicket.current += 1;
                  setIsUploadingLogo(false);
                  setLogo(undefined);
                }}
              >
                <X className="size-4" aria-hidden />
                {t('academy:branding.removeLogo')}
              </Button>
            ) : null}
            {/* Owners/administrators only (the card checks the academy
                role itself): a professional logo from the Atlas team. */}
            <RequestServiceCard type="logo" headingLevel="h4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <WebsiteImageField
              id="website-dark-logo"
              labelKey="website:brand.darkLogo"
              purpose="darkLogo"
              value={darkLogo || undefined}
              onChange={setDarkLogo}
              aspectClassName="aspect-video bg-neutral-900"
              academyId={academyId}
            />
            <p className="text-sm text-muted-foreground">
              {t('website:brand.darkLogoHelp')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* One action, always in reach. */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p
            className="me-auto text-sm text-muted-foreground"
            aria-live="polite"
            data-testid="visual-identity-state"
          >
            {isUploadingLogo
              ? t('website:brandStudio.savingLogo')
              : isDirty
                ? t('website:visualIdentity.unsavedHint')
                : t('website:visualIdentity.savedHint')}
          </p>
          <Button
            type="button"
            data-testid="visual-identity-save"
            onClick={() => void save()}
            disabled={!canSave}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {t('website:visualIdentity.save')}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
