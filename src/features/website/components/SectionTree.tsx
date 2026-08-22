/**
 * Section Tree.
 *
 * The Page Composer's map of a page's composition — add/remove/hide/show/
 * reorder/duplicate/edit, all driven directly by the typed
 * `SectionInstance[]` model. Reordering uses explicit move-up/move-down
 * buttons — the same keyboard-accessible pattern Course Builder's
 * curriculum reordering already established (Prompt 3C) — not
 * drag-and-drop as the only way to reorder.
 */
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Laptop,
  Pencil,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@components/feedback';
import { SECTION_METADATA, listSectionMetadata } from '../sections';
import { SECTION_TYPE_ORDER } from '../constants/website.constants';
import type { ResponsiveVisibility, SectionInstance, SectionType } from '@types';

export interface SectionTreeProps {
  readonly sections: readonly SectionInstance[];
  readonly selectedId?: string;
  readonly canManage: boolean;
  readonly onSelect: (id: string) => void;
  readonly onToggleEnabled: (id: string) => void;
  readonly onToggleVisibility: (id: string, breakpoint: keyof ResponsiveVisibility) => void;
  readonly onMove: (index: number, direction: -1 | 1) => void;
  readonly onDuplicate: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onAdd: (type: SectionType) => void;
}

const VISIBILITY_ICONS: Record<keyof ResponsiveVisibility, typeof Laptop> = {
  desktop: Laptop,
  tablet: Tablet,
  mobile: Smartphone,
};

export function SectionTree({
  sections,
  selectedId,
  canManage,
  onSelect,
  onToggleEnabled,
  onToggleVisibility,
  onMove,
  onDuplicate,
  onDelete,
  onAdd,
}: SectionTreeProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {sections.length === 0 ? (
        <EmptyState titleKey="website:editor.noSections" className="py-8" />
      ) : (
        <ul className="space-y-2">
          {sections.map((instance, index) => {
            const metadata = SECTION_METADATA[instance.type];
            const Icon = metadata.icon;
            const isSelected = instance.id === selectedId;

            return (
              <li
                key={instance.id}
                className={
                  isSelected
                    ? 'rounded-md border-2 border-primary bg-accent/40 p-3'
                    : 'rounded-md border border-border p-3'
                }
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <button
                    type="button"
                    className="flex-1 text-start text-sm font-medium text-foreground"
                    onClick={() => onSelect(instance.id)}
                  >
                    {t(metadata.labelKey)}
                  </button>
                  <Switch
                    checked={instance.enabled}
                    disabled={!canManage}
                    onCheckedChange={() => onToggleEnabled(instance.id)}
                    aria-label={t('website:editor.toggleEnabled')}
                  />
                </div>

                {canManage ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {(Object.keys(VISIBILITY_ICONS) as (keyof ResponsiveVisibility)[]).map((bp) => {
                      const BpIcon = VISIBILITY_ICONS[bp];
                      const isVisible = instance.visibility[bp];
                      return (
                        <Button
                          key={bp}
                          type="button"
                          variant={isVisible ? 'secondary' : 'ghost'}
                          size="icon"
                          className="size-7"
                          onClick={() => onToggleVisibility(instance.id, bp)}
                          aria-label={t(`website:editor.visibility.${bp}`)}
                          aria-pressed={isVisible}
                        >
                          <BpIcon className="size-3.5" aria-hidden />
                        </Button>
                      );
                    })}
                    <span className="mx-1 h-4 w-px bg-border" aria-hidden />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={index === 0}
                      onClick={() => onMove(index, -1)}
                      aria-label={t('website:editor.moveUp')}
                    >
                      <ArrowUp className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={index === sections.length - 1}
                      onClick={() => onMove(index, 1)}
                      aria-label={t('website:editor.moveDown')}
                    >
                      <ArrowDown className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => onSelect(instance.id)}
                      aria-label={t('website:editor.editSection')}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => onDuplicate(instance.id)}
                      aria-label={t('website:editor.duplicateSection')}
                    >
                      <Copy className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => onDelete(instance.id)}
                      aria-label={t('website:editor.deleteSection')}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              {t('website:editor.addSection')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {listSectionMetadata(SECTION_TYPE_ORDER).map((entry) => (
              <DropdownMenuItem key={entry.type} onClick={() => onAdd(entry.type)}>
                <entry.icon className="size-4" aria-hidden />
                {t(entry.labelKey)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
