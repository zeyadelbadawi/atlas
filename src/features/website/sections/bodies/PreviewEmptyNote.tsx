/**
 * CMS phase 3d — what a preview shows for a section that has nothing to
 * draw yet (no logos, no address, no rows, no results): one line saying
 * what to add. Never rendered on the public site, where the section is
 * simply left out.
 */
import { cn } from '@utils';

export function PreviewEmptyNote({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: string;
}): JSX.Element {
  return (
    <p
      data-preview-note=""
      className={cn(
        'rounded-lg border border-dashed px-6 py-6 text-center text-sm',
        className
      )}
    >
      {children}
    </p>
  );
}
