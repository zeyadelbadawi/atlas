/**
 * Suspense fallback for lazily loaded routes.
 *
 * Mirrors the dashboard content rhythm so a page arriving over the network does
 * not cause a visible layout jump.
 */
import { SkeletonCard, SkeletonText } from "@components/loading";

export function RouteFallback(): JSX.Element {
  return (
    <div
      className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      role="status"
      aria-busy="true"
    >
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <SkeletonText lines={1} className="max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
