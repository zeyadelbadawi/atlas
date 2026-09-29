/**
 * Steps Section (Theme 1 plan §C.1 #6) — "How it works": an ordered,
 * numbered sequence. A real `<ol>`, so the order is announced; the visible
 * number is decorative.
 */
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { StepsSectionConfig } from '@types';

export interface StepsSectionProps {
  readonly config: StepsSectionConfig;
}

export function StepsSection({ config }: StepsSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section className={`${container} ${section}`}>
      {(title || description) && (
        <div className="mb-10 space-y-2 text-center">
          {title ? (
            <h2 className={`${heading} text-3xl text-foreground`}>{title}</h2>
          ) : null}
          {description ? (
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      )}
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-6">
        {config.items.map((item, index) => {
          const itemDescription = resolveLocalizedText(
            item.description,
            locale
          );
          return (
            <li key={item.id} className={cardClass}>
              <span
                aria-hidden
                className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--website-primary-solid)] text-sm font-semibold text-white"
              >
                {(index + 1).toLocaleString(
                  locale === 'ar' ? 'ar-EG' : 'en-US'
                )}
              </span>
              <h3 className="mt-3 break-words font-medium text-foreground">
                {resolveLocalizedText(item.title, locale)}
              </h3>
              {itemDescription ? (
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {itemDescription}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
