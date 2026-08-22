/**
 * Full page loader.
 *
 * Only for operations that block the entire application, such as restoring a
 * session before the shell can render. It is deliberately the sole full-screen
 * blocking pattern in Atlas.
 */
import { useTranslation } from "react-i18next";
import { Spinner } from "./Spinner";

export interface FullPageLoaderProps {
  /** Translation key describing the operation in progress. */
  readonly messageKey?: string;
}

export function FullPageLoader({
  messageKey,
}: FullPageLoaderProps): JSX.Element {
  const { t } = useTranslation();
  const message = t(messageKey ?? "common:states.loading");

  return (
    <div
      role="alertdialog"
      aria-busy="true"
      aria-label={message}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm"
    >
      <Spinner size="lg" label={false} className="text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
