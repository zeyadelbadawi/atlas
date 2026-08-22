/**
 * Page container.
 *
 * Applies the shared page gutters, vertical rhythm and maximum measure so every
 * page across every module lines up on the same grid.
 */
import type { ReactNode } from "react";
import { cn } from "@utils";

export interface PageContainerProps {
  readonly children: ReactNode;
  /**
   * Removes the content width cap. Used by surfaces that must fill the viewport,
   * such as a builder canvas.
   */
  readonly fullWidth?: boolean;
  readonly className?: string;
}

export function PageContainer({
  children,
  fullWidth = false,
  className,
}: PageContainerProps): JSX.Element {
  return (
    <div
      className={cn(
        "w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
        !fullWidth && "mx-auto max-w-content",
        className,
      )}
    >
      <div className="space-y-6 lg:space-y-8">{children}</div>
    </div>
  );
}
