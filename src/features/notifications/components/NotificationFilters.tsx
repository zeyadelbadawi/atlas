/**
 * Type and priority filters for the notification centre.
 *
 * Both are SERVER-SIDE filters: the values go out as `type`/`priority`
 * query parameters (`ListNotificationsQueryDto`), never as a client-side
 * pass over one page — filtering twenty rows locally and calling it
 * "Security only" would hide the forty security notifications on the
 * other pages.
 *
 * Radix `Select` cannot represent "no value" with an empty string, so
 * "all" is the sentinel for the unfiltered state; the page maps it back
 * to `undefined` before it reaches the query.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NotificationPriority, NotificationType } from '@types';

export const NOTIFICATION_TYPE_OPTIONS: readonly NotificationType[] = [
  'system',
  'account',
  'billing',
  'security',
  'activity',
  'announcement',
];

export const NOTIFICATION_PRIORITY_OPTIONS: readonly NotificationPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
];

export const ALL_FILTER_VALUE = 'all';

export interface NotificationFiltersProps {
  readonly type?: NotificationType;
  readonly priority?: NotificationPriority;
  readonly onTypeChange: (type: NotificationType | undefined) => void;
  readonly onPriorityChange: (priority: NotificationPriority | undefined) => void;
  readonly onClear: () => void;
  readonly disabled?: boolean;
}

export function NotificationFilters({
  type,
  priority,
  onTypeChange,
  onPriorityChange,
  onClear,
  disabled = false,
}: NotificationFiltersProps): JSX.Element {
  const { t } = useTranslation();
  const typeId = useId();
  const priorityId = useId();
  const isFiltered = type !== undefined || priority !== undefined;

  return (
    <div
      role="group"
      aria-label={t('common:actions.filter')}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor={typeId}>{t('notifications:filters.type')}</Label>
        <Select
          value={type ?? ALL_FILTER_VALUE}
          onValueChange={(value) =>
            onTypeChange(
              value === ALL_FILTER_VALUE ? undefined : (value as NotificationType)
            )
          }
          disabled={disabled}
        >
          <SelectTrigger id={typeId} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>
              {t('notifications:filters.allTypes')}
            </SelectItem>
            {NOTIFICATION_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`notifications:types.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={priorityId}>{t('notifications:filters.priority')}</Label>
        <Select
          value={priority ?? ALL_FILTER_VALUE}
          onValueChange={(value) =>
            onPriorityChange(
              value === ALL_FILTER_VALUE
                ? undefined
                : (value as NotificationPriority)
            )
          }
          disabled={disabled}
        >
          <SelectTrigger id={priorityId} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>
              {t('notifications:filters.allPriorities')}
            </SelectItem>
            {NOTIFICATION_PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`notifications:priority.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFiltered ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={disabled}
        >
          <FilterX className="me-2 size-4" aria-hidden />
          {t('notifications:filters.clear')}
        </Button>
      ) : null}
    </div>
  );
}
