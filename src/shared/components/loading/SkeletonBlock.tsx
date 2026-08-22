/**
 * Skeleton primitives.
 *
 * Skeletons are the default loading pattern in Atlas because they preserve the
 * shape of the content that is arriving. Each primitive mirrors a real layout,
 * so a loading screen never looks like a different page.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@utils";

export interface SkeletonTextProps {
  /** Number of lines to render. */
  readonly lines?: number;
  readonly className?: string;
}

/** Paragraph placeholder. The final line is shortened, as real text would be. */
export function SkeletonText({
  lines = 3,
  className,
}: SkeletonTextProps): JSX.Element {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export interface SkeletonCardProps {
  readonly className?: string;
}

/** Placeholder matching the Atlas card structure: title, body, footer. */
export function SkeletonCard({ className }: SkeletonCardProps): JSX.Element {
  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6",
        className,
      )}
      aria-hidden
    >
      <div className="space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export interface SkeletonTableProps {
  readonly rows?: number;
  readonly columns?: number;
  readonly className?: string;
}

/** Placeholder matching a data table, including its header row. */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: SkeletonTableProps): JSX.Element {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
      aria-hidden
    >
      <div className="flex gap-4 border-b border-border bg-surface px-4 py-3">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-4 py-4">
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Skeleton key={columnIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface SkeletonListProps {
  readonly items?: number;
  readonly className?: string;
}

/** Placeholder matching a list of records with a leading avatar. */
export function SkeletonList({
  items = 4,
  className,
}: SkeletonListProps): JSX.Element {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: items }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="size-10 rounded-pill" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
