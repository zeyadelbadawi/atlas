/**
 * CMS phase 3e — "How do you want to start?" in the new-page dialog: a
 * blank page or one of the page templates («صفحات جاهزة»), and a preview
 * of the chosen template as the site will draw it — the real renderer in
 * the editor's device frame (`PreviewViewport`), with the site's header
 * and footer, the active theme and the editor's preview language.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, FilePlus2 } from 'lucide-react';
import { cn } from '@utils';
import type { SectionInstance, WebsitePage } from '@types';
import {
  PreviewViewport,
  initialPreviewBreakpoint,
  type PreviewBreakpoint,
} from '../components/PreviewViewport';
import { WebsiteRenderer } from '../renderer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import {
  PAGE_TEMPLATES,
  pageTemplateLabelKeys,
} from './page-templates.registry';
import type { PresetPreviewSource } from './preset-preview-source';

/** The radio value of "Blank page". */
export const BLANK_PAGE = 'blank';

export interface PageTemplateOptionsProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/** The choices, as a native radio group. */
export function PageTemplateOptions({
  value,
  onChange,
}: PageTemplateOptionsProps): JSX.Element {
  const { t } = useTranslation();
  const options = [
    {
      key: BLANK_PAGE,
      icon: FilePlus2,
      name: t('website:pageTemplates.blankName'),
      description: t('website:pageTemplates.blankDescription'),
      count: undefined as number | undefined,
    },
    ...PAGE_TEMPLATES.map((template) => {
      const keys = pageTemplateLabelKeys(template);
      return {
        key: template.key,
        icon: template.icon,
        name: t(keys.name),
        description: t(keys.description),
        count: template.sections.length,
      };
    }),
  ];
  return (
    <fieldset className="space-y-2" data-testid="page-template-options">
      <legend className="mb-2 text-sm font-medium text-foreground">
        {t('website:pageTemplates.heading')}
      </legend>
      {options.map((option) => {
        const id = `page-template-${option.key}`;
        const checked = value === option.key;
        const Icon = option.icon;
        return (
          <label key={option.key} htmlFor={id} className="block cursor-pointer">
            <input
              id={id}
              type="radio"
              name="page-template"
              value={option.key}
              checked={checked}
              onChange={() => onChange(option.key)}
              className="peer sr-only"
              aria-labelledby={`${id}-name`}
              aria-describedby={`${id}-description`}
              data-template={option.key}
            />
            <span
              className={cn(
                'flex min-h-[3.5rem] items-start gap-3 rounded-lg border-2 bg-card p-3 transition-colors motion-reduce:transition-none',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
                checked
                  ? 'border-primary'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span
                  id={`${id}-name`}
                  className="block text-sm font-medium text-foreground"
                >
                  {option.name}
                </span>
                <span
                  id={`${id}-description`}
                  className="block text-xs leading-relaxed text-muted-foreground"
                >
                  {option.description}
                  {option.count !== undefined ? (
                    <>
                      {' · '}
                      {t('website:pageTemplates.sectionsCount', {
                        count: option.count,
                      })}
                    </>
                  ) : null}
                </span>
              </span>
              {checked ? (
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-hidden
                >
                  <Check className="size-4" />
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export interface PageTemplatePreviewProps {
  readonly source: PresetPreviewSource;
  /** The page title the preview's navigation and intro use. */
  readonly title: string;
  readonly slug: string;
  readonly sections: readonly SectionInstance[];
}

/** The chosen template, drawn as a page of the site. */
export function PageTemplatePreview({
  source,
  title,
  slug,
  sections,
}: PageTemplatePreviewProps): JSX.Element {
  const { t } = useTranslation();
  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>(
    initialPreviewBreakpoint
  );
  // The site's main language first; the other one a click away.
  const [locale, setLocale] = useState<PublicWebsiteLocale>(source.locale);
  const page: WebsitePage = {
    id: 'page-template-preview',
    academyId: source.academyId,
    pageType: 'custom',
    title,
    slug,
    visible: true,
    seo: {},
    sections,
    version: 0,
    createdAt: '',
    updatedAt: '',
  };
  return (
    <section
      aria-label={t('website:pageTemplates.previewHeading')}
      className="space-y-2"
      data-testid="page-template-preview"
    >
      <h3 className="text-sm font-medium text-foreground">
        {t('website:pageTemplates.previewHeading')}
      </h3>
      <PreviewViewport
        breakpoint={breakpoint}
        onBreakpointChange={setBreakpoint}
        dir={PUBLIC_WEBSITE_LOCALE_DIRECTION[locale]}
        lang={locale}
        toolbarEnd={
          <Select
            value={locale}
            onValueChange={(value) => setLocale(value as PublicWebsiteLocale)}
          >
            <SelectTrigger
              className="h-9 w-auto gap-1 border-0 bg-transparent px-2 shadow-none"
              aria-label={t('website:visualEditor.languageLabel')}
              data-testid="page-template-preview-language"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUBLIC_WEBSITE_LOCALES.map((candidate) => (
                <SelectItem key={candidate} value={candidate}>
                  {PUBLIC_WEBSITE_LOCALE_LABELS[candidate]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <WebsiteRenderer
          academyId={source.academyId}
          academyName={source.academyName}
          academyLogo={source.academyLogo}
          configuration={source.configuration}
          pages={source.pages}
          page={page}
          locale={locale}
          onNavigate={() => undefined}
        />
      </PreviewViewport>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('website:pageTemplates.placeholderHint')}
      </p>
    </section>
  );
}
