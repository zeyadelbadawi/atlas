/**
 * Organization Switcher.
 *
 * The one missing piece between "Atlas has Organization/Tenancy
 * infrastructure" and "a user can actually use it" — `useAuth()` already
 * exposes a fully-wired `switchOrganization(organizationId)` (validates
 * against the user's real memberships, updates session state, dispatches
 * `atlas:organization-switched` for `PlatformProvider`'s cache
 * invalidation, persists to localStorage), but nothing in the UI ever
 * called it. This component is that call site — no new state, no new
 * context, no new cache mechanism; it reuses the existing Platform Core
 * exactly as required.
 *
 * Mirrors `LanguageSwitcher`'s structure (dropdown + tooltip'd trigger).
 */
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@hooks';

export interface OrganizationSwitcherProps {
  readonly className?: string;
}

export function OrganizationSwitcher({
  className,
}: OrganizationSwitcherProps): JSX.Element | null {
  const { t } = useTranslation();
  const { user, organization, switchOrganization } = useAuth();

  // No session yet (still restoring, or unauthenticated) — nothing to show.
  // `DashboardTopbar` only renders inside the authenticated dashboard shell,
  // but this component stays defensive rather than assuming that.
  if (!user) return null;

  // Zero organizations: a real, reachable state today — P2 shipped no
  // organization-creation flow (Phase P14 provisioning), so a freshly
  // registered user has none. Shown as a static, non-interactive
  // indicator rather than hidden entirely, so the absence is legible
  // rather than looking like a bug.
  if (user.organizations.length === 0) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        className="gap-2 text-muted-foreground"
      >
        <Building2 className="size-4" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">
          {t('organization:switcher.noOrganizations')}
        </span>
      </Button>
    );
  }

  const activeLabel = organization?.name ?? t('organization:switcher.selectPrompt');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('organization:switcher.label')}
          className="max-w-48 gap-2 text-foreground"
        >
          <Building2 className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="truncate">{activeLabel}</span>
          <ChevronsUpDown
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-56">
        {user.organizations.map((membership) => (
          <DropdownMenuItem
            key={membership.organizationId}
            onSelect={() => switchOrganization(membership.organizationId)}
            className="flex items-center justify-between gap-3"
          >
            <span className="truncate">{membership.organizationName}</span>
            {membership.organizationId === organization?.id ? (
              <Check className="size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
