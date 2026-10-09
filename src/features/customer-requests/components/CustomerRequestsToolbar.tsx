/**
 * The request lists' toolbar: a status filter (All / Open / each status),
 * search, type, sort — and, in the Platform Owner console, the assignee
 * (including Unassigned) and per-status counts.
 *
 * The status filter is a single-choice toggle group (a radio group to
 * assistive tech), not tabs: it filters one list and has no panels. It
 * scrolls sideways on a phone instead of wrapping or clipping.
 *
 * Purely presentational — every value comes from, and every change goes
 * to, the URL-backed list state.
 */
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@components/data-display';
import { useLanguage } from '@hooks';
import { formatNumber } from '@utils';
import {
  CR_NS,
  CUSTOMER_REQUEST_SORT_OPTIONS,
  CUSTOMER_REQUEST_STATUSES,
  CUSTOMER_REQUEST_TYPES,
} from '../constants/customer-request.constants';
import { ALL_FILTER, UNASSIGNED_FILTER } from '../hooks';
import {
  customerRequestStatusLabelKey,
  customerRequestTypeLabelKey,
} from '../utils/customer-request.utils';
import type {
  CustomerRequestAssigneeOption,
  CustomerRequestCounts,
} from '../types/customer-request.types';

const STATUS_OPTIONS: readonly string[] = [
  ALL_FILTER,
  'open',
  ...CUSTOMER_REQUEST_STATUSES,
];

export interface CustomerRequestsToolbarValue {
  readonly search: string;
  readonly status: string;
  readonly type: string;
  readonly sort: string;
  readonly assignee?: string;
}

export interface CustomerRequestsToolbarProps {
  readonly value: CustomerRequestsToolbarValue;
  readonly hasFilters: boolean;
  readonly onChange: (
    key: keyof CustomerRequestsToolbarValue,
    value: string
  ) => void;
  readonly onClearFilters: () => void;
  readonly searchLabelKey: string;
  /** Platform console: whole-queue counts beside each status. */
  readonly counts?: CustomerRequestCounts;
  /** Platform console: the assignee filter's options. */
  readonly assignees?: readonly CustomerRequestAssigneeOption[];
}

export function CustomerRequestsToolbar({
  value,
  hasFilters,
  onChange,
  onClearFilters,
  searchLabelKey,
  counts,
  assignees,
}: CustomerRequestsToolbarProps): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const showAssignee = value.assignee !== undefined;

  const countFor = (status: string): number | undefined => {
    if (!counts) return undefined;
    if (status === ALL_FILTER) return undefined;
    if (status === 'open') return counts.open;
    return counts.byStatus[status as keyof CustomerRequestCounts['byStatus']];
  };

  const statusLabel = (status: string): string =>
    status === ALL_FILTER
      ? t(`${CR_NS}:list.allStatuses`)
      : status === 'open'
        ? t(`${CR_NS}:list.openStatuses`)
        : t(
            customerRequestStatusLabelKey(
              status as (typeof CUSTOMER_REQUEST_STATUSES)[number]
            )
          );

  return (
    <div
      role="search"
      aria-label={t(`${CR_NS}:list.filtersLabel`)}
      className="space-y-3"
    >
      <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1">
        <ToggleGroup
          type="single"
          value={value.status}
          onValueChange={(next) => {
            // One status (or All) is always selected.
            if (next) onChange('status', next);
          }}
          aria-label={t(`${CR_NS}:list.statusFilter`)}
          className="inline-flex w-max justify-start rounded-md bg-muted p-1 text-muted-foreground"
        >
          {STATUS_OPTIONS.map((status) => {
            const count = countFor(status);
            return (
              <ToggleGroupItem
                key={status}
                value={status}
                className="h-8 whitespace-nowrap rounded-sm px-3 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                {statusLabel(status)}
                {count !== undefined ? (
                  <Badge
                    variant="secondary"
                    className="ms-2"
                    data-atlas-numeric="true"
                  >
                    {formatNumber(count, language)}
                  </Badge>
                ) : null}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput
          value={value.search}
          onValueChange={(next) => onChange('search', next)}
          labelKey={searchLabelKey}
          className="w-full lg:max-w-sm lg:flex-1"
        />

        <Select
          value={value.type}
          onValueChange={(next) => onChange('type', next)}
        >
          <SelectTrigger
            className="w-full sm:w-[200px]"
            aria-label={t(`${CR_NS}:list.typeFilter`)}
          >
            <SelectValue placeholder={t(`${CR_NS}:list.typeFilter`)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>
              {t(`${CR_NS}:list.allTypes`)}
            </SelectItem>
            {CUSTOMER_REQUEST_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(customerRequestTypeLabelKey(type))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showAssignee ? (
          <Select
            value={value.assignee}
            onValueChange={(next) => onChange('assignee', next)}
          >
            <SelectTrigger
              className="w-full sm:w-[200px]"
              aria-label={t(`${CR_NS}:platform.assigneeFilter`)}
            >
              <SelectValue
                placeholder={t(`${CR_NS}:platform.assigneeFilter`)}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>
                {t(`${CR_NS}:platform.allAssignees`)}
              </SelectItem>
              <SelectItem value={UNASSIGNED_FILTER}>
                {t(`${CR_NS}:platform.unassigned`)}
              </SelectItem>
              {(assignees ?? []).map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={value.sort}
          onValueChange={(next) => onChange('sort', next)}
        >
          <SelectTrigger
            className="w-full sm:w-[220px]"
            aria-label={t(`${CR_NS}:list.sortLabel`)}
          >
            <SelectValue placeholder={t(`${CR_NS}:list.sortLabel`)} />
          </SelectTrigger>
          <SelectContent>
            {CUSTOMER_REQUEST_SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`${CR_NS}:list.sort.${option.replace(':', '_')}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onClearFilters}
            className="self-start lg:self-auto"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
            {t(`${CR_NS}:list.clearFilters`)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
