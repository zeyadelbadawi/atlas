/**
 * Offline notice.
 *
 * Rendered by the application shell whenever connectivity is lost, so every
 * module degrades gracefully without implementing its own offline handling.
 */
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@utils";

export interface OfflineNoticeProps {
  readonly className?: string;
}

export function OfflineNotice({ className }: OfflineNoticeProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 border-b border-warning/30 bg-warning-surface px-4 py-2.5 text-warning sm:px-6",
        className,
      )}
    >
      <WifiOff
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="space-y-0.5 text-start">
        <p className="text-sm font-medium">
          {t("common:states.offline.title")}
        </p>
        <p className="text-xs opacity-90">
          {t("common:states.offline.description")}
        </p>
      </div>
    </div>
  );
}
