/**
 * Academy chooser (P64 Phase 1, AD-12 / D2).
 *
 * The signed-in counterpart of `StudentSignInRefusal`: an account that
 * HAS a session on the platform host but learns rather than manages is
 * shown the academies it belongs to and sent to the right website. Two
 * callers, one rendering:
 *
 * - `/academy-chooser` — where `RouteGuard` sends a `learner` principal
 *   that somehow holds a platform-host session (a session restored from
 *   before the surface split, say). Offers sign-out, since nothing else on
 *   this host is for them.
 * - `/dashboard/learning/*` — the retired dashboard learner routes. A staff
 *   member who is also enrolled somewhere lands here and is pointed at
 *   the academy website, which is where all learning now lives (D2).
 *
 * Auto-navigation is opt-in (`autoNavigateSingle`) and only ever fires
 * when there is exactly ONE academy with a host — never a guess between
 * several, and never for the chooser a learner was redirected to, where a
 * silent cross-origin bounce would feel like being thrown out.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useSignOut } from '@hooks';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { LearnerAcademy } from '@types';
import { AcademyLinkList } from './AcademyLinkList';
import {
  academiesWithHost,
  buildAcademyUrl,
  isManagementPrincipal,
} from '../utils/academy-surface.utils';

export interface AcademyChooserProps {
  readonly titleKey: string;
  readonly descriptionKey: string;
  /** The path on the academy host the links point at (`/my-learning` for a signed-in learner). */
  readonly targetPath: string;
  /** Offer a sign-out action — for the chooser a learner is redirected to. */
  readonly showSignOut?: boolean;
  /** `window.location.assign` to the only academy with a host, on mount. */
  readonly autoNavigateSingle?: boolean;
  readonly className?: string;
}

/** Pulls the academies off the user, labelling pending/blocked memberships. */
function toListItems(
  academies: readonly LearnerAcademy[],
  t: (key: string) => string
) {
  return academies.map((academy) => ({
    academyId: academy.academyId,
    name: academy.name,
    host: academy.host,
    note: academy.blocked
      ? t('auth:academyList.blocked')
      : academy.membershipStatus === 'pending'
        ? t('auth:academyList.pendingApproval')
        : undefined,
  }));
}

export function AcademyChooser({
  titleKey,
  descriptionKey,
  targetPath,
  showSignOut = false,
  autoNavigateSingle = false,
  className,
}: AcademyChooserProps): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { signOut, isLoading: isSigningOut } = useSignOut();

  const academies = user?.academies ?? [];
  const linkable = academiesWithHost(academies);
  const single = linkable.length === 1 ? linkable[0] : undefined;
  const singleUrl = single?.host
    ? buildAcademyUrl(single.host, targetPath)
    : undefined;

  useEffect(() => {
    if (!autoNavigateSingle || !singleUrl) return;
    window.location.assign(singleUrl);
  }, [autoNavigateSingle, singleUrl]);

  return (
    <section
      aria-labelledby="academy-chooser-title"
      className={className}
      data-testid="academy-chooser"
    >
      <div className="space-y-2 text-center">
        <h1
          id="academy-chooser-title"
          className="font-display text-2xl font-semibold tracking-tight text-foreground"
        >
          {t(titleKey)}
        </h1>
        <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
      </div>

      <div className="mt-8 space-y-4">
        {single && academies.length > 1 ? (
          // Several memberships but only one with a website: the linkable
          // one is the real action, so it gets the prominent treatment
          // above the full list (which still names the others, with their
          // "no website yet" note, rather than hiding them).
          <AcademyLinkList
            academies={toListItems([single], t)}
            targetPath={targetPath}
            emphasizeSingle
          />
        ) : null}
        <AcademyLinkList
          academies={toListItems(academies, t)}
          targetPath={targetPath}
          emphasizeSingle
        />
        {autoNavigateSingle && singleUrl ? (
          <p className="text-center text-xs text-muted-foreground">
            {t('auth:academyChooser.redirecting', { academy: single?.name ?? '' })}
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-2">
        {isManagementPrincipal(user) ? (
          <Button asChild variant="outline">
            <Link to={DASHBOARD_ROUTES.root}>
              <LayoutDashboard className="size-4" aria-hidden />
              {t('auth:academyChooser.backToDashboard')}
            </Link>
          </Button>
        ) : null}
        {showSignOut ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => void signOut()}
            disabled={isSigningOut}
            data-testid="academy-chooser-sign-out"
          >
            <LogOut className="size-4" aria-hidden />
            {t('auth:academyChooser.signOut')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
