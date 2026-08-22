/**
 * Section loader.
 *
 * Fills a region that is waiting for data without collapsing its height, which
 * prevents the layout shift a bare spinner would cause.
 */
import { useTranslation } from "react-i18next";
import { cn } from "@utils";
import { Spinner } from "./Spinner";

export interface SectionLoaderProps {
  /** Minimum height utility so the region keeps its footprint. */
  readonly minHeightClassName?: string;
  /** Translation key describing what is loading. */
  readonly messageKey?: string;
  readonly className?: string;
}

export function SectionLoader({
  minHeightClassName = "min-h-48",
  messageKey,
  className,
}: SectionLoaderProps): JSX.Element {
  const { t } = useTranslation();
  const message = t(messageKey ?? "common:states.loading");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/50",
        minHeightClassName,
        className,
      )}
    >
      <Spinner label={false} className="text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
