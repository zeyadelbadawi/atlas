/**
 * Audit log filters: category, date range, free-text search, and removable
 * chips for the "only this person" / "only this academy" filters a row sets.
 * The state shape and its query translation live in `utils/audit-filters`.
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
import type { AuditCategory } from '@types';
import {
  EMPTY_AUDIT_FILTERS,
  hasActiveAuditFilters,
  type AuditFilterState,
} from '../utils/audit-filters';

const ALL = '__all__';

export interface AuditLogFiltersProps {
  readonly value: AuditFilterState;
  readonly onChange: (next: AuditFilterState) => void;
  readonly categories: readonly AuditCategory[];
  /** Prefix for element ids, so two filter bars on one page never clash. */
  readonly idPrefix?: string;
}

export function AuditLogFilters({
  value,
  onChange,
  categories,
  idPrefix = 'audit-filters',
}: AuditLogFiltersProps): JSX.Element {
  const { t } = useTranslation();
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (value.actor) {
    chips.push({
      key: 'actor',
      label: t('auditLog:filters.actorChip', { name: value.actor.name }),
      clear: () => onChange({ ...value, actor: undefined }),
    });
  }
  if (value.academy) {
    chips.push({
      key: 'academy',
      label: t('auditLog:filters.academyChip', { name: value.academy.name }),
      clear: () => onChange({ ...value, academy: undefined }),
    });
  }

  return (
    <section
      aria-label={t('auditLog:filters.label')}
      className="flex flex-col gap-3"
      data-testid="audit-filters"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-search`}>
            {t('auditLog:filters.search')}
          </Label>
          <Input
            id={`${idPrefix}-search`}
            type="search"
            value={value.search}
            onChange={(event) =>
              onChange({ ...value, search: event.target.value })
            }
            placeholder={t('auditLog:filters.searchPlaceholder')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-category`}>
            {t('auditLog:filters.category')}
          </Label>
          <Select
            value={value.category ?? ALL}
            onValueChange={(next) =>
              onChange({
                ...value,
                category: next === ALL ? undefined : (next as AuditCategory),
              })
            }
          >
            <SelectTrigger id={`${idPrefix}-category`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t('auditLog:filters.allCategories')}
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {t(`auditLog:categories.${category}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-from`}>
            {t('auditLog:filters.from')}
          </Label>
          <Input
            id={`${idPrefix}-from`}
            type="date"
            value={value.from ?? ''}
            max={value.to || undefined}
            onChange={(event) =>
              onChange({ ...value, from: event.target.value || undefined })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-to`}>{t('auditLog:filters.to')}</Label>
          <Input
            id={`${idPrefix}-to`}
            type="date"
            value={value.to ?? ''}
            min={value.from || undefined}
            onChange={(event) =>
              onChange({ ...value, to: event.target.value || undefined })
            }
          />
        </div>
      </div>

      {chips.length > 0 || hasActiveAuditFilters(value) ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-foreground"
            >
              <span dir="auto">{chip.label}</span>
              <button
                type="button"
                onClick={chip.clear}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t('auditLog:filters.removeFilter', {
                  label: chip.label,
                })}
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
          {hasActiveAuditFilters(value) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(EMPTY_AUDIT_FILTERS)}
            >
              {t('auditLog:filters.clear')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
