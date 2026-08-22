/**
 * Website Theme Preview Card.
 *
 * Renders the REAL `WebsiteRenderer` — the Tenant's own Home page,
 * content and current brand — at a miniature scale, never a static
 * screenshot or unrelated placeholder content (see
 * `Reports/ARCHITECTURE.md`, Prompt 9, "Theme Preview").
 */
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebsiteRenderer } from '../renderer';
import type { WebsiteConfiguration, WebsitePage, WebsiteThemeDefinition } from '@types';

export interface WebsiteThemePreviewCardProps {
  readonly theme: WebsiteThemeDefinition;
  readonly isActive: boolean;
  readonly academyId: string;
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
  readonly homePage: WebsitePage;
  readonly onSelect: () => void;
  readonly isSelecting: boolean;
}

const PREVIEW_CANVAS_WIDTH = 1200;
const PREVIEW_SCALE = 0.22;

export function WebsiteThemePreviewCard({
  theme,
  isActive,
  academyId,
  academyName,
  academyLogo,
  configuration,
  pages,
  homePage,
  onSelect,
  isSelecting,
}: WebsiteThemePreviewCardProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className={
        isActive
          ? 'overflow-hidden rounded-lg border-2 border-primary'
          : 'overflow-hidden rounded-lg border border-border'
      }
    >
      <div className="relative h-52 w-full overflow-hidden bg-muted">
        <div
          className="pointer-events-none"
          style={{
            width: `${PREVIEW_CANVAS_WIDTH}px`,
            transform: `scale(${PREVIEW_SCALE})`,
            transformOrigin: 'top',
          }}
        >
          <WebsiteRenderer
            academyId={academyId}
            academyName={academyName}
            academyLogo={academyLogo}
            configuration={{ ...configuration, themeKey: theme.key }}
            pages={pages}
            page={homePage}
            onNavigate={() => undefined}
          />
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-foreground">{t(theme.nameKey)}</h3>
          {isActive ? <Check className="size-4 shrink-0 text-success" aria-hidden /> : null}
        </div>
        <p className="text-sm text-muted-foreground">{t(theme.descriptionKey)}</p>
        <Button
          type="button"
          size="sm"
          variant={isActive ? 'outline' : 'default'}
          disabled={isActive || isSelecting}
          onClick={onSelect}
          className="w-full"
        >
          {isActive ? t('website:theme.currentTheme') : t('website:theme.selectTheme')}
        </Button>
      </div>
    </div>
  );
}
