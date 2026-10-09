/**
 * Dashboard layout.
 *
 * The authenticated application shell: persistent navigation, a topbar, and a
 * scrollable content region. Every business module added by later prompts renders
 * inside this shell, which is what makes separately built modules feel like one
 * product.
 */
import { LifecyclePanel } from '@features/tenant';
import { PlatformOwnerMfaNotice } from '@features/profile';
import { useTranslation } from 'react-i18next';
import { SkipToContentLink } from '@components/navigation';
import { STORAGE_KEYS } from '@constants';
import { SIDEBAR_BREAKPOINT } from '@tokens';
import { useBreakpoint, useDisclosure, useLocalStorage } from '@hooks';
import { AccountMenu, OrganizationSwitcher } from '@components/controls';
import { NotificationBell } from '@features/notifications';
import {
  AcademyScopeProvider,
  AcademySwitcher,
  useActiveAcademyReconciliation,
} from '@features/academy';
import { AcademyScopeRoute } from '@app/routes/AcademyScopeRoute';
import { ErrorBoundary } from '@app/providers/error/ErrorBoundary';
import { useLocation } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';
import { useSmartBack } from './useSmartBack';
import { ConnectivityBanner } from './ConnectivityBanner';

/** Id of the main landmark, targeted by the skip link. */
const MAIN_CONTENT_ID = 'atlas-dashboard-content';

/**
 * W5 — the academy scope (URL-derived active academy, membership check,
 * revocation handling) wraps the whole shell, so the sidebar, the top-bar
 * switcher and the content all read the same academy in the same render.
 */
export function DashboardLayout(): JSX.Element {
  return (
    <AcademyScopeProvider>
      <DashboardShell />
    </AcademyScopeProvider>
  );
}

function DashboardShell(): JSX.Element {
  const { t } = useTranslation();
  const { isBelow } = useBreakpoint();

  // Remembered across sessions: a user who collapsed the rail expects it to
  // stay collapsed the next time they sign in.
  const { value: isCollapsed, setValue: setIsCollapsed } = useLocalStorage(
    STORAGE_KEYS.sidebarCollapsed,
    false
  );

  const drawer = useDisclosure(false);
  const isMobile = isBelow(SIDEBAR_BREAKPOINT);
  const smartBack = useSmartBack();
  const location = useLocation();
  // A remembered academy this account cannot reach is replaced or cleared
  // before any academy-scoped link is built (authorization audit, 22 Sep 2026).
  useActiveAcademyReconciliation();

  return (
    <div className="flex min-h-dvh bg-surface">
      <SkipToContentLink targetId={MAIN_CONTENT_ID} />

      <DashboardSidebar
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed((previous) => !previous)}
        isMobile={isMobile}
        isDrawerOpen={drawer.isOpen}
        onDrawerOpenChange={drawer.setOpen}
      />

      {/* `min-w-0` lets wide content scroll inside the flex row instead of
          stretching the shell and breaking the layout. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          onOpenNavigation={drawer.open}
          isMobile={isMobile}
          canGoBack={smartBack.canGoBack}
          onGoBack={smartBack.goBack}
          leading={isMobile ? null : <AcademySwitcher />}
          actions={
            <>
              <OrganizationSwitcher />
              <NotificationBell />
              <AccountMenu />
            </>
          }
        />
        {/* Phones: the top bar has no room for the academy switcher at
            390 px, so it gets its own slim bar — the current academy and
            your role stay visible on every screen. */}
        {isMobile ? (
          <div className="border-b border-border bg-background px-2 empty:hidden">
            <AcademySwitcher variant="bar" />
          </div>
        ) : null}
        {/* Local-first dashboard — offline, reconnecting and sync state. */}
        <ConnectivityBanner />

        {/*
          Above the content, not instead of it. An expired tenant must still
          SEE their academies and courses — replacing the dashboard with a
          paywall would say "your data is gone", which is false. This
          explains why the writes are refused; the backend is what actually
          refuses them.
        */}
        <div className="px-4 pt-4 sm:px-6 lg:px-8 empty:hidden">
          {/*
            Phase 11 — `LifecyclePanel` replaced `SubscriptionRequiredBanner`
            here. The banner could only ever say "your subscription has
            ended", because the backend gave a brand-new Organization, a
            finished trial and a lapsed payer the identical `expired`
            status. The panel renders from the authoritative lifecycle and
            so can greet a new customer as a new customer, offer a lapsed
            trialist their own plan back, and stay silent for everyone
            whose subscription is simply working.
          */}
          <LifecyclePanel />
        </div>
        {/* ATO F11 — a Platform Owner without an authenticator app is told
            before platform tools start requiring one. */}
        <div className="px-4 pt-4 sm:px-6 lg:px-8 empty:hidden">
          <PlatformOwnerMfaNotice />
        </div>

        <main
          id={MAIN_CONTENT_ID}
          aria-label={t('layout:dashboard.contentLabel')}
          className="flex-1 bg-background"
        >
          {/* W5 — the content outlet is the academy remount boundary
              (`<Outlet key={academyId} />`) and hosts the switch overlay.
              Stale-tab recovery: its own error boundary, so a section that
              fails keeps the header and navigation on screen ("the rest of
              Atlas is still working" is then true), reset on navigation. */}
          <ErrorBoundary resetKey={location.pathname}>
            <AcademyScopeRoute />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
