/**
 * One badge for every Zoom connection state, so the same state never
 * reads differently on two pages.
 *
 * The variants encode operational urgency rather than decoration:
 * `revoked` and `reconnect_required` are destructive because a customer
 * cannot run a session until someone acts, `expired`/`error` are warnings,
 * and `not_connected` is merely a fact.
 */
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { ZoomConnectionStatus } from '../types';

const VARIANT: Record<ZoomConnectionStatus, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  connected: 'default',
  revoked: 'destructive',
  reconnect_required: 'destructive',
  expired: 'secondary',
  error: 'secondary',
  not_connected: 'outline',
};

export function ZoomStatusBadge({ status }: { status: ZoomConnectionStatus }): JSX.Element {
  const { t } = useTranslation();
  return (
    <Badge variant={VARIANT[status] ?? 'outline'}>
      {t(`platformZoom:connectionStatus.${status}`)}
    </Badge>
  );
}

/** Session lifecycle, same reasoning. */
export function ZoomSessionBadge({ status }: { status: string }): JSX.Element {
  const { t } = useTranslation();
  const variant =
    status === 'live'
      ? 'default'
      : status === 'failed'
        ? 'destructive'
        : status === 'cancelled'
          ? 'secondary'
          : 'outline';
  return <Badge variant={variant}>{t(`platformZoom:sessionStatus.${status}`)}</Badge>;
}
