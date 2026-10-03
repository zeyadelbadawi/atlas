/**
 * The Platform Owner contact inbox toolbar: status tabs with whole-inbox
 * counts, search, topic, received-date range, sort and Clear filters.
 *
 * Purely presentational — every value comes from, and every change goes
 * to, the URL-backed state in `usePlatformContactSubmissionFilters`.
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
import type {
  PlatformContactSubmissionStatus,
  PlatformContactSubmissionSummary,
  PlatformContactSubmissionTopic,
} from '../services/PlatformContactSubmissionService';
import {
  PLATFORM_CONTACT_SORT_OPTIONS,
  PLATFORM_CONTACT_TOPICS,
  type PlatformContactFilterState,
  type PlatformContactSortOption,
} from '../hooks/usePlatformContactSubmissionFilters';

const STATUS_TABS = ['all', 'new', 'read', 'archived'] as const;
type StatusTab = (typeof STATUS_TABS)[number];
const ALL_TOPICS = 'all';
const K = 'platform:contactSubmissions';

export interface PlatformContactSubmissionsToolbarProps {
  readonly filters: PlatformContactFilterState;
  readonly hasFilters: boolean;
  readonly summary?: PlatformContactSubmissionSummary;
  readonly onSearchChange: (search: string) => void;
  readonly onStatusChange: (
    status: PlatformContactSubmissionStatus | undefined
  ) => void;
  readonly onTopicChange: (
    topic: PlatformContactSubmissionTopic | undefined
  ) => void;
  readonly onFromChange: (from: string | undefined) => void;
  readonly onToChange: (to: string | undefined) => void;
  readonly onSortChange: (sort: PlatformContactSortOption) => void;
  readonly onClearFilters: () => void;
}

export function PlatformContactSubmissionsToolbar({
  filters,
  hasFilters,
  summary,
  onSearchChange,
  onStatusChange,
  onTopicChange,
  onFromChange,
  onToChange,
  onSortChange,
  onClearFilters,
}: PlatformContactSubmissionsToolbarProps): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const countFor = (tab: StatusTab): number | undefined =>
    summary ? (tab === 'all' ? summary.total : summary[tab]) : undefined;

  return (
    <div
      role="search"
      aria-label={t(`${K}.filters.label`)}
      className="space-y-3"
    >
      <div className="overflow-x-auto">
        <Tabs
          value={filters.status ?? 'all'}
          onValueChange={(value) =>
            onStatusChange(
              value === 'all'
                ? undefined
                : (value as PlatformContactSubmissionStatus)
            )
          }
        >
          <TabsList aria-label={t(`${K}.filters.status`)}>
            {STATUS_TABS.map((tab) => {
              const count = countFor(tab);
              return (
                <TabsTrigger key={tab} value={tab}>
                  {tab === 'all'
                    ? t(`${K}.filters.all`)
                    : t(`${K}.status.${tab}`)}
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
          labelKey={`${K}.searchLabel`}
          className="w-full lg:max-w-sm lg:flex-1"
        />

        <Select
          value={filters.topic ?? ALL_TOPICS}
          onValueChange={(value) =>
            onTopicChange(
              value === ALL_TOPICS
                ? undefined
                : (value as PlatformContactSubmissionTopic)
            )
          }
        >
          <SelectTrigger
            className="w-full sm:w-[200px]"
            aria-label={t(`${K}.filters.topic`)}
          >
            <SelectValue placeholder={t(`${K}.filters.topic`)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TOPICS}>
              {t(`${K}.filters.allTopics`)}
            </SelectItem>
            {PLATFORM_CONTACT_TOPICS.map((topic) => (
              <SelectItem key={topic} value={topic}>
                {t(`${K}.topics.${topic}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <fieldset className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <legend className="sr-only">{t(`${K}.filters.dateRange`)}</legend>
          <div className="space-y-1">
            <Label
              htmlFor="platform-contact-from"
              className="text-xs text-muted-foreground"
            >
              {t(`${K}.filters.from`)}
            </Label>
            <Input
              id="platform-contact-from"
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
              htmlFor="platform-contact-to"
              className="text-xs text-muted-foreground"
            >
              {t(`${K}.filters.to`)}
            </Label>
            <Input
              id="platform-contact-to"
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
            onSortChange(value as PlatformContactSortOption)
          }
        >
          <SelectTrigger
            className="w-full sm:w-[200px]"
            aria-label={t(`${K}.sort.label`)}
          >
            <SelectValue placeholder={t(`${K}.sort.label`)} />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_CONTACT_SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`${K}.sort.${option.replace(':', '_')}`)}
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
            {t(`${K}.filters.clear`)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
