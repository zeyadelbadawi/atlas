/**
 * Every kind of request, as entry points — the friendly answer to "what
 * can I ask for?" on an empty Requests page.
 */
import { cn } from '@utils';
import { CUSTOMER_REQUEST_TYPES } from '../constants/customer-request.constants';
import { RequestServiceCard } from './RequestServiceCard';

export interface RequestCatalogProps {
  readonly headingLevel?: 'h2' | 'h3' | 'h4';
  readonly className?: string;
}

export function RequestCatalog({
  headingLevel = 'h3',
  className,
}: RequestCatalogProps): JSX.Element {
  return (
    <ul
      className={cn('grid gap-3 md:grid-cols-2', className)}
      data-testid="request-catalog"
    >
      {CUSTOMER_REQUEST_TYPES.map((type) => (
        <li key={type} className="min-w-0">
          <RequestServiceCard
            type={type}
            headingLevel={headingLevel}
            skipAccessCheck
            className="h-full justify-between bg-card sm:flex-col sm:items-start"
          />
        </li>
      ))}
    </ul>
  );
}
