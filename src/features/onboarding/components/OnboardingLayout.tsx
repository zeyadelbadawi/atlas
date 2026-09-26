/**
 * The onboarding shell's full-screen frame.
 *
 * Not the dashboard: no sidebar, no top bar of product navigation — just
 * the Atlas mark, the language switcher and "Finish for now" at the top,
 * the progress rail beside the step, and generous space around one task.
 * Built from the same tokens and components as the auth layout, so it is
 * recognisably Atlas without borrowing the dashboard's density.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AtlasLogo } from '@components/branding';
import { LanguageSwitcher } from '@components/controls';

export interface OnboardingLayoutProps {
  /** The progress rail; absent while the status is loading or failed. */
  readonly rail?: ReactNode;
  readonly children: ReactNode;
  /** "Finish for now". Absent where the screen offers it itself. */
  readonly onFinishForNow?: () => void;
  readonly isFinishingForNow?: boolean;
}

export function OnboardingLayout({
  rail,
  children,
  onFinishForNow,
  isFinishingForNow = false,
}: OnboardingLayoutProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-layout-header max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <AtlasLogo size="sm" />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {t('onboarding:shell.title')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            {onFinishForNow ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onFinishForNow}
                disabled={isFinishingForNow}
                aria-busy={isFinishingForNow}
                data-testid="onboarding-finish-for-now"
              >
                {isFinishingForNow ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('onboarding:shell.finishForNow')}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:py-16">
        {rail ? (
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            {rail}
          </aside>
        ) : (
          <span />
        )}
        <main className="mx-auto w-full min-w-0 max-w-2xl lg:mx-0">
          {children}
        </main>
      </div>
    </div>
  );
}
