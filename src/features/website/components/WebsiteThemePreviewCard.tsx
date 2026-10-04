/**
 * Website Theme Preview Card.
 *
 * Renders the REAL `WebsiteRenderer` — the Tenant's own Home page,
 * content and current brand — at a miniature scale, never a static
 * screenshot or unrelated placeholder content (see
 * `Reports/ARCHITECTURE.md`, Prompt 9, "Theme Preview").
 *
 * The miniature is a picture of the site, not a second copy of its links:
 * hidden from assistive tech and unreachable by keyboard. Each card's action
 * is named with its theme ("Select theme Atelier"), so several cards never
 * offer identical, ambiguous buttons.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebsiteRenderer } from '../renderer';
import type {
  WebsiteConfiguration,
  WebsitePage,
  WebsiteThemeDefinition,
} from '@types';

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
/** The miniature's own box: the scaled canvas, centred in the card. */
const PREVIEW_WIDTH = PREVIEW_CANVAS_WIDTH * PREVIEW_SCALE;

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
  const nameId = useId();
  const actionId = useId();

  return (
    <div
      className={
        isActive
          ? 'overflow-hidden rounded-lg border-2 border-primary'
          : 'overflow-hidden rounded-lg border border-border'
      }
    >
      <div
        data-testid="theme-preview-frame"
        className="flex h-52 w-full justify-center overflow-hidden bg-muted"
        aria-hidden
        // `inert` — React 18's types don't know it yet.
        {...{ inert: '' }}
      >
        {/* The scaled canvas keeps its 1200 px layout box, so it sits in a
            box of its scaled width, anchored at the inline start: the
            miniature then shows whole and centred in either direction. */}
        <div className="shrink-0" style={{ width: PREVIEW_WIDTH }}>
          <div
            className="pointer-events-none origin-top-left rtl:origin-top-right"
            style={{
              width: `${PREVIEW_CANVAS_WIDTH}px`,
              transform: `scale(${PREVIEW_SCALE})`,
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
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 id={nameId} className="font-medium text-foreground">
            {t(theme.nameKey)}
          </h3>
          {isActive ? (
            <Check className="size-4 shrink-0 text-success" aria-hidden />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {t(theme.descriptionKey)}
        </p>
        <Button
          type="button"
          size="sm"
          variant={isActive ? 'outline' : 'default'}
          disabled={isActive || isSelecting}
          onClick={onSelect}
          className="w-full"
          aria-labelledby={`${actionId} ${nameId}`}
        >
          <span id={actionId}>
            {isActive
              ? t('website:theme.currentTheme')
              : t('website:theme.selectTheme')}
          </span>
        </Button>
      </div>
    </div>
  );
}
