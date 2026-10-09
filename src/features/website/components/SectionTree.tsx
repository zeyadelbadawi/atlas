/**
 * Section Tree.
 *
 * The Page Composer's map of a page's composition — add/remove/hide/show/
 * reorder/duplicate/edit, all driven directly by the typed
 * `SectionInstance[]` model. Reordering uses explicit move-up/move-down
 * buttons — the same keyboard-accessible pattern Course Builder's
 * curriculum reordering already established (Prompt 3C) — not
 * drag-and-drop as the only way to reorder.
 *
 * A section holding text over a current content limit is marked "Needs
 * shortening" here, where the Owner scans the page: the whole page is
 * validated on every save, so one such section blocks saving any of it.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Laptop,
  MessageSquarePlus,
  Pencil,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@components/feedback';
import {
  CreateCustomerRequestDialog,
  useCanRequestCustomerServices,
} from '@features/customer-requests';
import { SECTION_METADATA, listSectionMetadata } from '../sections';
import { SECTION_TYPE_ORDER } from '../constants/website.constants';
import { countSampleItems } from '../utils/sample-content.utils';
import type {
  ResponsiveVisibility,
  SectionInstance,
  SectionType,
} from '@types';

export interface SectionTreeProps {
  readonly sections: readonly SectionInstance[];
  readonly selectedId?: string;
  readonly canManage: boolean;
  readonly onSelect: (id: string) => void;
  readonly onToggleEnabled: (id: string) => void;
  readonly onToggleVisibility: (
    id: string,
    breakpoint: keyof ResponsiveVisibility
  ) => void;
  readonly onMove: (index: number, direction: -1 | 1) => void;
  readonly onDuplicate: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onAdd: (type: SectionType) => void;
  /** Sections with text over a content limit (`sectionNeedsShortening`, or refused by the API for it). */
  readonly needsShorteningIds?: ReadonlySet<string>;
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
  needsShorteningIds,
}: SectionTreeProps): JSX.Element {
  const { t } = useTranslation();
  const canRequestSection = useCanRequestCustomerServices();
  const [isRequestOpen, setIsRequestOpen] = useState(false);

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
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <button
                    type="button"
                    className="flex-1 text-start text-sm font-medium text-foreground"
                    onClick={() => onSelect(instance.id)}
                  >
                    {t(metadata.labelKey)}
                  </button>
                  {/* Theme 1 plan §D.4 — preview-only content is flagged
                      where the Owner scans the page, not only inside it. */}
                  {needsShorteningIds?.has(instance.id) ? (
                    <Badge
                      variant="outline"
                      className="whitespace-nowrap border-destructive text-destructive"
                      data-testid={`needs-shortening-${instance.id}`}
                    >
                      {t('website:editor.needsShortening')}
                      <span className="sr-only">
                        {' '}
                        {t('website:editor.needsShorteningHint')}
                      </span>
                    </Badge>
                  ) : null}
                  {countSampleItems(instance) > 0 ? (
                    <Badge variant="outline" className="whitespace-nowrap">
                      {t('website:editor.sampleBadge')}
                      <span className="sr-only">
                        {' '}
                        {t('website:editor.sampleSectionHint')}
                      </span>
                    </Badge>
                  ) : null}
                  <Switch
                    checked={instance.enabled}
                    disabled={!canManage}
                    onCheckedChange={() => onToggleEnabled(instance.id)}
                    aria-label={t('website:editor.toggleEnabled')}
                  />
                </div>

                {canManage ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {(
                      Object.keys(
                        VISIBILITY_ICONS
                      ) as (keyof ResponsiveVisibility)[]
                    ).map((bp) => {
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
          <DropdownMenuContent
            align="start"
            className="w-64"
            // The request dialog takes focus when it opens from this menu;
            // returning focus to the trigger would pull it back out.
            onCloseAutoFocus={(event) => {
              if (isRequestOpen) event.preventDefault();
            }}
          >
            {listSectionMetadata(SECTION_TYPE_ORDER).map((entry) => (
              <DropdownMenuItem
                key={entry.type}
                onClick={() => onAdd(entry.type)}
              >
                <entry.icon className="size-4" aria-hidden />
                {t(entry.labelKey)}
              </DropdownMenuItem>
            ))}
            {/* A section the editor doesn't offer yet: ask the Atlas team
                (owners/administrators only — the API's own rule). */}
            {canRequestSection ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="request-custom-section"
                  onSelect={() => setIsRequestOpen(true)}
                >
                  <MessageSquarePlus className="size-4" aria-hidden />
                  {t('customerRequests:types.custom_section.menuAction')}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {/* Mounted on first use only; outside the menu so closing the menu
          never unmounts the dialog it just opened. */}
      {canRequestSection && isRequestOpen ? (
        <CreateCustomerRequestDialog
          open
          onOpenChange={setIsRequestOpen}
          initialType="custom_section"
        />
      ) : null}
    </div>
  );
}
