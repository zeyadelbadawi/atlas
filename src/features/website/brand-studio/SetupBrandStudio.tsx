/**
 * The setup form's optional "Logo & colours" block (Theme 1 plan §F.4.3
 * step 1): pick a logo, see the proposed palette on a live mini-preview of
 * the chosen theme, regenerate / adjust / accept — all before the Academy
 * exists. Nothing is uploaded here.
 *
 * W2 — the caller sends the palette WITH the provisioning request (applied
 * server-side by its `branding` step, so it survives a refresh); only the
 * logo file waits in the page until the Academy exists, then is attached by
 * media-asset id (`pendingLogoStore`, provisioning feature).
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { WebsiteThemeKey } from '@types';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { BrandStudio } from './BrandStudio';
import { BrandPreviewFrame } from './BrandPreviewFrame';
import { brandPreviewSample } from './brand-preview-sample';
import { toPaletteInput, useBrandStudio } from './useBrandStudio';

/** What the Owner chose here: a logo file and/or the palette inputs. */
export interface SetupBrandingChoice {
  readonly logoFile?: File;
  readonly palette?: ReturnType<typeof toPaletteInput>;
}

export interface SetupBrandStudioProps {
  readonly themeKey: WebsiteThemeKey;
  readonly academyName: string;
  /** The latest choice, or `null` while the Owner hasn't touched this block. */
  readonly onChange: (value: SetupBrandingChoice | null) => void;
}

export function SetupBrandStudio({
  themeKey,
  academyName,
  onChange,
}: SetupBrandStudioProps): JSX.Element {
  const { t } = useTranslation();
  const theme = getWebsiteTheme(themeKey);
  const studio = useBrandStudio({ theme });
  const [logoFile, setLogoFile] = useState<File>();
  const [logoUrl, setLogoUrl] = useState<string>();
  const sample = useMemo(() => brandPreviewSample(academyName), [academyName]);
  const touched = !!logoFile || studio.draft.source !== 'themeDefault';

  useEffect(() => {
    onChange(
      touched ? { logoFile, palette: toPaletteInput(studio.draft) } : null
    );
  }, [touched, logoFile, studio.draft, onChange]);

  useEffect(
    () => () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    },
    [logoUrl]
  );

  return (
    <details className="group rounded-lg border border-border">
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
      </div>
    </details>
  );
}
