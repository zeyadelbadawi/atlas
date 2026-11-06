/**
 * Page header.
 *
 * Every page in Atlas must state where the user is and what they can do here.
 * Standardising that contract in one component is what makes separately built
 * modules feel like a single product.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@components/navigation';
import type { BreadcrumbItem } from '@types';
import { cn, directionOf, isolateValues } from '@utils';

export interface PageHeaderProps {
  /** Translation key for the page title. */
  readonly titleKey: string;
  /** Literal title, for pages titled by data rather than product copy. */
  readonly title?: string;
  /** Translation key for a one-line explanation of the page's purpose. */
  readonly descriptionKey?: string;
  /** Interpolation values shared by the title and description. */
  readonly values?: Record<string, string | number>;
  /** Trail shown above the title. Required for pages nested 2+ levels deep. */
  readonly breadcrumbs?: readonly BreadcrumbItem[];
  /** Primary and secondary actions for this page. */
  readonly actions?: ReactNode;
  readonly className?: string;
}

export function PageHeader({
  titleKey,
  title,
  descriptionKey,
  values,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps): JSX.Element {
  const { t, i18n } = useTranslation();
  // RTL sweep: interpolated values (names, titles) are bidi-isolated so
  // they cannot reorder the translated sentence (no-op in LTR).
  const shown = isolateValues(values ?? {}, directionOf(i18n));

  return (
    <header className={cn('space-y-3', className)}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}

      {/*
        B2 (V02) — the actions wrap onto their own row when they don't fit
        beside the title, instead of squeezing it to one word per line (or
        pushing the page sideways). The title keeps a readable minimum
        width; with room to spare the layout is the same as before.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1 sm:flex-[1_1_20rem]">
          {/* B8 (UX audit) V32 — a title that is someone's own text (a
              Latin subject on an Arabic page) keeps its own direction, so
              its punctuation doesn't jump to the wrong end. */}
          <h1
            className="font-display text-2xl font-semibold leading-snug tracking-tight text-foreground"
            dir={title !== undefined ? 'auto' : undefined}
          >
            {title ?? t(titleKey, shown)}
          </h1>
          {descriptionKey ? (
            <p className="max-w-prose text-sm text-muted-foreground">
              {t(descriptionKey, shown)}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
