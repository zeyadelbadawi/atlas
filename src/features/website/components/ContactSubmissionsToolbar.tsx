/**
 * The website Messages toolbar: status tabs (with whole-academy counts
 * from the summary), search, received-date range, sort and Clear filters.
 *
 * Purely presentational — every value comes from, and every change goes
 * to, the URL-backed state in `useContactSubmissionFilters`.
 */
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { useLanguage } from '@hooks';
import { formatNumber } from '@utils';
import type { ContactSubmissionStatus, ContactSubmissionSummary } from '@types';
import {
  CONTACT_SUBMISSION_SORT_OPTIONS,
  type ContactSubmissionFilterState,
  type ContactSubmissionSortOption,
} from '../hooks/useContactSubmissionFilters';

const STATUS_TABS = ['all', 'new', 'read', 'archived'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export interface ContactSubmissionsToolbarProps {
  readonly filters: ContactSubmissionFilterState;
  readonly hasFilters: boolean;
  /** Whole-academy counts; absent while loading or if the read failed. */
  readonly summary?: ContactSubmissionSummary;
  readonly onSearchChange: (search: string) => void;
  readonly onStatusChange: (
    status: ContactSubmissionStatus | undefined
  ) => void;
  readonly onFromChange: (from: string | undefined) => void;
  readonly onToChange: (to: string | undefined) => void;
  readonly onSortChange: (sort: ContactSubmissionSortOption) => void;
  readonly onClearFilters: () => void;
}

export function ContactSubmissionsToolbar({
  filters,
  hasFilters,
  summary,
  onSearchChange,
  onStatusChange,
  onFromChange,
  onToChange,
  onSortChange,
  onClearFilters,
}: ContactSubmissionsToolbarProps): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const countFor = (tab: StatusTab): number | undefined =>
    summary ? (tab === 'all' ? summary.total : summary[tab]) : undefined;

  return (
    <div
      role="search"
      aria-label={t('website:messages.filters.label')}
      className="space-y-3"
    >
      <div className="overflow-x-auto">
        <Tabs
          value={filters.status ?? 'all'}
          onValueChange={(value) =>
            onStatusChange(
              value === 'all' ? undefined : (value as ContactSubmissionStatus)
            )
          }
        >
          <TabsList aria-label={t('website:messages.filters.status')}>
            {STATUS_TABS.map((tab) => {
              const count = countFor(tab);
              return (
                <TabsTrigger key={tab} value={tab}>
                  {tab === 'all'
                    ? t('website:messages.filters.all')
                    : t(`website:messages.status.${tab}`)}
                  {count !== undefined ? (
                    <Badge
                      variant="secondary"
                      className="ms-2"
                      data-atlas-numeric="true"
                    >
                      {formatNumber(count, language)}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <SearchInput
          value={filters.search}
          onValueChange={onSearchChange}
          labelKey="website:messages.searchLabel"
          className="w-full lg:max-w-sm lg:flex-1"
        />

        <fieldset className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <legend className="sr-only">
            {t('website:messages.filters.dateRange')}
          </legend>
          <div className="space-y-1">
            <Label
              htmlFor="contact-submissions-from"
              className="text-xs text-muted-foreground"
            >
              {t('website:messages.filters.from')}
            </Label>
            <Input
              id="contact-submissions-from"
              type="date"
              value={filters.from ?? ''}
              max={filters.to}
              onChange={(event) =>
                onFromChange(event.target.value || undefined)
              }
              className="w-full sm:w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="contact-submissions-to"
              className="text-xs text-muted-foreground"
            >
              {t('website:messages.filters.to')}
            </Label>
            <Input
              id="contact-submissions-to"
              type="date"
              value={filters.to ?? ''}
              min={filters.from}
              onChange={(event) => onToChange(event.target.value || undefined)}
              className="w-full sm:w-[160px]"
            />
          </div>
        </fieldset>

        <Select
          value={filters.sort}
          onValueChange={(value) =>
            onSortChange(value as ContactSubmissionSortOption)
          }
        >
          <SelectTrigger
            className="w-full sm:w-[200px]"
            aria-label={t('website:messages.sort.label')}
          >
            <SelectValue placeholder={t('website:messages.sort.label')} />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_SUBMISSION_SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`website:messages.sort.${option.replace(':', '_')}`)}
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
            {t('website:messages.filters.clear')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
