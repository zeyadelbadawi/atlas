/**
 * Remembered browsers (P66).
 *
 * The browsers this account told "Remember this device" at an email-code
 * step. Sits beside the sessions card on purpose and is deliberately NOT
 * merged into it: a remembered browser is not signed in, so "sign out"
 * would be the wrong verb and a user reading one list would reasonably
 * think a stale laptop still had access. Here the verb is "forget", and
 * the consequence is spelled out — that browser's next sign-in asks for
 * a code again.
 *
 * "Forget other devices" is the fast path after losing a device: one
 * confirmation, every browser but this one, no hunting through rows.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, MonitorSmartphone, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState, ErrorState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { useToast } from '@app/providers';
import { formatDate, formatRelativeTime } from '@/shared/utils/date.utils';
import type { LanguageCode, TrustedDevice } from '@types';
import {
  useRevokeOtherTrustedDevices,
  useRevokeTrustedDevice,
  useTrustedDevices,
} from '../hooks';

type PendingAction =
  | { readonly kind: 'one'; readonly device: TrustedDevice }
  | { readonly kind: 'others' };

export function TrustedDevicesCard(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { notifySuccess, notifyError } = useToast();
  const devices = useTrustedDevices();
  const revokeOne = useRevokeTrustedDevice();
  const revokeOthers = useRevokeOtherTrustedDevices();

  const [pending, setPending] = useState<PendingAction | null>(null);
  const isMutating = revokeOne.isPending || revokeOthers.isPending;

  const handleConfirm = (): void => {
    if (!pending) return;
    const action = pending;
    setPending(null);

    if (action.kind === 'one') {
      revokeOne.mutate(
        { deviceId: action.device.id },
        {
          onSuccess: () =>
            notifySuccess('profile:sections.security.trustedDeviceForgotten'),
          onError: () =>
            notifyError('profile:sections.security.trustedDeviceForgetFailed'),
        }
      );
      return;
    }

    revokeOthers.mutate(undefined, {
      onSuccess: () =>
        notifySuccess('profile:sections.security.otherTrustedDevicesForgotten'),
      onError: () =>
        notifyError('profile:sections.security.trustedDeviceForgetFailed'),
    });
  };

  const renderRow = (device: TrustedDevice): JSX.Element => (
    <li
      key={device.id}
      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <MonitorSmartphone
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">
              {device.label || t('profile:sections.security.unknownDevice')}
            </p>
            <Badge variant="outline">
              {t(`profile:sections.security.surface.${device.surface}`)}
            </Badge>
            {device.current ? (
              <Badge variant="secondary">
                {t('profile:sections.security.thisDevice')}
              </Badge>
            ) : null}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            <span>
              {t('profile:sections.security.lastActive')}:{' '}
              {formatRelativeTime(device.lastUsedAt, language)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {t('profile:sections.security.trustedUntil', {
              date: formatDate(device.expiresAt, language, 'short'),
            })}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0 self-start sm:self-center"
        onClick={() => setPending({ kind: 'one', device })}
        disabled={isMutating}
        aria-label={t('profile:sections.security.forgetDeviceLabel', {
          device: device.label || t('profile:sections.security.unknownDevice'),
        })}
      >
        <ShieldOff className="me-2 size-4" aria-hidden />
        {t('profile:sections.security.forgetDevice')}
      </Button>
    </li>
  );

  const renderBody = (): JSX.Element => {
    if (devices.isLoading) return <SectionLoader />;
    if (devices.isError) {
      return (
        <ErrorState
          kind={devices.error?.kind}
          onRetry={() => void devices.refetch()}
        />
      );
    }

    const items = devices.data ?? [];
    if (items.length === 0) {
      return (
        <EmptyState
          icon={MonitorSmartphone}
          titleKey="profile:sections.security.noTrustedDevices"
          descriptionKey="profile:sections.security.noTrustedDevicesDescription"
        />
      );
    }

    const hasOthers = items.some((device) => !device.current);

    return (
      <div className="space-y-4">
        <ul className="space-y-3" aria-busy={isMutating}>
          {items.map(renderRow)}
        </ul>
        {hasOthers ? (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setPending({ kind: 'others' })}
              disabled={isMutating}
            >
              <ShieldOff className="me-2 size-4" aria-hidden />
              {t('profile:sections.security.forgetOtherDevices')}
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile:sections.security.trustedDevices')}</CardTitle>
        <CardDescription>
          {t('profile:sections.security.trustedDevicesDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === 'others'
                ? t('profile:sections.security.forgetOtherDevicesTitle')
                : t('profile:sections.security.forgetDeviceTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === 'others'
                ? t('profile:sections.security.forgetOtherDevicesDescription')
                : t('profile:sections.security.forgetDeviceDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {pending?.kind === 'others'
                ? t('profile:sections.security.forgetOtherDevices')
                : t('profile:sections.security.forgetDevice')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
