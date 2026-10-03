/**
 * Search, filters and sort for the Platform Owner's payment review lists
 * (subscriptions and course purchases). Purely presentational: the page
 * owns the state, and every value is applied by the server before paging
 * (`toPlatformPaymentQuery`) — nothing is filtered out of a returned page.
 *
 * Stacks vertically on a phone and wraps into one row on wide screens.
 */
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@components/data-display';
import {
  PLATFORM_PAYMENT_METHOD_OPTIONS,
  PLATFORM_PAYMENT_SORT_OPTIONS,
  PLATFORM_PAYMENT_STATUS_OPTIONS,
  PLATFORM_REVIEW_FILTERS,
  hasActivePlatformPaymentFilters,
  DEFAULT_PLATFORM_PAYMENT_LIST_STATE,
  type PlatformPaymentListState,
} from '../utils/platform-payment-list.utils';

export interface PlatformPaymentListToolbarProps {
  /** Prefix for element ids, unique per page. */
  readonly idPrefix: string;
  readonly value: PlatformPaymentListState;
  readonly onChange: (next: PlatformPaymentListState) => void;
  /** Translation key for the search box's label/placeholder. */
  readonly searchLabelKey: string;
}

interface FilterSelectProps {
  readonly id: string;
  readonly labelKey: string;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly onValueChange: (value: string) => void;
  readonly className?: string;
}

function FilterSelect({
  id,
  labelKey,
  value,
  options,
  onValueChange,
  className = 'w-full sm:w-[180px]',
}: FilterSelectProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {t(labelKey)}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className={className}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PlatformPaymentListToolbar({
  idPrefix,
  value,
  onChange,
  searchLabelKey,
}: PlatformPaymentListToolbarProps): JSX.Element {
  const { t } = useTranslation();
  const set = (patch: Partial<PlatformPaymentListState>) =>
    onChange({ ...value, ...patch });
  const all = t('payments:listFilters.all');

  return (
    <div
      role="search"
      aria-label={t('payments:listFilters.label')}
      className="space-y-3"
    >
      <SearchInput
        value={value.search}
        onValueChange={(search) => set({ search })}
        labelKey={searchLabelKey}
        className="w-full lg:max-w-md"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <FilterSelect
          id={`${idPrefix}-review`}
          labelKey="payments:listFilters.reviewStatus"
          value={value.reviewStatus}
          onValueChange={(reviewStatus) =>
            set({
              reviewStatus:
                reviewStatus as PlatformPaymentListState['reviewStatus'],
            })
          }
          options={PLATFORM_REVIEW_FILTERS.map((filter) => ({
            value: filter,
            label:
              filter === 'all'
                ? all
                : t(`payments:payment.reviewStatus.${filter}`),
          }))}
        />
        <FilterSelect
          id={`${idPrefix}-status`}
          labelKey="payments:listFilters.status"
          value={value.status}
          onValueChange={(status) =>
            set({ status: status as PlatformPaymentListState['status'] })
          }
          options={[
            { value: 'all', label: all },
            ...PLATFORM_PAYMENT_STATUS_OPTIONS.map((status) => ({
              value: status,
              label: t(`payments:payment.status.${status}`),
            })),
          ]}
        />
        <FilterSelect
          id={`${idPrefix}-method`}
          labelKey="payments:listFilters.methodType"
          value={value.methodType}
          onValueChange={(methodType) =>
            set({
              methodType: methodType as PlatformPaymentListState['methodType'],
            })
          }
          options={[
            { value: 'all', label: all },
            ...PLATFORM_PAYMENT_METHOD_OPTIONS.map((method) => ({
              value: method,
              label: t(`payments:common.methodType.${method}`),
            })),
          ]}
        />
        <div className="space-y-1">
          <Label
            htmlFor={`${idPrefix}-from`}
            className="text-xs text-muted-foreground"
          >
            {t('payments:listFilters.from')}
          </Label>
          <Input
            id={`${idPrefix}-from`}
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(event) => set({ from: event.target.value })}
            className="w-full sm:w-[160px]"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`${idPrefix}-to`}
            className="text-xs text-muted-foreground"
          >
            {t('payments:listFilters.to')}
          </Label>
          <Input
            id={`${idPrefix}-to`}
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(event) => set({ to: event.target.value })}
            className="w-full sm:w-[160px]"
          />
        </div>
        <FilterSelect
          id={`${idPrefix}-sort`}
          labelKey="payments:listFilters.sort"
          value={value.sort}
          onValueChange={(sort) =>
            set({ sort: sort as PlatformPaymentListState['sort'] })
          }
          options={PLATFORM_PAYMENT_SORT_OPTIONS.map((option) => ({
            value: option,
            label: t(`payments:listFilters.sortOptions.${option}`),
          }))}
          className="w-full sm:w-[200px]"
        />
        {hasActivePlatformPaymentFilters(value) ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(DEFAULT_PLATFORM_PAYMENT_LIST_STATE)}
            className="self-start sm:self-auto"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
            {t('payments:listFilters.clear')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
