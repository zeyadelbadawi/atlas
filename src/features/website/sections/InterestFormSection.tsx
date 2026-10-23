/**
 * Interest form (CMS phase 3d, batch C) — the theme-neutral renderer the
 * retired themes use: the heading and the shared form (`bodies/InterestForm`)
 * in the app's own form styles.
 */
import { useId } from 'react';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { InterestFormSectionConfig } from '@types';
import { InterestForm } from './bodies/InterestForm';

const CONTROL =
  'rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function InterestFormSection({
  config,
  academyId,
  sectionId,
  isPublic,
}: {
  readonly config: InterestFormSectionConfig;
  readonly academyId: string;
  readonly sectionId?: string;
  readonly isPublic: boolean;
}): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`${container} ${section}`}
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 space-y-2 text-center">
          {title ? (
            <h2
              id={headingId}
              className={`${heading} text-3xl text-foreground`}
            >
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <InterestForm
          config={config}
          academyId={academyId}
          sectionId={sectionId}
          isPublic={isPublic}
          labelledBy={title ? headingId : undefined}
          classes={{
            form: 'rounded-lg border border-border bg-card p-6 md:p-8',
            label: 'text-sm font-medium text-foreground',
            optional: 'text-muted-foreground',
            control: CONTROL,
            error: 'text-destructive',
            hint: 'text-muted-foreground',
            submit:
              'inline-flex items-center justify-center gap-2 rounded-md bg-[var(--website-primary-solid)] px-6 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            alert: 'text-destructive',
            note: 'text-muted-foreground',
            successIcon: 'text-[var(--website-primary-solid)]',
            successTitle: 'text-xl font-semibold text-foreground',
            successText: 'text-muted-foreground',
          }}
        />
      </div>
    </section>
  );
}
