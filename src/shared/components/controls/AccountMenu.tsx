/**
 * Account menu.
 *
 * The dashboard's identity control and its only sign-out control (Phase 0
 * fix — the backend-calling `useSignOut()` hook already existed end to end,
 * but no UI anywhere in the product called it).
 *
 * The trigger greets the signed-in person by name ("Welcome, Sara Ali")
 * rather than showing bare initials, so it reads as "this is you" at a
 * glance. The menu holds the account: who is signed in, the Profile page,
 * the interface appearance, and sign-out. Appearance lives here — not as a
 * separate header icon — and drives the one theme preference
 * (`useTheme`), so there is still a single source of truth that persists
 * exactly as before.
 */
import {
  ChevronDown,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { isFeatureEnabled } from '@config';
import { useAuth, useSignOut, useTheme, useToast } from '@hooks';
import { THEME_PREFERENCES } from '@types';
import type { ThemePreference } from '@types';
import { cn } from '@utils';

/** Icon and label for each appearance. */
const APPEARANCE: Record<
  ThemePreference,
  { readonly icon: LucideIcon; readonly labelKey: string }
> = {
  light: { icon: Sun, labelKey: 'common:theme.light' },
  dark: { icon: Moon, labelKey: 'common:theme.dark' },
  system: { icon: Monitor, labelKey: 'common:theme.system' },
};

function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

/** The name to greet: the profile name, else the email's local part. */
function displayNameOf(user: {
  readonly name?: string | null;
  readonly email: string;
}): string {
  const name = user.name?.trim();
  if (name) return name;
  return user.email.split('@')[0] ?? user.email;
}

export interface AccountMenuProps {
  readonly className?: string;
}

export function AccountMenu({
  className,
}: AccountMenuProps): JSX.Element | null {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { signOut, isLoading } = useSignOut();
  const { preference, setPreference } = useTheme();
  const { toast } = useToast();

  if (!user) return null;

  const fullName = displayNameOf(user);
  const firstName = fullName.split(/\s+/)[0] || fullName;

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    toast({ description: t('auth:signOut.success') });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="account-menu-trigger"
          className={cn(
            'group inline-flex h-11 min-w-0 max-w-[10rem] items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'data-[state=open]:bg-accent data-[state=open]:text-foreground',
            'sm:max-w-[18rem]',
            className
          )}
        >
          {/* Phones show the first name only; the full greeting from `sm`
              up. Either way the accessible name is the greeting plus what
              the button opens. */}
          <span className="min-w-0 truncate">
            <span className="sm:hidden">{firstName}</span>
            <span className="hidden sm:inline">
              {t('common:account.welcome', { name: fullName })}
            </span>
          </span>
          <span className="sr-only"> {t('common:account.menuSuffix')}</span>
          <ChevronDown
            className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64"
        aria-label={t('common:account.menu')}
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span
            className="truncate text-sm font-medium text-foreground"
            data-testid="account-menu-name"
          >
            {fullName}
          </span>
          <span
            className="truncate text-xs font-normal text-muted-foreground"
            dir="ltr"
            data-ltr-content
          >
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-10 gap-2">
          <Link to={DASHBOARD_ROUTES.profile}>
            <UserRound className="size-4" strokeWidth={1.75} aria-hidden />
            {t('common:account.profile')}
          </Link>
        </DropdownMenuItem>

        {isFeatureEnabled('themeSwitcher') ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup aria-labelledby="account-menu-appearance">
              <DropdownMenuLabel
                id="account-menu-appearance"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('common:theme.appearance')}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={preference}
                onValueChange={(value) => {
                  if (isThemePreference(value)) setPreference(value);
                }}
              >
                {THEME_PREFERENCES.map((option) => {
                  const { icon: Icon, labelKey } = APPEARANCE[option];
                  return (
                    <DropdownMenuRadioItem
                      key={option}
                      value={option}
                      // Keep the menu open: the person sees the change
                      // apply and can compare before closing.
                      onSelect={(event) => event.preventDefault()}
                      className="min-h-10 gap-2"
                      data-testid={`appearance-${option}`}
                    >
                      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                      {t(labelKey)}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isLoading}
          onSelect={() => {
            void handleSignOut();
          }}
          className="min-h-10 gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
          {t('common:account.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
