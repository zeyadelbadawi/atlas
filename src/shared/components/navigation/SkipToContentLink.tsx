/**
 * Skip link.
 *
 * Lets keyboard and screen-reader users bypass the navigation shell. It is
 * visually hidden until focused, at which point it becomes a fully visible
 * control — hiding it permanently would make it unusable for sighted keyboard
 * users, who are among the people who need it most.
 */
import { useTranslation } from "react-i18next";

export interface SkipToContentLinkProps {
  /** Id of the main content landmark. */
  readonly targetId: string;
}

export function SkipToContentLink({
  targetId,
}: SkipToContentLinkProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <a
      href={`#${targetId}`}
      // Hidden until focused, then rendered as a fully visible control so
      // sighted keyboard users can see where the focus went.
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      {t("navigation:skipToContent")}
    </a>
  );
}
