/**
 * Dashboard topbar.
 *
 * Holds the mobile navigation trigger and the global controls. Account and
 * notification menus are added by the modules that own them; the topbar exposes
 * a slot rather than anticipating their implementation.
 */
import type { ReactNode } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher, ThemeSwitcher } from '@components/controls';

export interface DashboardTopbarProps {
  /** Opens the mobile navigation drawer. */
  readonly onOpenNavigation: () => void;
  /** True when the viewport is below the sidebar breakpoint. */
  readonly isMobile: boolean;
  /** Whether a sensible back destination exists — hides the control when false. */
  readonly canGoBack?: boolean;
  /** Navigates to the best available previous page. */
  readonly onGoBack?: () => void;
  /** Slot for module-owned controls such as account or notification menus. */
  readonly actions?: ReactNode;
}

export function DashboardTopbar({
  onOpenNavigation,
  isMobile,
  canGoBack,
  onGoBack,
  actions,
}: DashboardTopbarProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-20 flex h-layout-header shrink-0 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-1">
        {isMobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenNavigation}
            aria-label={t('navigation:sidebar.open')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="size-5" strokeWidth={1.75} aria-hidden />
          </Button>
        ) : null}

        {canGoBack && onGoBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onGoBack}
            aria-label={t('navigation:back')}
            title={t('navigation:back')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft
              className="size-5 rtl:-scale-x-100"
              strokeWidth={1.75}
              aria-hidden
            />
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {actions}
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
    </header>
  );
}
