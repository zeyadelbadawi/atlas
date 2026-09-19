/**
 * The learner navigation as a drawer, below the desktop breakpoint.
 *
 * The bottom bar carries four sections; this is where the other four live.
 * Without it Certificates, Purchases, Devices and Security would be
 * desktop-only — and Devices in particular is the screen a learner needs
 * exactly when they are locked out on a phone by the device limit.
 *
 * The drawer enters from the READING-START edge in both directions
 * (`side={isRtl ? 'right' : 'left'}`), matching `DashboardSidebar`'s
 * identical rule. A drawer that always flies in from the left is not a
 * cosmetic flaw in Arabic: it covers the side the eye starts from and
 * pushes the content it is meant to navigate off the far edge.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { LearnerNavigationList } from './LearnerNavigationList';

export interface LearnerNavigationDrawerProps {
  readonly className?: string;
}

export function LearnerNavigationDrawer({
  className,
}: LearnerNavigationDrawerProps): JSX.Element {
  const { t } = useTranslation();
  const { isRtl } = useLearnerSurface();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Menu className="size-4" strokeWidth={1.75} aria-hidden />
        {t('learning:learnerDashboard.nav.openMenu')}
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side={isRtl ? 'right' : 'left'}
          className="w-layout-sidebar p-0"
        >
          {/* The dialog's accessible name. Visually redundant next to the
              navigation it wraps, which is why it is screen-reader only. */}
          <SheetTitle className="sr-only">
            {t('learning:learnerDashboard.nav.label')}
          </SheetTitle>
          <nav
            aria-label={t('learning:learnerDashboard.nav.label')}
            className="h-full overflow-y-auto p-3"
          >
            <LearnerNavigationList
              showChevron
              onNavigate={() => setIsOpen(false)}
            />
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
