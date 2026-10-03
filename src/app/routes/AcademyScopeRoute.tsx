/**
 * AcademyScopeRoute (W5) — the dashboard content outlet, as the academy
 * scope's remount boundary.
 *
 * `<Outlet key={academyId} />`: every screen of academy A is unmounted when
 * the URL moves to academy B, so no page state, open dialog, filter, upload
 * preview or unsaved form can bleed from one academy into the other, and a
 * pending mutation's callbacks stay bound to the academy they were made in.
 * (Unsaved forms are asked about first: the switch is a navigation, which
 * `NavigationBlockDialog` intercepts.) Outside any academy the key is
 * constant, so ordinary navigation keeps its usual behaviour.
 *
 * It also hosts the switching overlay, bound to the real membership check
 * plus the new academy's first data load, and the message explaining a
 * redirect after access to an academy was lost.
 */
import { useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  AcademySwitchingOverlay,
  useAcademies,
  useAcademyScope,
  useAcademySwitchPhase,
} from '@features/academy';
import type { AcademyScopeLocationState } from '@features/academy';

function AccessLostNotice(): JSX.Element | null {
  const { t } = useTranslation();
  const location = useLocation();
  const lost = (location.state as AcademyScopeLocationState | null)
    ?.academyAccessLost;
  const [dismissedFor, setDismissedFor] = useState<string | undefined>();
  if (!lost || dismissedFor === location.key) return null;

  return (
    <div className="px-4 pt-4 sm:px-6 lg:px-8">
      <Alert
        variant="destructive"
        data-testid="academy-access-lost"
        className="pe-12"
      >
        <ShieldAlert className="size-4" aria-hidden />
        <AlertTitle>
          {t(
            lost.reason === 'notFound'
              ? 'academy:switcher.accessLost.goneTitle'
              : 'academy:switcher.accessLost.title'
          )}
        </AlertTitle>
        <AlertDescription>
          {lost.academyName
            ? t('academy:switcher.accessLost.namedDescription', {
                name: lost.academyName,
              })
            : t('academy:switcher.accessLost.description')}
        </AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute end-2 top-2 size-9"
          aria-label={t('academy:switcher.accessLost.dismiss')}
          onClick={() => setDismissedFor(location.key)}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </Alert>
    </div>
  );
}

export function AcademyScopeRoute(): JSX.Element {
  const { academyId, membership, isResolving } = useAcademyScope();
  const switching = useAcademySwitchPhase(academyId, isResolving);
  const { data: academies } = useAcademies();
  const academyName =
    membership?.academy.name ??
    academies?.items.find((academy) => academy.id === academyId)?.name;

  return (
    <>
      <AccessLostNotice />
      <div
        className="relative min-h-full"
        aria-busy={switching || undefined}
        data-academy-scope={academyId}
      >
        <Outlet key={academyId ?? 'no-academy'} />
        <AcademySwitchingOverlay
          visible={switching}
          academyName={academyName}
        />
      </div>
    </>
  );
}
