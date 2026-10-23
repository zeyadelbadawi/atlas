/**
 * CMS phase 4 — the header/footer lock (`chromeLocked`).
 *
 * An academy owner or administrator can lock the site's header, menu and
 * footer so they stay as they are while others (managers) keep editing
 * pages, the theme, the brand and search settings. While locked, the API
 * refuses any save that would change the header, the footer or the menu
 * (409 `errors.website.chromeLocked`), so the fields that edit them are
 * shown read-only with this notice above them — the author learns why
 * before typing, not after a refused save.
 *
 * Who can toggle mirrors the API exactly: the academy role `owner` or
 * `administrator` in THIS academy (`useAcademyScope`, the same verified
 * membership the sidebar gates `academyRoles` entries with). Everyone else
 * sees the notice only while the lock is on, and no switch.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Loader2, Lock, LockOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import { useAcademyScope } from '@features/academy';
import type { ApiError } from '@api';
import type { WebsiteConfiguration } from '@types';
import { cn } from '@utils';
import { useUpdateWebsiteConfiguration } from '../hooks';

/** The academy roles the API lets change the lock. */
export const CHROME_LOCK_ROLES: readonly string[] = ['owner', 'administrator'];

export const CHROME_LOCKED_CODE = 'website_chrome_locked';
export const CHROME_LOCK_FORBIDDEN_CODE = 'website_chrome_lock_forbidden';

/** Whether the signed-in user may lock/unlock the header and footer of this academy's site. */
export function useCanToggleChromeLock(academyId: string): boolean {
  const { membership } = useAcademyScope();
  return (
    !!academyId &&
    membership?.academy.id === academyId &&
    CHROME_LOCK_ROLES.includes(membership.role)
  );
}

/** Whether a failed save was refused because the header/footer are locked. */
export function isChromeLockedError(error: ApiError | null): boolean {
  return (
    !!error &&
    (error.code === CHROME_LOCKED_CODE ||
      error.messageKey === 'errors.website.chromeLocked')
  );
}

/**
 * The translated message for a lock refusal (locked, or not allowed to
 * toggle), or `null` for any other error — callers keep their own copy for
 * those.
 */
export function chromeLockErrorMessage(
  error: ApiError | null,
  t: TFunction
): string | null {
  if (!error) return null;
  if (isChromeLockedError(error)) return t('website:chromeLock.lockedError');
  if (
    error.code === CHROME_LOCK_FORBIDDEN_CODE ||
    error.messageKey === 'errors.website.chromeLockForbidden'
  ) {
    return t('website:chromeLock.forbiddenError');
  }
  return null;
}

export interface ChromeLockControlProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
  /** The id the read-only fields point at (`aria-describedby`). */
  readonly id?: string;
  readonly className?: string;
}

/**
 * The lock switch (owners and administrators) or, for everyone else while
 * the lock is on, the notice explaining why the fields below are read-only.
 */
export function ChromeLockControl({
  academyId,
  configuration,
  id,
  className,
}: ChromeLockControlProps): JSX.Element | null {
  const { t } = useTranslation();
  const canToggle = useCanToggleChromeLock(academyId);
  const updateConfig = useUpdateWebsiteConfiguration();
  const { invalidate } = useInvalidate();
  const generatedId = useId();
  const baseId = id ?? `chrome-lock-${generatedId}`;
  const locked = configuration.chromeLocked === true;

  if (!canToggle && !locked) return null;

  const toggle = (next: boolean) =>
    updateConfig.mutate(
      { academyId, payload: { chromeLocked: next } },
      {
        onSuccess: () =>
          toast({
            title: next
              ? t('website:chromeLock.lockedToast')
              : t('website:chromeLock.unlockedToast'),
          }),
        onError: (error) => {
          toast({
            title:
              chromeLockErrorMessage(error, t) ??
              t('website:chromeLock.saveError'),
            variant: 'destructive',
          });
          // Someone else may have changed it: show the saved state.
          void invalidate(websiteKeys.configuration(academyId));
        },
      }
    );

  const Icon = locked ? Lock : LockOpen;
  const description = locked
    ? canToggle
      ? t('website:chromeLock.lockedCanUnlock')
      : t('website:chromeLock.lockedReadOnly')
    : t('website:chromeLock.description');

  return (
    <div
      id={baseId}
      role={canToggle ? undefined : 'note'}
      data-testid="chrome-lock"
      data-locked={locked || undefined}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        locked
          ? 'border-warning/50 bg-warning-surface'
          : 'border-border bg-card',
        className
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-5 shrink-0',
          locked ? 'text-warning' : 'text-muted-foreground'
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1">
        {canToggle ? (
          <label
            htmlFor={`${baseId}-switch`}
            className="block text-sm font-medium text-foreground"
          >
            {t('website:chromeLock.switchLabel')}
          </label>
        ) : (
          <p className="text-sm font-medium text-foreground">
            {t('website:chromeLock.lockedTitle')}
          </p>
        )}
        <p
          id={`${baseId}-description`}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {description}
        </p>
      </div>
      {canToggle ? (
        // A 44px hit area around the switch (touch targets).
        <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2">
          {updateConfig.isPending ? (
            <Loader2
              className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
              aria-hidden
            />
          ) : null}
          <Switch
            id={`${baseId}-switch`}
            checked={locked}
            disabled={updateConfig.isPending}
            onCheckedChange={toggle}
            aria-describedby={`${baseId}-description`}
            data-testid="chrome-lock-switch"
          />
        </div>
      ) : null}
    </div>
  );
}
