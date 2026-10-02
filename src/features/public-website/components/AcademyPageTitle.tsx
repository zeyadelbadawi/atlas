/** Sets the browser title while mounted: `title · Academy` (see `useAcademyPageTitle`). */
import { composeDocumentTitle, useAcademyPageTitle } from '../hooks/useAcademyDocumentTitle';

export function AcademyPageTitle({
  title,
  academyName,
}: {
  readonly title: string;
  readonly academyName: string;
}): null {
  useAcademyPageTitle(composeDocumentTitle(title, academyName));
  return null;
}
