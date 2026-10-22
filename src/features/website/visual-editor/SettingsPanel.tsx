/**
 * The visual editor's settings for the selected section: its name and
 * quick actions, then two tabs.
 *   - Content: which devices it shows on, and its content fields — the
 *     same fields as the page editor's section dialog (`SectionConfigForm`),
 *     in its panel form: every change shows on the canvas as it is typed,
 *     and there is nothing to apply.
 *   - Design (CMS phase 3): its background, spacing, alignment, width and
 *     phone order (`SectionDesignPanel`), as the theme draws them.
 */
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Laptop,
  MousePointerClick,
  Smartphone,
  Tablet,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@utils';
import type {
  ResponsiveVisibility,
  SectionInstance,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';
import { SECTION_METADATA } from '../sections/section-metadata.registry';
import { SectionConfigForm } from '../components/SectionConfigForm';
import type { SectionContentIssue } from '../schemas/section-content-issues';
import { SectionDesignPanel } from './SectionDesignPanel';

const DEVICES: readonly {
  readonly key: keyof ResponsiveVisibility;
  readonly icon: typeof Laptop;
}[] = [
  { key: 'desktop', icon: Laptop },
  { key: 'tablet', icon: Tablet },
  { key: 'mobile', icon: Smartphone },
];

export interface SettingsPanelProps {
  readonly academyId: string;
  readonly section: SectionInstance | undefined;
  readonly index: number;
  readonly total: number;
  readonly pages: readonly WebsitePage[];
  readonly configuration: Pick<
    WebsiteConfiguration,
    'themeKey' | 'brand' | 'defaultLocale'
  >;
  readonly canManage: boolean;
  /** Changes on undo/redo, so the fields re-read the restored content. */
  readonly revision: number;
  readonly serverIssues?: readonly SectionContentIssue[];
  readonly onConfigChange: (config: SectionInstance['config']) => void;
  readonly onDesignChange: (design: SectionInstance['design']) => void;
  readonly onToggleVisibility: (breakpoint: keyof ResponsiveVisibility) => void;
  readonly onToggleEnabled: () => void;
  readonly onMove: (direction: -1 | 1) => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

export function SettingsPanel({
  academyId,
  section,
  index,
  total,
  pages,
  configuration,
  canManage,
  revision,
  serverIssues,
  onConfigChange,
  onDesignChange,
  onToggleVisibility,
  onToggleEnabled,
  onMove,
  onDuplicate,
  onDelete,
  onClose,
}: SettingsPanelProps): JSX.Element {
  const { t } = useTranslation();

  if (!section) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center"
        data-testid="settings-empty"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MousePointerClick className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-medium text-foreground">
          {t('website:visualEditor.settings.emptyTitle')}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t('website:visualEditor.settings.emptyHint')}
        </p>
      </div>
    );
  }

  const { icon: Icon, labelKey } = SECTION_METADATA[section.type];
  const label = t(labelKey);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="settings-panel">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {label}
        </h2>
        {canManage ? (
          <>
            <IconAction
              label={t('website:visualEditor.actions.moveUp')}
              disabled={index <= 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="size-4" aria-hidden />
            </IconAction>
            <IconAction
              label={t('website:visualEditor.actions.moveDown')}
              disabled={index >= total - 1}
              onClick={() => onMove(1)}
            >
              <ArrowDown className="size-4" aria-hidden />
            </IconAction>
            <IconAction
              label={t('website:visualEditor.actions.duplicate')}
              onClick={onDuplicate}
            >
              <Copy className="size-4" aria-hidden />
            </IconAction>
            <IconAction
              label={t('website:visualEditor.actions.delete')}
              onClick={onDelete}
              destructive
            >
              <Trash2 className="size-4" aria-hidden />
            </IconAction>
          </>
        ) : null}
        <IconAction
          label={t('website:visualEditor.settings.close')}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
        </IconAction>
      </div>

      <Tabs defaultValue="content" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 grid h-11 grid-cols-2">
          <TabsTrigger
            value="content"
            className="min-h-9"
            data-testid="settings-tab-content"
          >
            {t('website:visualEditor.settings.contentTab')}
          </TabsTrigger>
          <TabsTrigger
            value="design"
            className="min-h-9"
            data-testid="settings-tab-design"
          >
            {t('website:visualEditor.design.title')}
            {section.design ? (
              <span
                aria-hidden
                className="ms-1.5 size-1.5 rounded-full bg-primary"
              />
            ) : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="design"
          className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4"
        >
          <SectionDesignPanel
            themeKey={configuration.themeKey}
            type={section.type}
            design={section.design}
            onChange={onDesignChange}
            disabled={!canManage}
          />
        </TabsContent>
        <TabsContent
          value="content"
          className="mt-0 min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4"
        >
          <fieldset
            className="space-y-3 rounded-lg border border-border p-3"
            disabled={!canManage}
          >
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('website:visualEditor.settings.display')}
            </legend>
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">
                {section.enabled
                  ? t('website:visualEditor.settings.shown')
                  : t('website:visualEditor.settings.hidden')}
              </span>
              <Switch
                checked={section.enabled}
                onCheckedChange={onToggleEnabled}
                aria-label={
                  section.enabled
                    ? t('website:visualEditor.actions.hide')
                    : t('website:visualEditor.actions.show')
                }
              />
            </label>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('website:visualEditor.settings.showOn')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEVICES.map(({ key, icon: DeviceIcon }) => {
                  const on = section.visibility[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onToggleVisibility(key)}
                      aria-pressed={on}
                      disabled={!canManage || !section.enabled}
                      className={cn(
                        'flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
                        on
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-accent/40'
                      )}
                    >
                      <DeviceIcon className="size-4" aria-hidden />
                      {t(`website:editor.visibility.${key}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          </fieldset>

          <fieldset
            aria-label={t('website:visualEditor.settings.content')}
            disabled={!canManage}
            className="min-w-0"
          >
            <SectionConfigForm
              key={`${section.id}:${revision}`}
              variant="panel"
              type={section.type}
              academyId={academyId}
              initialConfig={section.config}
              pages={pages}
              configuration={configuration}
              isSaving={false}
              onSave={() => undefined}
              onCancel={onClose}
              serverIssues={serverIssues}
              onDraftChange={(config) =>
                onConfigChange(config as SectionInstance['config'])
              }
            />
          </fieldset>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'size-9 shrink-0 text-muted-foreground',
        destructive && 'hover:bg-destructive/10 hover:text-destructive'
      )}
    >
      {children}
    </Button>
  );
}
