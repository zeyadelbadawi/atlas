/**
 * Preview Viewport.
 *
 * Wraps the real `WebsiteRenderer` in a resizable frame so the editor and
 * the standalone Preview surface can both demonstrate desktop/tablet/
 * mobile behavior — the same renderer, just constrained to a different
 * width, never a separate "preview-only" rendering path.
 */
import { useTranslation } from 'react-i18next';
import { Laptop, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';

export type PreviewBreakpoint = 'desktop' | 'tablet' | 'mobile';

const BREAKPOINT_WIDTH: Record<PreviewBreakpoint, string> = {
  desktop: '100%',
  tablet: '48rem',
  mobile: '24rem',
};

const BREAKPOINT_ICON: Record<PreviewBreakpoint, typeof Laptop> = {
  desktop: Laptop,
  tablet: Tablet,
  mobile: Smartphone,
};

export interface PreviewViewportProps {
  readonly breakpoint: PreviewBreakpoint;
  readonly onBreakpointChange: (breakpoint: PreviewBreakpoint) => void;
  readonly children: React.ReactNode;
}

export function PreviewViewport({
  breakpoint,
  onBreakpointChange,
  children,
}: PreviewViewportProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-1 rounded-md border border-border p-1">
        {(['desktop', 'tablet', 'mobile'] as const).map((bp) => {
          const Icon = BREAKPOINT_ICON[bp];
          return (
            <Button
              key={bp}
              type="button"
              size="sm"
              variant={breakpoint === bp ? 'secondary' : 'ghost'}
              onClick={() => onBreakpointChange(bp)}
              aria-pressed={breakpoint === bp}
            >
              <Icon className="size-4" aria-hidden />
              {t(`website:preview.breakpoint.${bp}`)}
            </Button>
          );
        })}
      </div>
      <div className="flex justify-center overflow-x-auto rounded-lg border border-border bg-muted p-4">
        <div
          className={cn('overflow-hidden rounded-md border border-border bg-background shadow-sm')}
          style={{ width: BREAKPOINT_WIDTH[breakpoint], maxWidth: '100%' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
