/**
 * "You have reached your device limit" — with the devices in it (§E.4).
 *
 * THE LIST IS THE POINT. A device cap is the one refusal a learner can
 * always fix themselves, and they can only fix it if they can see which
 * devices are using their allowance. A dialog that says "limit reached"
 * and offers a link to a page that says "limit reached" has moved the
 * problem, not solved it — so the devices, their labels and when each was
 * last used are shown here, in the dialog that blocked them.
 *
 * REMOVAL HAPPENS HERE TOO. One click, on the row it belongs to, and the
 * player retries the grant on its own afterwards — because this is the
 * one case where an automatic retry is right: the learner has just done
 * the thing that makes the refusal go away.
 *
 * THE CURRENT DEVICE IS MARKED AND NOT OFFERED FOR REMOVAL from inside
 * the player: removing the browser you are learning on, from the screen
 * that is asking you to free a slot, is a trap. `/my/devices` still
 * allows it, with its own warning, because there it is a deliberate act.
 */
import { useTranslation } from 'react-i18next';
import { Loader2, MonitorSmartphone, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDateFormatter } from '@hooks';
import type { LearnerDeviceResponse } from '@types';

export interface DeviceLimitDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly devices: readonly LearnerDeviceResponse[] | undefined;
  readonly maxDevices: number | undefined;
  readonly isLoading?: boolean;
  readonly onRemove: (deviceId: string) => void;
  readonly removingDeviceId?: string;
  /** A failed removal, stated in the dialog the learner is looking at. */
  readonly errorMessage?: string;
}

export function DeviceLimitDialog({
  open,
  onOpenChange,
  devices,
  maxDevices,
  isLoading,
  onRemove,
  removingDeviceId,
  errorMessage,
}: DeviceLimitDialogProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="size-5" aria-hidden />
            {t('learning:player.deviceLimit.title')}
          </DialogTitle>
          <DialogDescription>
            {maxDevices !== undefined
              ? // `limit`, not `count`: `count` drives i18next's plural
                // selection, and this sentence is not pluralised on it.
                t('learning:player.deviceLimit.description', {
                  limit: maxDevices,
                })
              : t('learning:player.deviceLimit.descriptionNoLimit')}
          </DialogDescription>
        </DialogHeader>
        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (devices ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('learning:player.deviceLimit.noDevices')}
          </p>
        ) : (
          <ul className="space-y-1">
            {(devices ?? []).map((device) => (
              <li
                key={device.id}
                className="flex items-center gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {device.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('learning:learnerDashboard.devices.lastSeen', {
                      when: fmt.dateTime(device.lastSeenAt),
                    })}
                  </p>
                </div>

                {device.current ? (
                  <Badge variant="secondary">
                    {t('learning:learnerDashboard.devices.thisDevice')}
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(device.id)}
                    disabled={removingDeviceId === device.id}
                  >
                    {removingDeviceId === device.id ? (
                      <Loader2
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                    ) : (
                      <Trash2 className="size-4" aria-hidden />
                    )}
                    {t('learning:learnerDashboard.devices.remove')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
