/**
 * The Academy Slug field's help text (Academy Settings and Academy Profile).
 *
 * The slug is the academy's Atlas address. Changing it MOVES the website:
 * the old address keeps answering, sends visitors to the new one and stays
 * reserved for this academy (backend: `AcademyAddressService`). It can
 * change once every 60 days; inside that window the field is read-only and
 * says when the next change is possible. Only the organization owner may
 * change it; everyone else is told so.
 */
import { useTranslation } from 'react-i18next';
import { FormDescription } from '@/components/ui/form';
import { formatDate } from '@utils';
import type { LanguageCode } from '@types';

export interface AcademySlugDescriptionProps {
  readonly canChange: boolean;
  /** The field holds a slug different from the saved one. */
  readonly changing: boolean;
  /** When the next change becomes possible (the academy's `nextSlugChangeAt`), while it is locked. */
  readonly nextChangeAt?: string;
}

export function AcademySlugDescription({
  canChange,
  changing,
  nextChangeAt,
}: AcademySlugDescriptionProps): JSX.Element {
  const { t, i18n } = useTranslation();
  if (!canChange) {
    return <FormDescription>{t('academy:settings.slugOwnerOnly')}</FormDescription>;
  }
  return (
    <>
      <FormDescription>{t('academy:settings.slugMoveHelp')}</FormDescription>
      {nextChangeAt ? (
        <p className="text-sm font-medium text-foreground">
          {t('academy:settings.slugChangeLocked', {
            date: formatDate(nextChangeAt, i18n.language as LanguageCode, 'long'),
          })}
        </p>
      ) : changing ? (
        <p role="status" className="text-sm font-medium text-foreground">
          {t('academy:settings.slugMoveNotice')}
        </p>
      ) : null}
    </>
  );
}
