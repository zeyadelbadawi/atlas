/**
 * The visual editor's "Add section" library: every section an author can
 * add, grouped by what it is for, each with one line saying what it shows,
 * and a search box. Picking one adds it — with ready content — where the
 * author asked (`insertAt`), and the editor selects it.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { SectionType } from '@types';
import { SECTION_METADATA } from '../sections/section-metadata.registry';
import { SECTION_TYPE_ORDER } from '../constants/website.constants';

/** What each offered section is for, in the order the groups are shown. */
export const SECTION_LIBRARY_GROUPS: readonly {
  readonly key: 'intro' | 'courses' | 'trust' | 'info' | 'action';
  readonly types: readonly SectionType[];
}[] = [
  { key: 'intro', types: ['hero', 'pageHeader', 'about', 'featureSplit'] },
  {
    key: 'courses',
    types: ['featuredCourses', 'courseCatalog', 'courseSpotlight', 'pricing'],
  },
  {
    key: 'trust',
    types: [
      'testimonials',
      'results',
      'statistics',
      'logos',
      'instructors',
      'gallery',
    ],
  },
  { key: 'info', types: ['features', 'steps', 'video', 'schedule', 'faq'] },
  {
    key: 'action',
    types: ['cta', 'whatsappBar', 'countdown', 'contact', 'map'],
  },
];

export interface SectionLibraryProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onPick: (type: SectionType) => void;
}

export function SectionLibrary({
  open,
  onOpenChange,
  onPick,
}: SectionLibraryProps): JSX.Element {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const offered = useMemo(() => new Set(SECTION_TYPE_ORDER), []);
  const needle = query.trim().toLocaleLowerCase();

  const groups = SECTION_LIBRARY_GROUPS.map((group) => ({
    ...group,
    types: group.types.filter((type) => {
      if (!offered.has(type)) return false;
      if (!needle) return true;
      const label = t(SECTION_METADATA[type].labelKey).toLocaleLowerCase();
      const description = t(
        `website:visualEditor.library.descriptions.${type}`
      ).toLocaleLowerCase();
      return label.includes(needle) || description.includes(needle);
    }),
  })).filter((group) => group.types.length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('');
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[90dvh] max-w-3xl flex-col gap-4 p-0 sm:max-h-[85vh]"
        data-testid="section-library"
      >
        <DialogHeader className="space-y-1 px-6 pt-6 text-start">
          <DialogTitle>{t('website:visualEditor.library.title')}</DialogTitle>
          <DialogDescription>
            {t('website:visualEditor.library.subtitle')}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('website:visualEditor.library.search')}
              aria-label={t('website:visualEditor.library.search')}
              className="ps-9"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-6">
          {groups.length === 0 ? (
            <p
              className="py-8 text-center text-sm text-muted-foreground"
              role="status"
            >
              {t('website:visualEditor.library.empty', { query })}
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.key} aria-labelledby={`library-${group.key}`}>
                <h3
                  id={`library-${group.key}`}
                  className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t(`website:visualEditor.library.categories.${group.key}`)}
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {group.types.map((type) => {
                    const { icon: Icon, labelKey } = SECTION_METADATA[type];
                    return (
                      <li key={type}>
                        <button
                          type="button"
                          onClick={() => {
                            setQuery('');
                            onPick(type);
                          }}
                          data-section-type={type}
                          className="group flex min-h-[4.5rem] w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-start transition-colors hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Icon className="size-5" aria-hidden />
                          </span>
                          <span className="min-w-0 space-y-0.5">
                            <span className="block text-sm font-medium text-foreground">
                              {t(labelKey)}
                            </span>
                            <span className="block text-xs leading-relaxed text-muted-foreground">
                              {t(
                                `website:visualEditor.library.descriptions.${type}`
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
