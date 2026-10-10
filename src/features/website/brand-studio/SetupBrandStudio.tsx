/**
 * The setup form's optional "Logo & colours" block (Theme 1 plan §F.4.3
 * step 1): pick a logo, see the proposed palette on a live mini-preview of
 * the chosen theme, regenerate / adjust / accept — all before the Academy
 * exists. Nothing is uploaded here.
 *
 * W2 — the caller sends the palette WITH the provisioning request (applied
 * server-side by its `branding` step, so it survives a refresh); only the
 * logo file waits in the page until the Academy exists, then is attached by
 * media-asset id (`pendingLogoStore`, provisioning feature). The favicon
 * picked here waits the same way and is saved once the Academy is ready
 * (`pendingFaviconStore`).
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WebsiteThemeKey } from '@types';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { BrandStudio } from './BrandStudio';
import { BrandPreviewFrame } from './BrandPreviewFrame';
import { brandPreviewSample } from './brand-preview-sample';
import { toPaletteInput, useBrandStudio } from './useBrandStudio';

/** What the Owner chose here: a logo file and/or the palette inputs. */
export interface SetupBrandingChoice {
  readonly logoFile?: File;
  /** PNG or ICO, at most 1 MB; saved once the Academy is ready. */
  readonly faviconFile?: File;
  readonly palette?: ReturnType<typeof toPaletteInput>;
}

export interface SetupBrandStudioProps {
  readonly themeKey: WebsiteThemeKey;
  readonly academyName: string;
  /** The latest choice, or `null` while the Owner hasn't touched this block. */
  readonly onChange: (value: SetupBrandingChoice | null) => void;
  /** Open the block on first render (the onboarding shell). */
  readonly defaultOpen?: boolean;
}

/** Same limits as the Brand settings favicon field and the backend. */
const FAVICON_TYPES = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon'];
const FAVICON_MAX_BYTES = 1024 * 1024;

export function SetupBrandStudio({
  themeKey,
  academyName,
  onChange,
  defaultOpen = false,
}: SetupBrandStudioProps): JSX.Element {
  const { t } = useTranslation();
  const theme = getWebsiteTheme(themeKey);
  const studio = useBrandStudio({ theme });
  const [logoFile, setLogoFile] = useState<File>();
  const [logoUrl, setLogoUrl] = useState<string>();
  const sample = useMemo(() => brandPreviewSample(academyName), [academyName]);
  const [faviconFile, setFaviconFile] = useState<File>();
  const [faviconUrl, setFaviconUrl] = useState<string>();
  const [faviconError, setFaviconError] = useState<string>();
  const paletteTouched = !!logoFile || studio.draft.source !== 'themeDefault';

  useEffect(() => {
    if (!paletteTouched && !faviconFile) {
      onChange(null);
      return;
    }
    onChange({
      logoFile,
      faviconFile,
      // A favicon alone does not change the website's colours.
      palette: paletteTouched ? toPaletteInput(studio.draft) : undefined,
    });
  }, [paletteTouched, logoFile, faviconFile, studio.draft, onChange]);

  useEffect(
    () => () => {
      if (faviconUrl) URL.revokeObjectURL(faviconUrl);
    },
    [faviconUrl]
  );

  const pickFavicon = (file: File | undefined) => {
    if (!file) return;
    if (!FAVICON_TYPES.includes(file.type)) {
      setFaviconError('academy:branding.errors.faviconInvalidType');
      return;
    }
    if (file.size > FAVICON_MAX_BYTES) {
      setFaviconError('academy:branding.errors.faviconTooLarge');
      return;
    }
    setFaviconError(undefined);
    setFaviconFile(file);
    setFaviconUrl(URL.createObjectURL(file));
  };

  useEffect(
    () => () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    },
    [logoUrl]
  );

  return (
    <details
      className="group rounded-lg border border-border"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-medium text-foreground">
            {t('website:brandStudio.setupTitle')}
          </span>
          <span className="block text-xs text-muted-foreground">
            {t('website:brandStudio.setupHelp')}
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border p-4">
        <BrandStudio
          studio={studio}
          logoPreviewUrl={logoUrl}
          onLogoPicked={(file) => {
            setLogoFile(file);
            setLogoUrl(URL.createObjectURL(file));
          }}
          renderPreview={(palette) => (
            <BrandPreviewFrame
              palette={palette}
              themeKey={themeKey}
              academyId=""
              academyName={academyName || t('website:brandStudio.sampleName')}
              academyLogo={logoUrl}
              configuration={sample.configuration}
              pages={[sample.page]}
              page={sample.page}
              scale={0.4}
              height={420}
            />
          )}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <span
            className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
            aria-hidden
          >
            {faviconUrl ? (
              <img src={faviconUrl} alt="" className="size-6 object-contain" />
            ) : (
              <ImagePlus className="size-4 text-muted-foreground" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">
              {t('website:brandStudio.faviconLabel')}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('website:brandStudio.faviconHelp')}
            </span>
          </span>
          <label className="cursor-pointer">
            <input
              type="file"
              accept={FAVICON_TYPES.join(',')}
              className="sr-only"
              data-testid="setup-favicon-input"
              onChange={(event) => {
                pickFavicon(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <span className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
              {faviconFile
                ? t('website:brandStudio.faviconChange')
                : t('website:brandStudio.faviconPick')}
            </span>
          </label>
          {faviconFile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('website:brandStudio.faviconRemove')}
              onClick={() => {
                setFaviconFile(undefined);
                setFaviconUrl(undefined);
              }}
            >
              <X className="size-4" aria-hidden />
            </Button>
          ) : null}
          {faviconError ? (
            <p className="w-full text-xs text-destructive" role="alert">
              {t(faviconError)}
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}
