/**
 * The Academy Slug field's help text (Academy Settings and Academy Profile).
 *
 * The slug is the academy's Atlas address. Changing it MOVES the website:
 * the old address keeps answering, sends visitors to the new one and stays
 * reserved for this academy (backend: `AcademyAddressService`). Only the
 * organization owner may change it; everyone else is told so.
 */
import { useTranslation } from 'react-i18next';
import { FormDescription } from '@/components/ui/form';

export interface AcademySlugDescriptionProps {
  readonly canChange: boolean;
  /** The field holds a slug different from the saved one. */
  readonly changing: boolean;
}

export function AcademySlugDescription({
  canChange,
  changing,
}: AcademySlugDescriptionProps): JSX.Element {
  const { t } = useTranslation();
  if (!canChange) {
    return <FormDescription>{t('academy:settings.slugOwnerOnly')}</FormDescription>;
  }
  return (
    <>
      <FormDescription>{t('academy:settings.slugMoveHelp')}</FormDescription>
      {changing ? (
        <p role="status" className="text-sm font-medium text-foreground">
          {t('academy:settings.slugMoveNotice')}
        </p>
      ) : null}
    </>
  );
}
