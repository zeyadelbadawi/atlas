/**
 * One badge per catalog publication state, so the same state never reads
 * differently on two rows. The variants encode customer visibility:
 * `published` is live (default), `coming_soon` is announced-not-installable
 * (secondary), `draft` is hidden from the store entirely (outline).
 */
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { AddOnCatalogStatus } from '../types';

const VARIANT: Record<AddOnCatalogStatus, 'default' | 'secondary' | 'outline'> = {
  published: 'default',
  coming_soon: 'secondary',
  draft: 'outline',
};

export function CatalogStatusBadge({
  status,
}: {
  readonly status: AddOnCatalogStatus;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <Badge variant={VARIANT[status] ?? 'outline'}>
      {t(`platformAddOns:status.${status}`)}
    </Badge>
  );
}
