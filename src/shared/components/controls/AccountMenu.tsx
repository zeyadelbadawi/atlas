/**
 * Account menu.
 *
 * The dashboard's only sign-out control (Phase 0 fix — the backend-calling
 * `useSignOut()` hook already existed end to end, but no UI anywhere in the
 * product called it). Mirrors `ThemeSwitcher`'s trigger/dropdown shape for
 * visual consistency in the topbar's `actions` slot.
 */
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useSignOut, useToast } from "@hooks";
import { initialsFromName } from "@utils";

export interface AccountMenuProps {
  readonly className?: string;
}

export function AccountMenu({ className }: AccountMenuProps): JSX.Element | null {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { signOut, isLoading } = useSignOut();
  const { toast } = useToast();

  if (!user) return null;

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    toast({ description: t("auth:signOut.success") });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("common:account.menu")}
          className={className}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs">
              {initialsFromName(user.name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {user.name}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isLoading}
          onSelect={() => {
            void handleSignOut();
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="me-2 size-4" strokeWidth={1.75} aria-hidden />
          {t("common:account.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
